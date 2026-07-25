import os

from dotenv import load_dotenv
from pydantic import BaseModel, field_validator, Field

from llm.azure_openai import get_structured_completion
from vectorstore.azure_ai_search import AzureAISearchVectorStore, Retriever

load_dotenv()


class FinancialMetrics(BaseModel):
    revenue: str | int | None = Field(None, alias="Revenue")
    net_income: str | int | None = Field(None, alias="Net Income")
    operating_income: str | int | None = Field(None, alias="Operating Income")
    cash_flow: str | int | None = Field(None, alias="Cash Flow from Operating Activities")
    total_assets: str | int | None = Field(None, alias="Total Assets")
    total_liabilities: str | int | None = Field(None, alias="Total Liabilities")
    risk_factors: str | list | None = Field(None, alias="Top Risk Factors")
    growth_drivers: str | list | None = Field(None, alias="Top Growth Drivers")


def retrieve_context(
    retriever: Retriever,
    company: str,
    year: int
) -> str:
    """
    Retrieve financial context from the vector store using separate
    targeted queries per topic (financials / risks / growth drivers),
    so each topic gets a fair shot at the top results instead of
    competing for ranking within one broad combined query.
    """
    topic_queries = [
        f"Income statement: revenue, net income, operating income, cash flow from operations for {company} fiscal year {year}",
        f"Balance sheet: total assets and total liabilities for {company} fiscal year {year}",
        f"Top risk factors and business risks disclosed by {company} in fiscal year {year}",
        f"Growth drivers and growth strategy for {company} in fiscal year {year}",
    ]

    seen_content = set()
    combined_chunks = []

    for query in topic_queries:
        documents = retriever.invoke(
            query=query,
            company=company,
            year=year,
            top_k=10
        )
        for doc in documents:
            if doc.page_content not in seen_content:
                seen_content.add(doc.page_content)
                combined_chunks.append(doc.page_content)

    return "\n\n".join(combined_chunks)


def build_extraction_prompt(
    company: str,
    year: int,
    context: str
) -> str:
    """
    Build KPI extraction prompt.
    """
    return f"""
You are an expert financial analyst.

Company: {company}
Year: {year}

Context:
{context}

Extract the following information and return it as a JSON object with
EXACTLY these key names (case-sensitive, do not rename or abbreviate them):

- "Revenue"
- "Net Income"
- "Operating Income"
- "Cash Flow from Operating Activities"
- "Total Assets"
- "Total Liabilities"
- "Top Risk Factors"
- "Top Growth Drivers"

Instructions:

- Use only the provided context.
- Return null for a key if the value is unavailable - never omit the key itself.
- Financial values must match the report exactly.
- Companies label these lines differently - match by meaning, not exact wording.
  For example "Operating Income" may appear as "Income from operations" or
  "Operating profit"; "Cash Flow from Operating Activities" may appear as
  "Net cash provided by operating activities".
- Risk factors and growth drivers must each be a flat list of plain strings - one sentence per item, not objects with labels/descriptions.
- Return valid JSON only.
"""


def extract_financial_metrics(
    retriever: Retriever,
    company: str,
    year: int
) -> dict:
    """
    Extract KPIs using RAG.
    """
    context = retrieve_context(
        retriever=retriever,
        company=company,
        year=year
    )

    prompt = build_extraction_prompt(
        company=company,
        year=year,
        context=context
    )

    metrics = get_structured_completion(
        prompt=prompt,
        response_model=FinancialMetrics
    )

    return metrics.model_dump()


def main() -> None:
    company = "Apple"
    year = 2024

    from langchain_openai import AzureOpenAIEmbeddings

    embeddings = AzureOpenAIEmbeddings(
        model=os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT"),
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
        api_key=os.getenv("AZURE_OPENAI_API_KEY"),
        api_version=os.getenv("AZURE_OPENAI_API_VERSION")
    )

    vector_store = AzureAISearchVectorStore(
        endpoint=os.getenv("AZURE_SEARCH_ENDPOINT"),
        api_key=os.getenv("AZURE_SEARCH_API_KEY"),
        index_name=os.getenv("AZURE_SEARCH_INDEX_NAME")
    )

    retriever = Retriever(
        vector_store.client,
        embeddings=embeddings
    )

    results = extract_financial_metrics(
        retriever=retriever,
        company=company,
        year=year
    )

    print(f"\nExtracted KPIs for {company} {year}\n")

    for key, value in results.items():
        print(f"{key}:")
        print(value)
        print("-" * 80)


    from database.save_metrics import save_metrics

    save_metrics(
        company=company,
        year=year,
        metrics=results
    )

if __name__ == "__main__":
    main()
