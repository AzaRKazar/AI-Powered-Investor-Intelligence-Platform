from typing import TypedDict

from langgraph.graph import StateGraph, START, END

from rag.kpi_extractor_rag import FinancialMetrics
from vectorstore.azure_ai_search import Retriever

MAX_RETRIES = 2


class KPIExtractionState(TypedDict):
    retriever: Retriever
    company: str
    year: int
    context: str
    metrics: FinancialMetrics | None
    missing_fields: list[str]
    retry_count: int


def retrieve_node(state: KPIExtractionState) -> dict:
    """Populate `context` from the vector store. Stub - logic not yet ported."""
    raise NotImplementedError


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
