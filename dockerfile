# Stage 1: build the React frontend
FROM node:24-slim AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./

RUN npm ci

COPY frontend/ ./

RUN npm run build

# Stage 2: Python runtime, serving the built frontend as static files
FROM python:3.12-slim

# Set the working directory inside the container
WORKDIR /app

RUN pip install uv

COPY requirements.txt ./

RUN uv pip install --system -r requirements.txt

# Copy application code into the container
COPY . /app

# Copy the frontend build last so it always wins over anything stray
# already present in the build context.
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Expose the port the app will run on
EXPOSE 8000

# Use uvicorn to run the FastAPI app defined in app.py
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
