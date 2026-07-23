from pathlib import Path

from langchain_core.documents import Document
from langchain_experimental.text_splitter import SemanticChunker

from dotenv import load_dotenv
load_dotenv()



def read_markdown(markdown_file: str) -> str:
    """
    Read markdown content.

    Args:
        markdown_file: Markdown file path.

    Returns:
        Markdown content.
    """
    return Path(markdown_file).read_text(encoding="utf-8")


def chunk_markdown(
    markdown_file: str,
    embeddings
) -> list[Document]:
    """
    Generate semantic chunks from markdown.

    Args:
        markdown_file: Markdown file path.
        embeddings: Local (Ollama) embedding model.

    Returns:
        List of semantic chunks.
    """
    markdown_content = read_markdown(markdown_file)

    splitter = SemanticChunker(
        embeddings=embeddings,
        breakpoint_threshold_type="percentile"
    )

    return splitter.create_documents([markdown_content])

if __name__ == "__main__":
    from llm.local_embeddings import get_embeddings

    embeddings = get_embeddings()

    markdown_file = "data/markdown/MSFT_2025.md"

    chunks = chunk_markdown(
        markdown_file=markdown_file,
        embeddings=embeddings
    )

    print(f"Generated {len(chunks)} chunks\n")

    for index, chunk in enumerate(chunks[:3]):
        print("=" * 80)
        print(f"Chunk {index + 1}")
        print("=" * 80)
        print(chunk.page_content[:1000])
        print()
