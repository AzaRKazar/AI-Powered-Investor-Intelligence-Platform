from typing import TypedDict

from langgraph.graph import StateGraph, START, END

from llm.azure_openai import get_structured_completion
from rag.kpi_extractor_rag import FinancialMetrics, build_extraction_prompt, retrieve_context
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
    result: dict | None


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


def build_focused_prompt(
    company: str,
    year: int,
    context: str,
    missing_fields: list[str]
) -> str:
    """Extend the base extraction prompt with a hint about fields that were
    missing on a previous attempt, so a retry targets them directly instead
    of re-asking an identical extraction question.
    """
    prompt = build_extraction_prompt(company=company, year=year, context=context)

    if missing_fields:
        fields_list = ", ".join(missing_fields)
        prompt += (
            f"\n\nNote: the following fields were missing from a previous "
            f"extraction attempt against a smaller context - pay special "
            f"attention to finding them in the context above: {fields_list}."
        )

    return prompt


def extract_kpi_node(state: KPIExtractionState) -> dict:
    """Run the extraction prompt against `context`, populate `metrics`.

    When `missing_fields` is populated (i.e. this is a retry), the prompt
    is extended with a hint pointing the model at exactly what to look for.
    """
    prompt = build_focused_prompt(
        company=state["company"],
        year=state["year"],
        context=state["context"],
        missing_fields=state["missing_fields"]
    )

    metrics = get_structured_completion(
        prompt=prompt,
        response_model=FinancialMetrics
    )

    return {"metrics": metrics}


def validate_node(state: KPIExtractionState) -> dict:
    """Check `metrics` for null/empty fields, populate `missing_fields`.

    Uses FinancialMetrics' own field aliases (the same "Revenue", "Net
    Income", ... names the extraction prompt was told to return) so the
    focused-retry hint in extract_kpi_node reads naturally to the model.
    """
    data = state["metrics"].model_dump()

    missing = [
        field.alias or name
        for name, field in FinancialMetrics.model_fields.items()
        if not data.get(name)
    ]

    return {"missing_fields": missing}


def respond_node(state: KPIExtractionState) -> dict:
    """Package final `metrics` into the dict shape `save_metrics()` expects.

    Reachable either with a fully validated FinancialMetrics or, once
    retries are exhausted, a best-effort one - log which fields are still
    missing in the latter case so it's visible rather than silently dropped.
    """
    if state["missing_fields"]:
        print(
            f"[kpi_extraction_graph] Extraction incomplete for "
            f"{state['company']} {state['year']} after {state['retry_count']} "
            f"attempt(s) - still missing: {', '.join(state['missing_fields'])}"
        )

    return {"result": state["metrics"].model_dump()}


def should_retry(state: KPIExtractionState) -> str:
    """Conditional edge: retry retrieval if under budget and fields are still missing.

    `retry_count` is the number of attempts already made (incremented by
    retrieve_node), so `<= MAX_RETRIES` allows MAX_RETRIES retries beyond
    the first attempt - MAX_RETRIES=2 means up to 3 attempts total.
    """
    if state["missing_fields"] and state["retry_count"] <= MAX_RETRIES:
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


def run_kpi_extraction(
    retriever: Retriever,
    company: str,
    year: int
) -> dict:
    """
    Run the KPI extraction graph end-to-end. Drop-in replacement for
    kpi_extractor_rag.extract_financial_metrics() - same signature,
    same return shape.
    """
    final_state = graph.invoke({
        "retriever": retriever,
        "company": company,
        "year": year,
        "context": "",
        "metrics": None,
        "missing_fields": [],
        "retry_count": 0,
        "result": None
    })

    return final_state["result"]
