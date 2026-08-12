from rag.kpi_extractor_rag import (
    FinancialMetrics,
    build_extraction_prompt,
    retrieve_context,
)
from tests.conftest import FakeRetriever

EXPECTED_KEYS = [
    "Revenue",
    "Net Income",
    "Operating Income",
    "Cash Flow from Operating Activities",
    "Total Assets",
    "Total Liabilities",
    "Top Risk Factors",
    "Top Growth Drivers",
]


def test_financial_metrics_accepts_real_aliases():
    # Real FY2025 Microsoft figures, keyed exactly as the extraction prompt
    # asks the model to return them.
    metrics = FinancialMetrics.model_validate(
        {
            "Revenue": "$281,724M",
            "Net Income": "$101,832M",
            "Total Assets": "$619,003M",
            "Total Liabilities": "$275,524M",
        }
    )

    dumped = metrics.model_dump()

    assert dumped["revenue"] == "$281,724M"
    assert dumped["net_income"] == "$101,832M"
    assert dumped["total_assets"] == "$619,003M"
    assert dumped["total_liabilities"] == "$275,524M"
    # Fields the model didn't return must be present as None, not omitted -
    # respond_node/save_metrics rely on every key always existing.
    assert dumped["operating_income"] is None
    assert dumped["risk_factors"] is None


def test_build_extraction_prompt_contains_exact_keys():
    prompt = build_extraction_prompt(company="Microsoft", year=2025, context="some context")

    assert "Microsoft" in prompt
    assert "2025" in prompt
    assert "some context" in prompt
    for key in EXPECTED_KEYS:
        assert f'"{key}"' in prompt


def test_retrieve_context_dedupes_across_topic_queries(msft_revenue_excerpt, msft_balance_sheet_excerpt):
    # Both topic queries "find" the same income-statement chunk (a realistic
    # overlap - e.g. it mentions both revenue and cash flow) plus one chunk
    # unique to each, all pulled from the real MSFT_2025.md fixture.
    retriever = FakeRetriever(chunks=[msft_revenue_excerpt, msft_balance_sheet_excerpt])

    context = retrieve_context(
        retriever=retriever,
        company="MSFT",
        year=2025,
        top_k=10,
    )

    # 4 topic queries, each "returning" the same 2 chunks -> combined output
    # must contain each unique chunk exactly once, not 4 times.
    assert context.count(msft_revenue_excerpt) == 1
    assert context.count(msft_balance_sheet_excerpt) == 1
    assert len(retriever.calls) == 4
    assert all(call["top_k"] == 10 for call in retriever.calls)
    assert all(call["company"] == "MSFT" and call["year"] == 2025 for call in retriever.calls)
