import uuid

from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery
from types import SimpleNamespace


class AzureAISearchVectorStore:
    """Azure AI Search vector store."""

    def __init__(
        self,
        endpoint: str,
        api_key: str,
        index_name: str
    ) -> None:
        self.client = SearchClient(
            endpoint=endpoint,
            index_name=index_name,
            credential=AzureKeyCredential(api_key)
        )

    def upload_chunks(
        self,
        chunks,
        embeddings,
        company: str,
        year: str,
        source_file: str
    ) -> None:
        """
        Upload chunks to Azure AI Search.
        """
        documents = []

        for chunk in chunks:
            vector = embeddings.embed_query(chunk.page_content)

            documents.append(
                {
                    "id": str(uuid.uuid4()),
                    "company": company,
                    "year": year,
                    "source_file": source_file,
                    "content": chunk.page_content,
                    "content_vector": vector
                }
            )

        result = self.client.upload_documents(documents)

        uploaded = sum(item.succeeded for item in result)

        print(f"Uploaded {uploaded}/{len(documents)} chunks.")

class Retriever:
    """Wrapper around Azure Search client for retrieving relevant chunks.

    Does hybrid search (keyword + vector) when an embeddings client is
    provided - keyword-only search matches on crude word overlap and often
    surfaces unrelated footnotes (e.g. "deferred tax assets and liabilities")
    over the actual concise summary content (e.g. the balance sheet's
    "Total liabilities" line) a query is really looking for.
    """
    def __init__(self, client, embeddings=None):
        self.client = client
        self.embeddings = embeddings

    def invoke(
        self,
        query: str,
        company: str | None = None,
        year: int | None = None,
        top_k: int = 20
    ) -> list:
        """Retrieve relevant chunks from Azure AI Search.
        Returns a list of SimpleNamespace objects with `page_content`.
        """
        filter_expr = None
        if company and year:
            filter_expr = (
                f"company eq '{company}' "
                f"and year eq '{year}'"
            )

        search_kwargs = {"search_text": query, "top": top_k}
        if filter_expr:
            search_kwargs["filter"] = filter_expr
        if self.embeddings is not None:
            query_vector = self.embeddings.embed_query(query)
            search_kwargs["vector_queries"] = [
                VectorizedQuery(vector=query_vector, k_nearest_neighbors=top_k, fields="content_vector")
            ]

        results = self.client.search(**search_kwargs)
        documents = []
        for result in results:
            content = result.get("content", "")
            documents.append(SimpleNamespace(page_content=content))
        return documents
