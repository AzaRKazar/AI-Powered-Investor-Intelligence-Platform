# Investor Intelligence: The Build Story

This is the story of how this project got built — not just what it ended up being, but the actual sequence of decisions, dead ends, real bugs, and tradeoffs that got it there. It's written for someone new to the codebase who wants the *why* behind things, not just the *what*. For the structural reference (diagrams, schemas, API contracts), see [architecture.md](architecture.md) — this document is its narrative companion.

---

## 1. What this actually is

A portfolio project: an AI-powered platform that ingests company annual reports (10-Ks, PDFs), extracts financial KPIs using an LLM, indexes the content for semantic search, and answers natural-language questions about the ingested companies through a RAG chatbot. There's a dashboard for browsing the extracted metrics across companies.

It started as a deliberate recreation of another engineer's (Sandesh Hase's) real repo structure, done with permission — not a from-scratch design, and not a copy of their infrastructure either. Every Azure resource, every credential, every deployment in this project is the current author's own, freshly provisioned. Only the *shape* of the code — the flat, script-style modules, the choice of FastAPI + raw SQL over an ORM, the overall pipeline stages — was intentionally recreated rather than invented, because the goal was to demonstrate the same skills the reference project demonstrates, against a specific job description.

The project was split into two phases from the start:

- **Phase 1**: get the core pipeline working end to end, containerized, and deployed live to Azure. Nothing else until this shipped.
- **Phase 2**: layer real engineering practices on top — orchestration, a proper frontend, CI/CD, tests.

---

## 2. Phase 1: getting something real working

Phase 1 built, in order: the FastAPI entrypoint, PDF ingestion, LLM-based KPI extraction via RAG, Azure AI Search semantic indexing, a RAG chatbot, PostgreSQL storage via raw SQL, a Dockerfile, and finally a real deployment to Azure Container Registry and Azure Kubernetes Service.

### The LLM provider saga

This wasn't a straight line. The project started toward Azure OpenAI, hit a **Free Trial subscription block** that made the real deployment unusable, detoured into running a **local LLM via Ollama** (`llama3.2:3b` for chat, `nomic-embed-text` for embeddings — you can still see the leftover `OLLAMA_*` variables in `.env`, unused dead config from that era) to keep making progress without being blocked on Azure quota approval, and eventually landed back on **real Azure OpenAI** (`gpt-5-mini` for chat/extraction, `text-embedding-ada-002` for embeddings) once the subscription issue cleared. That's the setup that shipped and is still live today.

Two real bugs came out of that period, both worth knowing about because their fixes are still load-bearing in the code:

- **Batch-size rate limiting.** `SemanticChunker` embeds nearly every sentence individually. Against a freshly provisioned Azure OpenAI deployment (low default rate limits), LangChain's default batch size (1000 texts per embedding request) blew straight through the deployment's actual per-minute ceiling. Fixed by capping `chunk_size=16` and raising `max_retries=10` on the `AzureOpenAIEmbeddings` client, so the SDK's own backoff has enough room to ride out `Retry-After` headers instead of just failing. Both settings are still there today, in `ingestion/ingest_documents.py` and `routes/ingestion.py` — remove them and a fresh low-tier deployment will likely start throwing rate-limit errors again.
- **Silent JSON key-mismatch data loss.** Early on, the KPI extraction prompt asked the LLM for keys like `"Revenue"`, but some code paths read them back as `metrics.get("revenue")` — a case mismatch that silently produced `None` instead of erroring. You can still see the scar tissue in `database/save_metrics.py`: every field does `metrics.get("Revenue") or metrics.get("revenue")`, a deliberate defensive dual-lookup rather than trusting one casing.

### First live deployment

Phase 1's finish line (2026-07-29) was concrete, not aspirational: running end-to-end locally, **and** confirmed live on AKS via a real LoadBalancer public IP — health check, dashboard with real Postgres data, and a real Azure OpenAI chat response, all verified from the actual deployed pod. AKS was stopped immediately after capturing that proof, which set the tone for how this project treats cloud cost for the rest of its life: **nothing stays running when nobody's actively using it.**

---

## 3. Phase 2, Tier 1: LangGraph, React, CI, CD

Phase 2 had three "do first" items, tackled roughly in this order: LangGraph orchestration, a React frontend, and CI/CD.

### 3.1 LangGraph: from a function chain to a state machine

The original extraction flow (`kpi_extractor_rag.py`) was a straight line: retrieve context, build a prompt, ask the LLM, done. If the LLM missed a field — which happened constantly on the messier parts of a 10-K — there was no way to try again smarter. It just returned whatever it got, gaps included.

The fix was `rag/kpi_extraction_graph.py`: a LangGraph `StateGraph` with four nodes — `retrieve → extract_kpi → validate → respond` — and a conditional edge back from `validate` to `retrieve` when fields are still missing. A retry isn't a blind repeat: `retrieve_node` widens the search (`top_k` goes from 10 to 20), and `extract_kpi_node` appends the specific missing field names to the prompt, so the model knows exactly what it's being asked to look harder for.

This is also where the project's most instructive bug lives. `retry_count` tracks *attempts already made*, and the original conditional check was `retry_count < MAX_RETRIES`. With `MAX_RETRIES = 2`, that caps the loop at 2 total attempts — the variable name promises 2 *retries* (3 attempts total), but the code delivered 1. A one-character fix (`<=` instead of `<`) closed the gap. It was caught during an offline mocked end-to-end test before ever reaching production, and months later it's now permanently locked in as `tests/test_kpi_extraction_graph.py::test_should_retry_boundary`, parametrized across the exact boundary values — so this specific mistake cannot silently come back.

Verified live before merging: a real Microsoft 10-K, ingested through the actual graph against real Azure OpenAI and Azure AI Search, not just a mocked test.

### 3.2 React frontend: a faithful port, not a redesign

The original dashboard was server-rendered Jinja2 + hand-rolled vanilla JS. The instruction for the rewrite was explicit and important: **port it, don't redesign it.** The existing "vibrant/colorful" visual identity (bold categorical accent colors per KPI card, soft gradient blobs in the background, Plus Jakarta Sans throughout) had already been deliberately chosen earlier in the project, specifically *rejecting* a dark-glassmorphism direction that was tried first. Redesigning it again would have thrown that decision away for no reason.

So: Vite + React 19 + TypeScript, the exact same CSS custom-property design tokens copied verbatim into `frontend/src/styles/tokens.css`, and a component tree that mirrors the original page's visual sections (`Sidebar`, `KpiGrid`/`KpiCard`, `CompanyDeepDive`, `ChatPanel`) rather than any new information architecture. TypeScript over plain JS was a deliberate choice too — it caught real gotchas immediately that plain JS wouldn't have (e.g., `year` coming back from the API as a *string*, not a number; the chat endpoint needing `company`/`year` *omitted* from the JSON payload when unscoped, not sent as `null`).

One real, pre-existing bug got fixed as a side effect of the port: the old JS referenced CSS custom properties (`--accent-blue`, `--accent-red`, etc.) for the KPI cards' comparison-bar fill color — variables that were never actually defined anywhere in the stylesheet. The bars had silently been rendering with no fill color the whole time. The React version fixes this by setting `--kpi-accent` inline per card, sourced from the real `--cat-N` tokens that do exist.

Building this also meant fighting the sandbox environment itself for a while, worth remembering because the fixes are non-obvious:
- No working Linux-native Node existed in the dev sandbox. Installed via `nvm`, then symlinked `node`/`npm`/`npx` into `~/.local/bin` — non-interactive shells don't source `.bashrc`, so `nvm`'s own shell integration doesn't persist across tool calls without this.
- Playwright's Chromium was missing `libnspr4.so` and related shared libraries, with no root access to `apt install` them normally. Fixed by `apt-get download` (works without root, just downloads the `.deb`) + `dpkg -x` to extract it manually into a persistent `~/.local/lib/` location, with `LD_LIBRARY_PATH` set per invocation. This exact fix gets reused later for `mermaid-cli` too (see §5).
- Docker looked completely unreachable at first (`docker` command not found) — turned out the Windows-side `docker` shim earlier in `PATH` was broken, and the real, working binary was sitting at `/usr/bin/docker`, talking to Docker Desktop's daemon via `/var/run/docker.sock` the whole time.

### 3.3 The accidental resource group deletion

Mid-way through the LangGraph work, all three live Azure endpoints started failing DNS resolution simultaneously — the whole `investor-intelligence-rg` resource group had been deleted by accident. Recreated via the Azure Portal (this project's standing rule: Azure resources get created by the human, not by an agent running `az` CLI commands on their behalf — billing implications deserve direct, hands-on control). ACR and AKS were deliberately *not* rebuilt at that point, since neither was needed again until redeploy time — no provisioning ahead of actual need.

### 3.4 CI: a real build/lint/test gate

Before this, there was no automated verification of any kind — just manual testing. `.github/workflows/ci.yml` added three parallel jobs, running on every push/PR to `master`: frontend lint+build, a backend import/compile check, and a full `docker build`. Two real bugs surfaced only once this actually ran on GitHub's infrastructure, not locally:

- The GitHub CLI's cached token lacked the `workflow` OAuth scope specifically required to push changes under `.github/workflows/` — required an interactive `gh auth refresh -h github.com -s workflow` device-code flow to fix, plus clearing a stale cached credential that a leftover global `credential.helper=store` config was serving up instead of the freshly-scoped one.
- `app.py` mounts `StaticFiles(directory="frontend/dist", ...)` at **import time**, not lazily — on a clean GitHub Actions checkout, `frontend/dist/` genuinely doesn't exist yet (nothing had built the frontend in that job), so `import app` crashed immediately. It had passed locally purely by accident, because a leftover local build from earlier testing happened to still be sitting on disk. Fixed by having the backend CI job stub an empty `frontend/dist/index.html` before the import check — the frontend job already covers the real build separately.

### 3.5 The regression test suite

Added specifically to close the project's most visible portfolio gap: **zero automated tests existed** before this. `tests/` (pytest, 22 tests) covers the parts of the system with genuine logic worth protecting — the LangGraph retry/validation state machine (including that off-by-one boundary from §3.1, now a permanent regression test), the retrieval-dedup logic in `retrieve_context()`, `FinancialMetrics`' alias handling, PDF filename parsing, and (added later, see §4) the scanned-PDF detection and OCR error-wrapping logic.

A deliberate constraint: **no live Azure calls in CI.** The LLM, the retriever, and later the OCR client are all mocked — but grounded in *real* data wherever possible rather than synthetic placeholders. The retrieval-dedup test, for instance, pulls real line ranges straight out of `data/markdown/MSFT_2025.md` — Microsoft's actual FY2025 income statement and balance sheet figures, already committed to the repo from earlier ingestion runs — rather than making up fake financial text.

### 3.6 CD: manual, and for a real reason

`.github/workflows/deploy.yml` builds the image, pushes to ACR, applies the k8s manifests, and rolls out the new tag — but only on `workflow_dispatch` (a manual button-press), never automatically on push. This wasn't laziness: AKS bills continuously while running, and this project's whole cost discipline is built around AKS and Postgres being **stopped between work sessions**. An auto-deploy-on-push pipeline would either fail outright against a stopped cluster, or quietly need someone to remember to start the cluster first before every single push — which defeats the entire point of stopping it.

Two things bit this workflow for real the first time it actually ran against fresh Azure resources, neither of which the workflow handles on its own:

1. **AKS had no pull permission on the newly-created ACR.** The "attach container registry" step during AKS creation had been skipped, so pods sat in `ImagePullBackOff` with a 401, even though the image had pushed to ACR successfully. Fixed with `az aks update --attach-acr <name>`.
2. **The `investor-intel-secrets` Kubernetes Secret didn't exist** on the fresh cluster — the workflow assumes it's already there. Created manually, once, via `kubectl create secret generic --from-literal=...` sourced straight from `.env`.

Both are now documented directly in the README's Continuous Deployment section, so they don't have to be rediscovered from scratch next time ACR/AKS get torn down and rebuilt (which, per the cost-discipline rule above, they will be).

Once fixed, the deploy was verified for real: `/health`, `/api/metrics` (serving genuine Postgres data), and the React frontend itself all confirmed live and responding through the AKS LoadBalancer's public IP.

---

## 4. The Apple PDF: a real bug found by actually using the product

This is worth telling in full because it's the clearest example in the whole project of "verify, don't assume" paying off.

**The report:** *"i uploaded appl pdf it read nothing from it, i could see no output."*

**The investigation**, in order:
1. `data/markdown/APPL_2025.md` — the already-converted output sitting in the repo — was suspiciously short (444 lines, versus Microsoft's 4,229 and Tesla's 4,082) and, on inspection, was **entirely** made up of lines reading `**==> picture [W x H] intentionally omitted <==**`. Not one real sentence.
2. Confirmed directly with `pymupdf`, not guessed at: `sum(len(page.get_text()) for page in doc)` across all **79 pages** of the real PDF came back as **exactly 0**. Every single page was a rasterized image with no text layer underneath at all — a fully scanned or print-flattened document.
3. Root cause, plainly: `pymupdf4llm` can only read text that exists as real text objects in a PDF. There was none. Nothing downstream — chunking, embedding, retrieval, extraction — had anything to work with, so every KPI came back `NULL`, correctly, silently, exactly as the code was written to do.

**The fix, `ingestion/pdf_to_markdown.py`:** before attempting the normal `pymupdf4llm` conversion, check total extractable characters across the PDF (`has_extractable_text()`, threshold `MIN_EXTRACTABLE_CHARS = 100` — comfortably above stray-header noise, comfortably below what any real 10-K page contains). Below that threshold, fall back to OCR via **Azure Document Intelligence**'s `prebuilt-read` model instead of quietly returning nothing.

**The cost question, answered with real numbers, not a guess:** Document Intelligence has several pricing tiers — `Layout` and `Custom extraction` run $10–30 per 1,000 pages and are meant for cases where *you don't already have an LLM* doing structured extraction. This project does — GPT-5-mini already handles that downstream — so paying for Document Intelligence's own field/table extraction would be pure redundant spend. Scoped instead to the cheapest tier, **Read** ($1.50 per 1,000 pages after 500 free/month), which just recovers plain text. At Apple's real page count (79), that's roughly **12 cents** fully paid, or free if the monthly allowance covers it.

**A real snag mid-implementation:** the first live test against the actual 26 MB Apple PDF failed with `InvalidContentLength: The input image is too large` — the **Free (F0)** tier has a file-size cap well below that. Not a code bug; a pricing-tier limitation. Fixed by switching the Document Intelligence resource to **Standard S0** in the Portal. Re-tested immediately after: **219,089 real characters recovered**, opening with the actual SEC header text (*"UNITED STATES SECURITIES AND EXCHANGE COMMISSION... FORM 10-K... Apple Inc..."*) — genuinely Apple's real 10-K, not a placeholder.

**Closing the loop, not just patching the symptom:** the failure above surfaced as a raw, unhelpful `azure.core.exceptions.HttpResponseError` traceback. Wrapped it in a `RuntimeError` that names the file, its size, the *actual* inner reason from Azure, and a direct pointer to check the pricing tier if the message mentions size or content limits — locked in with a mocked regression test (`tests/test_pdf_to_markdown.py::test_ocr_wraps_http_errors_with_actionable_message`) so a future failure like this one is diagnosable from the logs alone.

**Then the full pipeline, for real, end to end:** re-ingested the actual Apple PDF through the complete path — OCR → chunking → embedding → Azure AI Search → LangGraph extraction (with the retry loop) → Postgres. 125 seconds total. The result: genuine FY2025 figures (Revenue $416,161M, Net Income $112,010M, Total Assets $359,241M), six real risk factors (tariffs, the EU DMA investigation, the Epic Games litigation — all specific, current, and correct) and five real growth drivers (iPhone 17, Services expansion). Confirmed on the actual live AKS deployment via a direct API call and a Playwright screenshot, not just the local dev environment.

The whole arc — bug report to root cause to cost-scoped fix to a real snag to a verified live re-ingestion — took place inside a single conversation, and every claimed "fixed" step was checked against a real system before moving to the next one.

---

## 5. System design, in brief

The full structural reference — every diagram, schema, and API contract — lives in [architecture.md](architecture.md). The short version:

One FastAPI service serves both a React SPA and a JSON API (`/health`, `/api/metrics`, `/api/upload`, `/api/chat`), backed by four managed Azure services (PostgreSQL, AI Search, OpenAI, Document Intelligence). No microservices, no message queue, no cache layer — ingestion runs **synchronously inside the HTTP request** for `/api/upload`, which is a real, deliberate scope tradeoff: correct engineering would background it with a job queue and a progress-polling endpoint, but that's disproportionate effort for this project's actual scale, and the frontend's progress bar is honest about the tradeoff rather than hiding it (a real 0–45% for the actual upload bytes, then an explicitly cosmetic 75–95% ramp for server-side processing that's already running).

`financial_metrics` in Postgres is **append-only** — every ingestion inserts a new row rather than updating in place, and `/api/metrics` reads through a `ROW_NUMBER() OVER (PARTITION BY company, year ORDER BY created_at DESC)` window function that always resolves to the newest row. This is why re-ingesting Apple's PDF after the OCR fix (§4) didn't require deleting the two prior all-`NULL` rows — the new row simply became the one that mattered.

(One small aside worth remembering while reading the diagrams: producing them wasn't just typing Mermaid syntax and hoping. All 11 diagrams in `architecture.md` were actually rendered with `@mermaid-js/mermaid-cli` — a headless Chromium under the hood — before being committed, hitting the exact same missing-`libnspr4.so` sandbox issue documented in §3.2 and reusing the exact same fix. Two diagrams needed real syntax corrections as a result: parentheses inside a Mermaid sequence-diagram participant alias, and a database schema type notation that didn't render as cleanly as intended on the first pass.)

---

## 6. What this actually costs

Real numbers, not estimates, because at least one of them (Document Intelligence) was worked out from an actual pasted Azure pricing page rather than assumed:

| Resource | Tier | Cost behavior |
|---|---|---|
| Azure Database for PostgreSQL | Burstable B1ms | Bills continuously while running — **stopped between sessions** |
| Azure AI Search | Free (F0) | No cost |
| Azure OpenAI | Pay-per-use | Only costs money per actual API call |
| Azure Container Registry | Basic | Storage + minimal per-use, no need to stop |
| Azure Kubernetes Service | Single node pool, `Standard_D2as_v7` | Bills continuously while running — **stopped between sessions**. Currently running with 2 nodes rather than the original 1-node plan (not yet corrected — roughly double the node cost while up) |
| Azure Document Intelligence | Standard S0, `Read` model only | $1.50 per 1,000 pages beyond 500 free/month — a full Apple 10-K OCR pass costs about **$0.12** |

The whole project runs against a fixed Azure credit, with a Cost Management budget alert on the resource group as a backstop. The operating discipline that made this credit last: **never provision ahead of actual need** (ACR/AKS stayed deliberately un-recreated for a full session after the accidental deletion, until redeploy was actually the task at hand), and **stop what bills continuously the moment you're done with it for the session**, every session, without exception.

---

## 7. Decisions and what they cost

A condensed version of the tradeoffs table in `architecture.md`, framed as *why*, not just *what*:

- **LangGraph over a linear function chain** — because a chain can call functions in sequence, but it can't hold state across a loop ("try again, but wider, and focused on what's missing"). The cost: more moving parts, a real off-by-one bug during development, and a slightly harder mental model than "function A calls function B."
- **Hybrid search over pure vector search** — pure vector alone occasionally missed exact-term matches like "Total liabilities" that a keyword search catches directly; pure keyword alone surfaced irrelevant footnotes over the actual concise figure. The cost: every query does double the retrieval work.
- **Raw SQL over an ORM** — deliberately matches the flat, script-style shape of the reference architecture this project extends. The cost: no schema migrations tooling, no relationship management if the schema ever grows past one table.
- **Append-only metrics rows over UPSERT** — ingestion never has to check "does this row already exist," it just inserts, and the newest-row-wins query handles the rest. The cost: old rows (including failed/`NULL` ones, like Apple's first two attempts) never get cleaned up automatically.
- **OCR scoped to the cheapest tier only** — because paying for Document Intelligence's own structured extraction would duplicate work GPT-5-mini already does. The cost: OCR'd pages lose whatever table/layout structure a pricier tier would have preserved — a plain-text recovery, not a structured one.
- **CD as a manual button, not automatic** — because this project's cost discipline depends on AKS not running by default. The cost: someone has to remember to actually click deploy.

---

## 8. Where it stands, and what's still open

**Fully done and verified live, not just built:** Phase 1 (local + AKS), the LangGraph refactor, the React frontend, CI, the regression suite, CD, and the OCR fallback — every one of these was checked against a real running system before being called finished, not just claimed.

**Explicitly deferred, on purpose:**
- The 2-node AKS node pool (should be 1, small live cost leak).
- A NoSQL split for unstructured data (chat history, raw chunks) — deprioritized after honest evaluation: there's no real unstructured-data pain point in this project today, and adding one would be architecture chosen to look good on a resume rather than to solve an actual problem here.
- A lightweight risk-scoring model on stored KPIs — worth doing, but only a handful of companies are ingested so far; framed honestly as rule-based/anomaly detection rather than a "trained ML model," since a model trained on 3–5 data points isn't real ML and claiming otherwise wouldn't survive a technical interview question.
- Table-aware chunking, to fix the one remaining known extraction gap: Markdown-table-formatted financial figures (confirmed on a real Tesla 10-K) can still fail to embed cleanly, since `SemanticChunker` splits on prose sentence boundaries, not table structure.

**Explicitly out of scope, permanently, by design:** fine-tuning, MLflow/drift monitoring, canary or shadow deployments with adversarial testing — all deliberately deferred to separate, standalone projects rather than bolted onto this one just because they'd sound impressive here.
