from typing import TypedDict

from langgraph.graph import StateGraph, START, END

from rag.kpi_extractor_rag import FinancialMetrics, retrieve_context
from vectorstore.azure_ai_search import Retriever

MAX_RETRIES = 2
RETRY_TOP_K = 20


class KPIExtractionState(TypedDict):
    retriever: Retriever
    company: str
    year: int
    context: str
    metrics: FinancialMetrics | None
    missing_fields: list[str]
    retry_count: int


def retrieve_node(state: KPIExtractionState) -> dict:
    """Populate `context` from the vector store.

    `retry_count` doubles as the attempt number: attempt 0 uses the normal
    top_k, later attempts (looped back from `validate`) widen it so a retry
    actually has a shot at surfacing chunks the first pass missed.
    """
    retry_count = state["retry_count"]
    top_k = RETRY_TOP_K if retry_count > 0 else 10

    context = retrieve_context(
        retriever=state["retriever"],
        company=state["company"],
        year=state["year"],
        top_k=top_k
    )

    return {"context": context, "retry_count": retry_count + 1}


def extract_kpi_node(state: KPIExtractionState) -> dict:
    """Run extraction prompt against `context`, populate `metrics`. Stub - logic not yet ported."""
    raise NotImplementedError


def validate_node(state: KPIExtractionState) -> dict:
    """Check `metrics` for missing required fields, populate `missing_fields`. Stub - logic not yet ported."""
    raise NotImplementedError


def respond_node(state: KPIExtractionState) -> dict:
    """Package final state into the output dict shape `save_metrics()` expects. Stub - logic not yet ported."""
    raise NotImplementedError


def should_retry(state: KPIExtractionState) -> str:
    """Conditional edge: retry retrieval if under budget and fields are still missing."""
    if state["missing_fields"] and state["retry_count"] < MAX_RETRIES:
        return "retry"
    return "done"


builder = StateGraph(KPIExtractionState)

builder.add_node("retrieve", retrieve_node)
builder.add_node("extract_kpi", extract_kpi_node)
builder.add_node("validate", validate_node)
builder.add_node("respond", respond_node)

builder.add_edge(START, "retrieve")
builder.add_edge("retrieve", "extract_kpi")
builder.add_edge("extract_kpi", "validate")
builder.add_conditional_edges(
    "validate",
    should_retry,
    {"retry": "retrieve", "done": "respond"}
)
builder.add_edge("respond", END)

graph = builder.compile()
