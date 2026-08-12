import os
from pathlib import Path

import pymupdf
import pymupdf4llm
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential

# Below this many extractable characters (summed across every page), a PDF is
# treated as scanned/image-only rather than genuinely sparse - real 10-Ks run
# to tens of thousands of characters even on a single page, so this only
# trips for pages that are pure images with no underlying text layer.
MIN_EXTRACTABLE_CHARS = 100


class PDFToMarkdownConverter:
    """Convert PDF documents to Markdown."""

    def convert_pdf(self, pdf_path: str, output_dir: str) -> str:
        """
        Convert a PDF document to Markdown.

        Args:
            pdf_path: Source PDF path.
            output_dir: Output markdown directory.

        Returns:
            Generated markdown file path.
        """
        pdf_file = Path(pdf_path)

        if not pdf_file.exists():
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")

        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        if has_extractable_text(pdf_file):
            markdown_content = pymupdf4llm.to_markdown(str(pdf_file))
        else:
            print(
                f"[pdf_to_markdown] {pdf_file.name} has no extractable text "
                f"(scanned/image-only PDF) - falling back to Azure Document "
                f"Intelligence OCR"
            )
            markdown_content = ocr_via_document_intelligence(pdf_file)

        markdown_file = output_path / f"{pdf_file.stem}.md"

        markdown_file.write_text(
            markdown_content,
            encoding="utf-8"
        )

        return str(markdown_file)

    def convert_directory(self, input_dir: str, output_dir: str) -> list[str]:
        """
        Convert all PDFs from a directory to Markdown.

        Args:
            input_dir: Directory containing PDF files.
            output_dir: Directory to save markdown files.

        Returns:
            List of generated markdown file paths.
        """
        input_path = Path(input_dir)
        markdown_files = []

        for pdf_file in input_path.glob("*.pdf"):
            markdown_file = self.convert_pdf(
                pdf_path=str(pdf_file),
                output_dir=output_dir
            )

            markdown_files.append(markdown_file)

        return markdown_files


def has_extractable_text(pdf_file: Path) -> bool:
    """Check whether a PDF has a real text layer, as opposed to being a
    scanned/rasterized document that pymupdf4llm can't pull any words from.
    """
    doc = pymupdf.open(str(pdf_file))
    total_chars = sum(len(page.get_text()) for page in doc)
    doc.close()

    return total_chars >= MIN_EXTRACTABLE_CHARS


def ocr_via_document_intelligence(pdf_file: Path) -> str:
    """OCR a scanned/image-only PDF via Azure Document Intelligence's
    prebuilt "Read" model, returning markdown-formatted text compatible with
    what pymupdf4llm normally produces.
    """
    endpoint = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT")
    api_key = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_API_KEY")

    if not endpoint or not api_key:
        raise RuntimeError(
            f"{pdf_file.name} has no extractable text and needs OCR, but "
            f"AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT/API_KEY are not set."
        )

    client = DocumentIntelligenceClient(
        endpoint=endpoint,
        credential=AzureKeyCredential(api_key)
    )

    with open(pdf_file, "rb") as f:
        poller = client.begin_analyze_document(
            "prebuilt-read",
            body=f,
            content_type="application/pdf",
            output_content_format="markdown"
        )

    result = poller.result()

    return result.content or ""


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parents[1]

    input_dir = repo_root / "data" / "raw_pdfs"
    output_dir = repo_root / "data" / "markdown"

    converter = PDFToMarkdownConverter()

    markdown_files = converter.convert_directory(
        input_dir=str(input_dir),
        output_dir=str(output_dir)
    )

    print(f"Successfully converted {len(markdown_files)} PDF(s):")

    for markdown_file in markdown_files:
        print(f"  - {markdown_file}")
