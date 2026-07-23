from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import os
from dotenv import load_dotenv

from database.metrics import get_metrics
from database.postgres_sql import create_database
from database.create_table import create_tables
from vectorstore.create_index import create_index
from routes.health import router as health_router
from routes.ingestion import router as ingestion_router
from routes.chat import router as chat_router
from routes.dashboard import router as dashboard_router

load_dotenv()

app = FastAPI(
    title="AI-Powered Investor Intelligence Platform"
)


@app.on_event("startup")
def startup_event():
    """
    Initialize database and vector index on app startup.
    """
    create_database()
    create_tables()

    try:
        create_index(
            endpoint=os.getenv("AZURE_SEARCH_ENDPOINT"),
            api_key=os.getenv("AZURE_SEARCH_API_KEY"),
            index_name=os.getenv("AZURE_SEARCH_INDEX_NAME")
        )
    except Exception as e:
        print(f"Warning: Could not create vector index: {e}")

app.include_router(
    health_router
)

app.include_router(
    dashboard_router,
    prefix="/api",
    tags=["Dashboard"]
)

app.include_router(
    ingestion_router,
    prefix="/api",
    tags=["Ingestion"]
)

app.include_router(
    chat_router,
    prefix="/api",
    tags=["Chat"]
)

app.mount(
    "/static",
    StaticFiles(directory="static"),
    name="static"
)

templates = Jinja2Templates(
    directory="templates"
)


@app.get("/")
def dashboard(request: Request):
    """
    Render dashboard UI.
    """
    metrics = get_metrics()

    return templates.TemplateResponse(
        request=request,
        name="dashboard.html",
        context={
            "metrics": metrics,
            "total_companies": len(metrics),
            "total_reports": len(metrics)
        }
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000
    )
