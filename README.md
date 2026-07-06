# JobSA — AI Job Application Copilot

An intelligent Chrome extension + web dashboard that automates job applications across ATS platforms (Greenhouse, Lever, Workday, etc.) using semantic field classification, RAG-powered answer generation, and human-in-the-loop review.

## Architecture

```
apps/extension        → Chrome MV3 extension (React 18 + Vite + TypeScript)
apps/web-dashboard    → Dashboard SPA (React 18 + Vite + TypeScript)
services/backend      → FastAPI API server (Python 3.13)
packages/ui           → Shared React component library (shadcn-based)
packages/shared       → Shared TypeScript types + Zod schemas
packages/prompts      → Versioned LLM prompt templates
infrastructure/       → Docker Compose, Dockerfiles
```

## Quick Start

### Prerequisites
- Node.js 22+ and npm 10+
- Python 3.13+
- Docker Desktop (optional, for Postgres/Redis/Qdrant/Ollama)

### Development (without Docker)

```bash
# Install JS dependencies
npm install

# Start frontend dev servers (extension + dashboard)
npm run dev

# In a separate terminal — start the backend
cd services/backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

### Development (with Docker)

```bash
# Start all infrastructure + backend
docker compose -f infrastructure/docker/docker-compose.yml up -d

# Start frontend dev servers
npm run dev
```

### Load the Extension
1. Run `npm run dev` (or `npm run build` in `apps/extension`)
2. Open `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" → select `apps/extension/dist`

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 18, TypeScript 5, TailwindCSS 4, shadcn/ui |
| Extension | Chrome Manifest V3, @crxjs/vite-plugin |
| Backend | FastAPI, SQLAlchemy 2.0 (async), Pydantic v2 |
| Database | PostgreSQL 16, Redis 7, Qdrant (vectors) |
| AI/ML | LangGraph, LiteLLM, Ollama / Groq |
| CI/CD | GitHub Actions |

## Project Structure

See `turbo.json` for the build pipeline. Each workspace package has its own `package.json` with `dev`, `build`, `lint`, `typecheck`, and `test` scripts orchestrated by Turborepo.

## License

Private — not for distribution.
