from fastapi import FastAPI

from database.postgres_sql import create_database
from database.create_table import create_tables

app = FastAPI(
    title="AI-Powered Investor Intelligence Platform"
)


@app.on_event("startup")
def startup_event():
    """
    Initialize database on app startup.
    """
    create_database()
    create_tables()


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000
    )
