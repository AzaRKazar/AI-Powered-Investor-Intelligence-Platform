from pathlib import Path

import pymupdf

from ingestion.pdf_to_markdown import MIN_EXTRACTABLE_CHARS, has_extractable_text

# The real scanned/image-only PDF that surfaced this bug (data/raw_pdfs/) is
# gitignored as a large binary and won't exist in a fresh checkout, so these
# build minimal synthetic PDFs in-memory instead - same code path, no
# dependency on files that aren't actually in the repo.


def _make_pdf(tmp_path, name: str, text: str | None) -> Path:
    doc = pymupdf.open()
    page = doc.new_page()
    if text:
        page.insert_text((72, 72), text)
    pdf_path = tmp_path / name
    doc.save(str(pdf_path))
    doc.close()
    return pdf_path


def test_has_extractable_text_true_for_real_text_pdf(tmp_path):
    # Well above MIN_EXTRACTABLE_CHARS, matching how a real 10-K page reads.
    text = "Total revenue: $281,724 million. Net income: $101,832 million. " * 5
    pdf_path = _make_pdf(tmp_path, "text.pdf", text)

    assert has_extractable_text(pdf_path) is True


def test_has_extractable_text_false_for_scanned_pdf(tmp_path):
    # No text inserted at all - the same shape as Apple's scanned 10-K,
    # which produced 0 extractable characters across all 79 real pages.
    pdf_path = _make_pdf(tmp_path, "scanned.pdf", text=None)

    assert has_extractable_text(pdf_path) is False


def test_min_extractable_chars_threshold_is_reasonable():
    # Sanity bound: shouldn't be so low that a stray header/footer on a
    # scanned page counts as "has text", nor so high that a real but
    # sparse page gets misclassified as scanned.
    assert 20 <= MIN_EXTRACTABLE_CHARS <= 1000
