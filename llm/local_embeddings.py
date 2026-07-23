import os

from langchain_openai import OpenAIEmbeddings


def get_embeddings() -> OpenAIEmbeddings:
    """
    Create an embeddings client for the local Ollama server
    (OpenAI-compatible embeddings API).

    Returns:
        LangChain Embeddings client pointed at Ollama.
    """
    return OpenAIEmbeddings(
        model=os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text"),
        base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
        api_key="ollama",
        check_embedding_ctx_length=False
    )
