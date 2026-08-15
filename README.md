# AI-Powered Investor Intelligence Platform

[![CI](https://github.com/AzaRKazar/AI-Powered-Investor-Intelligence-Platform/actions/workflows/ci.yml/badge.svg)](https://github.com/AzaRKazar/AI-Powered-Investor-Intelligence-Platform/actions/workflows/ci.yml)

An AI-powered platform for uploading company annual reports (PDFs), extracting financial KPIs with an LLM, indexing content for semantic search, and answering questions via a RAG-based chatbot — with a live dashboard for browsing extracted metrics across companies.


**Status: Phase 1 complete, Phase 2 Tier 1 complete** — running end-to-end locally, containerized, and deployed live to Azure Kubernetes Service via a one-click CD workflow; KPI extraction now runs as a LangGraph state machine with confidence-based retries, the dashboard is now a React + TypeScript SPA, and CI (build/lint/test) runs on every push via GitHub Actions.

New to this repo? **[docs/getting-started.md](docs/getting-started.md)** is a beginner-friendly walkthrough — every cloud service explained (what it is, why it's needed, how to create it), local setup, testing, deployment, real troubleshooting, and links to learn each underlying technology. For the full system design — component diagrams, sequence flows, database/index schemas, API contracts, and the reasoning behind each major decision — see **[docs/architecture.md](docs/architecture.md)**. For the narrative version — the actual build order, real bugs hit and fixed, cost tradeoffs, and the story behind each decision — see **[docs/build-story.md](docs/build-story.md)**.

## How it works

1. **Ingest** — a PDF (10-K/10-Q) is converted to Markdown (`pymupdf4llm`), then split into semantically coherent chunks (LangChain's `SemanticChunker`) using real embeddings.
2. **Index** — each chunk is embedded (Azure OpenAI `text-embedding-ada-002`) and uploaded to Azure AI Search, which supports hybrid (keyword + vector) retrieval.
3. **Extract** — a LangGraph state machine (`retrieve → extract_kpi → validate → respond`) retrieves topic-targeted context (income statement, balance sheet, risk factors, growth drivers as separate queries) and asks Azure OpenAI (`gpt-5-mini`) to return structured KPIs as JSON. If validation finds fields still missing, it loops back with a wider search and a prompt focused on exactly what's missing, up to a retry limit, instead of silently returning an incomplete result.
4. **Store** — extracted KPIs land in Azure Database for PostgreSQL.
5. **Serve** — a FastAPI backend exposes upload/chat/metrics endpoints; a React SPA (built with Vite, served as static files by FastAPI) shows KPI cards, a company deep-dive (risk factors / growth drivers), and a live RAG chat panel.

## Screenshots

**Dashboard — KPI cards across all ingested companies**

![Dashboard KPI cards](images/frontend.png)

**Architecture — From one upload to a verified, live deployment**

![Architecture](images/architecture.png)

**Company deep-dive — AI-extracted risk factors and growth drivers (Microsoft)**

![Company deep-dive with risk factors and growth drivers](images/msft_demo.png)


## Technology Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, Python 3.12 |
| LLM (chat + extraction) | Azure OpenAI — `gpt-5-mini` |
| Embeddings | Azure OpenAI — `text-embedding-ada-002` |
| Semantic search | Azure AI Search (hybrid keyword + vector) |
| Database | Azure Database for PostgreSQL (Flexible Server) |
| PDF → text | `pymupdf4llm` |
| Chunking | LangChain `SemanticChunker` |
| KPI extraction orchestration | LangGraph (state machine + confidence-based retry) |
| Frontend | React + TypeScript (Vite) |
| Containerization | Docker |
| Registry | Azure Container Registry (ACR) |
| Orchestration | Azure Kubernetes Service (AKS) |
| Package management | uv |

## Local Setup

### Prerequisites

* Python 3.12+
* [uv](https://astral.sh/uv) package manager
* Node.js 20+ (for the frontend)
* Docker (for local Postgres via Docker Compose)
* An Azure subscription with Postgres, AI Search, and Azure OpenAI resources provisioned (see [Azure Resources](#azure-resources) below)

### 1. Install backend dependencies

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env` with your own Postgres, Azure AI Search, and Azure OpenAI credentials. See `.env.example` for every required key.

### 4. Start local Postgres (optional — for local dev without touching Azure Postgres)

```bash
docker compose up -d postgres
```

### 5. Run the app

**Frontend development** (hot reload, two processes):
```bash
# Terminal 1 - backend API
python app.py

# Terminal 2 - frontend dev server, proxies /api and /health to :8000
cd frontend && npm run dev
```
Visit **http://localhost:5173**.

**Backend-only / production-like** (one process, matches how Docker runs it):
```bash
cd frontend && npm run build && cd ..
python app.py
```
Visit **http://localhost:8000** — FastAPI serves the built React app directly.

## Running tests

```bash
uv pip install -r requirements-dev.txt
pytest -v
```

The suite covers the LangGraph KPI extraction pipeline (retry/validation logic, retrieval dedup) using real annual-report excerpts already committed under `data/markdown/`, with the LLM and retriever mocked — no live Azure credentials needed. This is the same command CI runs on every push/PR.

## Running with Docker

```bash
docker compose up -d
```

Builds the app image (a multi-stage build that compiles the React frontend, then copies the result into the Python runtime image — no manual `npm` steps needed) and runs it alongside a local Postgres container (see `docker-compose.yml`).

## Deploying to Azure

1. **Build and push to ACR**:
   ```bash
   docker build -t <your-acr-name>.azurecr.io/investor-intelligence-platform:latest .
   az acr login --name <your-acr-name>
   docker push <your-acr-name>.azurecr.io/investor-intelligence-platform:latest
   ```
2. **Create the Kubernetes secret** with your `.env` values (see `k8s/deployment.yaml` — it reads config via `envFrom.secretRef`):
   ```bash
   kubectl create secret generic investor-intel-secrets --from-literal=KEY=value ...
   ```
3. **Deploy**:
   ```bash
   kubectl apply -f k8s/deployment.yaml
   kubectl apply -f k8s/service.yaml
   kubectl get service investor-intel   # grab the external IP
   ```

## Continuous Deployment

`.github/workflows/deploy.yml` builds the image, pushes it to ACR, and rolls it out to AKS — but it's **manual-trigger only** (`workflow_dispatch`), not on every push, since AKS bills continuously while running and this project stops it between sessions rather than keeping it up 24/7.

To run it (from the Actions tab, or `gh workflow run deploy.yml`), the repo needs these GitHub Actions secrets first:

| Secret | Where to get it |
|---|---|
| `LOGIN_SERVER` | ACR resource → Overview → "Login server" (e.g. `<name>.azurecr.io`) |
| `USERNAME` / `PASSWORD` | ACR resource → Access keys (enable "Admin user") |
| `KUBE_CONFIG_B64` | `az aks get-credentials --resource-group investor-intelligence-rg --name <aks-name> --file - \| base64 -w0` |

Set them with `gh secret set <NAME>` or via the repo's Settings → Secrets and variables → Actions.

Two things the workflow does **not** set up for you, needed once per fresh ACR/AKS pair:
- **AKS needs pull access to ACR** — `az aks update --resource-group investor-intelligence-rg --name <aks-name> --attach-acr <acr-name>` (or the "Integrations" tab during AKS creation). Without this, pods sit in `ImagePullBackOff` with a 401 error even though the image pushed successfully.
- **The `investor-intel-secrets` Kubernetes secret** — holds the same values as `.env` (Postgres/Azure Search/Azure OpenAI credentials) so the pod can actually start; see step 2 of [Deploying to Azure](#deploying-to-azure) above.

**Status: verified live end-to-end** (2026-08-12) — `/health`, `/api/metrics` (real Postgres data), and the React frontend all confirmed serving through the LoadBalancer IP after a real `workflow_dispatch` run.

## Azure Resources

All resources live in a single dedicated resource group for easy teardown. Provisioned manually via the Azure Portal:

* **Azure Database for PostgreSQL Flexible Server** — Burstable tier, smallest SKU
* **Azure AI Search** — Free (F0) tier
* **Azure OpenAI** — `gpt-5-mini` (chat) + `text-embedding-ada-002` (embeddings) deployments
* **Azure Container Registry** — Basic tier
* **Azure Kubernetes Service** — single-node cluster, smallest viable x86 VM size available in-region
* **Azure Document Intelligence** *(optional)* — Free (F0) tier; only needed as an OCR fallback for scanned/image-only PDFs (see [Known Limitations](#known-limitations)). The app runs fine without it — that fallback path only triggers when a PDF has no extractable text at all.

**Cost discipline**: a Cost Management budget alert is set on the resource group; Postgres is stopped between work sessions (bills continuously while running, unlike AI Search's free tier and Azure OpenAI's pure pay-per-use pricing).

**AKS gotcha, confirmed the hard way**: `az aks stop` only deallocates node compute — it does *not* stop the Standard Load Balancer or the Standard static Public IP(s) AKS provisions in its auto-created `MC_*` node resource group, and both keep billing hourly regardless of cluster power state. Because of this, AKS gets **deleted** between work sessions instead of just stopped, and recreated when actually needed (see [Deploying to Azure](#deploying-to-azure) and [Continuous Deployment](#continuous-deployment) — both are already written to be repeatable from scratch).

## Known Limitations

* **Table-formatted financial data can be lost during chunking.** `SemanticChunker` splits on prose sentence boundaries; some companies present certain figures (e.g. total liabilities) as Markdown tables rather than sentences, which can fail to embed cleanly. Confirmed on a real Tesla 10-K: most fields (revenue, net income, cash flow, risk factors, growth drivers) extracted correctly, but two table-only figures did not. A proper fix would need table-aware chunking at the ingestion layer.
* **PDF quality varies — fixed via OCR fallback.** A scanned/image-only PDF has no extractable text layer for `pymupdf4llm` to read, which used to mean empty KPIs — found on a real Apple 10-K, confirmed via `pymupdf` as 79 pages with 0 extractable characters. Ingestion now checks total extractable characters before conversion and, if there's effectively none, falls back to OCR via Azure Document Intelligence's `prebuilt-read` model. Verified end-to-end on that same Apple PDF: recovered 219,089 characters of real text, then extracted and saved real KPIs (revenue, net income, risk factors, growth drivers) — no code left in a "should work" state, this actually ran. Needs `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`/`API_KEY` set (see [Azure Resources](#azure-resources)); without them, a scanned PDF still produces empty KPIs, now with a clear error in the logs instead of a silent null result.

## Roadmap (Phase 2)

**Done — Phase 2 Tier 1 complete:** LangGraph state-machine refactor of the RAG + KPI extraction flow (confidence-based retry loop), a React + TypeScript frontend (Vite) replacing the server-rendered dashboard, CI via GitHub Actions (frontend lint/build, backend import check + pytest suite, Docker build — on every push/PR to `master`), a pytest regression suite for the extraction pipeline (see [Running tests](#running-tests)), and a manual-trigger CD workflow to AKS (see [Continuous Deployment](#continuous-deployment) — verified live end-to-end).

**Planned (Tier 2, time permitting):** a NoSQL split for unstructured data and a lightweight risk-scoring model on stored KPIs.

## Notes

* Store secrets in `.env` and never commit it to source control (`.env.example` is the tracked template).
* Verify PostgreSQL firewall rules allow access from wherever the app is actually running before debugging a "connection timeout" as anything more exotic.
