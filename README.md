# AI-Powered Investor Intelligence Platform

An AI-powered platform for uploading company annual reports (PDFs), extracting KPIs with an LLM, indexing content for semantic search, and answering questions via a RAG-based chatbot. Built as a portfolio project recreating the architecture of [Sandesh Hase's original implementation](https://github.com/Sandesh-hase/AI-Powered-Investor-Intelligence-Platform), with permission, then deployed independently to Azure.

Status: early development. This README will grow as each subsystem (ingestion, KPI extraction, semantic search, RAG chat, dashboard) comes online.

## Prerequisites

* Python 3.12+
* UV Package Manager
* Docker (for local Postgres and containerized runs)

## Setup

### 1. Install UV

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Verify installation:

```bash
uv --version
```

### 2. Create Virtual Environment

```bash
uv venv
```

### 3. Activate Virtual Environment

```bash
source .venv/bin/activate
```

### 4. Install Dependencies

```bash
uv pip install -r requirements.txt
```

### 5. Configure Environment Variables

Create a `.env` file and configure all required environment variables before running the application.

### 6. Run the Application

```bash
python app.py
```

## Project Features

* Annual Report Upload & Processing
* KPI Extraction using Azure OpenAI
* Azure AI Search Integration
* Semantic Search & Retrieval
* RAG-based Chatbot
* PostgreSQL KPI Storage
* Investor Insights Dashboard

## Technology Stack

### Backend

* FastAPI
* Python 3.12

### AI Services

* Azure OpenAI
* Azure AI Search

### Database

* Azure PostgreSQL

### Deployment

* Docker
* Azure Container Registry (ACR)
* Azure Kubernetes Service (AKS)

### Package Management

* UV

## Notes

* Ensure all Azure resources are configured before running the application.
* Verify that PostgreSQL firewall rules allow access from the application.
* Store secrets in environment variables and never commit `.env` files to source control.
