# Jobsa: AI Job Application Copilot - Project Context

**Target Audience:** AI Agents / Developers
**Purpose:** Provide full context of the project architecture, stack, state, and structure without needing to read the entire codebase. This file should be read first by any agent entering the workspace.

## 1. Project Overview
Jobsa is an AI-powered copilot for job applications. It includes a web dashboard for managing resumes, user profiles, career knowledge bases, and job applications, alongside a Chrome extension for interacting directly with job boards.

## 2. Current Phase
**Current Phase:** Phase 1 - Simplified Architecture & Backend Feature Implementation.
- **Phase 0 (Completed):** Monorepo setup, basic extension ↔ backend round trip, UI packages.
- **Phase 1 (In Progress):** 
  - Migrated to Supabase (PostgreSQL + pgvector + Storage + Auth).
  - Switched LLM provider to Groq (Llama 3.3 70B) via LiteLLM.
  - Implemented Core Backend schemas, models, and routes (`resumes`, `knowledge`, `profile`, `applications`).
  - Added frontend TanStack Query integration.
  - *Current Focus:* Refining backend endpoints (e.g., fixing type checker errors), and implementing the UI dashboard pages (Resumes, Profile, Knowledge Base, Applications) to connect with the backend.

## 3. Technology Stack
- **Monorepo:** Turborepo (`npx turbo`) with npm workspaces.
- **Backend:** FastAPI (Python), structlog, Pydantic, pymupdf4llm (for resume parsing).
- **Database & Storage:** Supabase (managed Postgres, pgvector, Storage, Auth).
- **Frontend (Web & Extension):** React 18, Vite 5, TypeScript, TailwindCSS v4.
- **Frontend Data Fetching:** TanStack Query, React Hook Form, Zod.
- **LLM/AI:** Groq (Llama-3.1-8b-instant) integrated via LiteLLM.

## 4. Directory Structure
```text
jobsa/
├── apps/
│   ├── extension/           # Chrome MV3 extension (Vite + React)
│   └── web-dashboard/       # Dashboard SPA (Vite + React + TanStack Query)
├── packages/
│   ├── ui/                  # Shared UI components (shadcn-style, Tailwind v4, Radix)
│   ├── shared/              # Shared TS types and Zod schemas mirroring backend
│   └── prompts/             # System prompts and agent guidelines
├── services/
│   └── backend/             # FastAPI backend service
│       ├── app/
│       │   ├── api/routes/  # FastAPI routers (resumes.py, profile.py, etc.)
│       │   ├── core/        # DB connection, Auth setup, Logging, Middleware
│       │   ├── models/      # SQLAlchemy ORM models (base.py, profile.py, etc.)
│       │   ├── schemas/     # Pydantic validation schemas
│       │   └── services/    # Business logic (resume_parser, storage, ingestion)
│       ├── alembic/         # DB migrations
│       └── tests/           # Pytest suite
└── infrastructure/
    └── docker/              # Docker compose for local dev fallback
```

## 5. Key Architecture Decisions
- **Supabase Over Local DB:** Supabase acts as the primary managed Postgres DB, Vector DB (pgvector), and File Storage (for resumes).
- **One Backend Monolith:** The initial plan for microservices was condensed into a single FastAPI backend for simplicity.
- **Shared UI Package:** UI components live in `@jobsa/ui` using Tailwind v4 CSS-first design. Apps import components directly.
- **Typing & Validation:** Backend uses Pydantic schemas which are manually mirrored in `packages/shared/src/schemas` (Zod) and `types` (TypeScript) for the frontend.
- **Resume Parsing:** Uses `pymupdf4llm` to extract Markdown from PDFs, then Groq LLM structures it into JSON for the Knowledge Base.

## 6. How to Run Locally
**Backend:**
```bash
cd services/backend
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```
**Frontend (Dashboard):**
```bash
npm run dev
# or: npx turbo dev --filter=@jobsa/web-dashboard
```
**Tests (Backend):**
```bash
cd services/backend
.venv\Scripts\pytest tests/ -v
```

## 7. Next Steps
- Ensure all dashboard pages (Profile, Resumes, Knowledge Base, Applications) are wired to the TanStack Query API client and fully functional.
- Implement the "Human Review Shell" and Application Tracking logic.
- End-to-end testing and polishing frontend integration with the backend REST endpoints.
