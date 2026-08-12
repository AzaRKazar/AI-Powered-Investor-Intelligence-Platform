from unittest.mock import patch

import pytest

from rag.kpi_extraction_graph import (
    MAX_RETRIES,
    graph,
    should_retry,
    validate_node,
)
from rag.kpi_extractor_rag import FinancialMetrics
from tests.conftest import FakeRetriever

COMPLETE_METRICS = FinancialMetrics.model_validate(
    {
        "Revenue": "$281,724M",
        "Net Income": "$101,832M",
        "Operating Income": "$128,528M",
        "Cash Flow from Operating Activities": "$130,930M",
        "Total Assets": "$619,003M",
        "Total Liabilities": "$275,524M",
        "Top Risk Factors": ["Regulatory risk"],
        "Top Growth Drivers": ["Cloud growth"],
    }
)

# Same as COMPLETE_METRICS but missing Total Liabilities - the exact kind of
# markdown-table figure the README's Known Limitations section flags as
# sometimes lost during chunking.
INCOMPLETE_METRICS = COMPLETE_METRICS.model_copy(update={"total_liabilities": None})


@pytest.mark.parametrize(
    "retry_count, missing_fields, expected",
    [
        (0, ["Total Liabilities"], "retry"),
        (1, ["Total Liabilities"], "retry"),
        (MAX_RETRIES, ["Total Liabilities"], "retry"),
        (MAX_RETRIES + 1, ["Total Liabilities"], "done"),
        (0, [], "done"),
    ],
)
def test_should_retry_boundary(retry_count, missing_fields, expected):
    # Regression test for a real off-by-one bug: retry_count is the number
    # of attempts already made, so `<= MAX_RETRIES` must allow a retry when
    # retry_count == MAX_RETRIES (that attempt is still within budget), and
    # stop only once retry_count exceeds it.
    state = {"retry_count": retry_count, "missing_fields": missing_fields}

    assert should_retry(state) == expected


def test_validate_node_uses_field_aliases_not_python_names():
    state = {"metrics": INCOMPLETE_METRICS}

    result = validate_node(state)

    assert result["missing_fields"] == ["Total Liabilities"]


def _run_graph(retriever):
    return graph.invoke(
        {
            "retriever": retriever,
            "company": "MSFT",
            "year": 2025,
            "context": "",
            "metrics": None,
            "missing_fields": [],
            "retry_count": 0,
            "result": None,
        }
    )


@patch("rag.kpi_extraction_graph.retrieve_context", return_value="mock context")
@patch("rag.kpi_extraction_graph.get_structured_completion")
def test_graph_does_not_retry_when_extraction_is_complete(mock_completion, mock_retrieve):
    mock_completion.return_value = COMPLETE_METRICS

    final_state = _run_graph(retriever=FakeRetriever(chunks=[]))

    assert mock_completion.call_count == 1
    assert mock_retrieve.call_count == 1
    assert final_state["result"]["total_liabilities"] == "$275,524M"
    assert final_state["missing_fields"] == []


@patch("rag.kpi_extraction_graph.retrieve_context", return_value="mock context")
@patch("rag.kpi_extraction_graph.get_structured_completion")
def test_graph_retries_once_then_succeeds(mock_completion, mock_retrieve):
    mock_completion.side_effect = [INCOMPLETE_METRICS, COMPLETE_METRICS]

    final_state = _run_graph(retriever=FakeRetriever(chunks=[]))

    assert mock_completion.call_count == 2
    assert mock_retrieve.call_count == 2
    # The second (retry) attempt must widen the search, not repeat the
    # same top_k that already missed the field.
    assert mock_retrieve.call_args_list[1].kwargs["top_k"] == 20
    assert final_state["result"]["total_liabilities"] == "$275,524M"
    assert final_state["missing_fields"] == []


@patch("rag.kpi_extraction_graph.retrieve_context", return_value="mock context")
@patch("rag.kpi_extraction_graph.get_structured_completion")
def test_graph_stops_after_max_retries_and_returns_best_effort(mock_completion, mock_retrieve):
    # Every attempt comes back incomplete - the graph must still terminate
    # (not loop forever) and hand back whatever it has, rather than crash.
    mock_completion.return_value = INCOMPLETE_METRICS

    final_state = _run_graph(retriever=FakeRetriever(chunks=[]))

    # MAX_RETRIES=2 -> 1 initial attempt + 2 retries = 3 total attempts.
    assert mock_completion.call_count == MAX_RETRIES + 1
    assert mock_retrieve.call_count == MAX_RETRIES + 1
    assert final_state["result"]["total_liabilities"] is None
    assert final_state["missing_fields"] == ["Total Liabilities"]
