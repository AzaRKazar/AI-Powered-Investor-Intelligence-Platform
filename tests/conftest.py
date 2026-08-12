from pathlib import Path
from types import SimpleNamespace

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
MARKDOWN_DIR = REPO_ROOT / "data" / "markdown"


def load_markdown_excerpt(filename: str, start_line: int, end_line: int) -> str:
    """Return a real line range from an already-ingested annual report.

    `start_line`/`end_line` are 1-indexed and inclusive, matching what a
    text editor or `grep -n` would show, so a range can be copied straight
    from inspecting the file.
    """
    lines = (MARKDOWN_DIR / filename).read_text().splitlines()
    return "\n".join(lines[start_line - 1:end_line])


class FakeRetriever:
    """Stand-in for `vectorstore.azure_ai_search.Retriever`.

    Returns canned `page_content` chunks instead of hitting Azure AI
    Search, while still exercising every caller's real control flow
    (call counts, top_k, filters).
    """

    def __init__(self, chunks: list[str]):
        self.chunks = chunks
        self.calls: list[dict] = []

    def invoke(self, query, company=None, year=None, top_k=20):
        self.calls.append(
            {"query": query, "company": company, "year": year, "top_k": top_k}
        )
        return [SimpleNamespace(page_content=chunk) for chunk in self.chunks]


@pytest.fixture
def msft_revenue_excerpt() -> str:
    """Real FY2025 income-statement figures from Microsoft's 10-K.

    Total revenue $281,724M, net income $101,832M - pulled verbatim from
    data/markdown/MSFT_2025.md (already committed, produced by a real
    pdymupdf4llm conversion earlier this project).
    """
    return load_markdown_excerpt("MSFT_2025.md", 1900, 1920)


@pytest.fixture
def msft_balance_sheet_excerpt() -> str:
    """Real FY2025 balance-sheet figures: total assets $619,003M, total
    liabilities $275,524M - the exact kind of Markdown-table content the
    README's Known Limitations section flags as sometimes lost during
    chunking.
    """
    return load_markdown_excerpt("MSFT_2025.md", 1988, 2018)
