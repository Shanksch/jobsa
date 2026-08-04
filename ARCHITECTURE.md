# Architecture & Engineering Decisions

> **Looking for the project overview?** See the [README](./README.md).
>
> This document explains _why_ JobSA is built the way it is — the engineering trade-offs, technology choices, and design rationale behind every major decision.

---

## Table of Contents

- [Engineering Decisions](#engineering-decisions)
  - [1. Monorepo with Turborepo + npm Workspaces](#1-monorepo-with-turborepo--npm-workspaces)
  - [2. Supabase as Unified Backend-as-a-Service](#2-supabase-as-unified-backend-as-a-service)
  - [3. Hybrid Data Access Pattern](#3-hybrid-data-access-pattern)
  - [4. Groq (Llama 3.1 8B) via LiteLLM](#4-groq-llama-31-8b-via-litellm)
  - [5. Local Embeddings with FastEmbed](#5-local-embeddings-with-fastembed-nomic-embed-text-v15)
  - [6. RAG Pipeline: Selective Retrieval over Full-Context Stuffing](#6-rag-pipeline-selective-retrieval-over-full-context-stuffing)
  - [7. Two-Stage Resume Parsing](#7-two-stage-resume-parsing)
  - [8. Authentication Flow: Supabase-First with Auto-Profile Creation](#8-authentication-flow-supabase-first-with-auto-profile-creation)
  - [9. Shared Type System: Pydantic ↔ TypeScript ↔ Zod](#9-shared-type-system-pydantic--typescript--zod)
  - [10. TailwindCSS v4 with CSS-First Configuration](#10-tailwindcss-v4-with-css-first-configuration)
  - [11. Frontend Data Layer: TanStack Query](#11-frontend-data-layer-tanstack-query)
  - [12. Request Tracing with X-Request-ID](#12-request-tracing-with-x-request-id)
  - [13. Storage Abstraction with Local Fallback](#13-storage-abstraction-with-local-fallback)
  - [14. Single-Service Backend (No Microservices)](#14-single-service-backend-no-microservices)
- [Tech Stack](#tech-stack)
- [API Surface](#api-surface)
- [Deployment](#deployment)

---

## Engineering Decisions

### 1. Monorepo with Turborepo + npm Workspaces

**Choice:** Single monorepo using Turborepo for build orchestration and npm workspaces for dependency management.

**Why:**
- npm workspaces require no additional tooling — already available with Node.js.
- Turborepo provides parallel task execution, build caching, and dependency-aware task ordering (`dependsOn: ["^build"]`) with minimal configuration.
- A single repo keeps the extension, dashboard, shared packages, and backend co-located, making cross-cutting type changes (e.g., adding a field to `UserProfile`) atomic — one PR updates the Pydantic schema, TypeScript type, and Zod validator together.
- Alternative considered: Nx — heavier, more configuration, not needed at this project's scale.

### 2. Supabase as Unified Backend-as-a-Service

**Choice:** Supabase for PostgreSQL database, pgvector, file storage, and authentication — replacing the original Phase 0 stack of separate Postgres, Redis, Qdrant, and Ollama services.

**Why:**
- **Reduced operational surface:** Phase 0 required 5 Docker containers (Postgres, Redis, Qdrant, Ollama, backend). The simplified architecture needs **zero** for cloud dev (Supabase is hosted) or **one** container (Postgres) for local fallback.
- **pgvector over Qdrant:** Resume chunks and knowledge-base entries are modest in volume (dozens to low hundreds per user). A dedicated vector database is overkill — `pgvector` in Postgres handles cosine similarity search in the same database that stores the data, eliminating sync issues.
- **Supabase Storage over local filesystem:** Files are durable, URL-addressable, and require no disk management. The `StorageService` abstracts this with a local filesystem fallback for testing.
- **Supabase Auth:** Provides email/password + Google OAuth out of the box. The frontend talks directly to Supabase Auth (no backend involvement), and the backend validates the JWT via `supabase.auth.get_user(token)`.
- **RLS (Row Level Security):** Profile, knowledge base, and application data is accessed directly from the frontend via the Supabase JS client, secured by RLS policies. This eliminates the need for backend CRUD endpoints for these tables.

### 3. Hybrid Data Access Pattern

**Choice:** The frontend talks to two different backends depending on the operation.

| Data | Access Path | Reason |
|---|---|---|
| Profile, Knowledge Base, Applications | **Frontend → Supabase directly** (RLS) | Simple CRUD; no server-side processing needed |
| Resumes | **Frontend → FastAPI backend** | Requires file upload, PDF parsing, LLM structuring — can't run in the browser |
| Autofill | **Extension → FastAPI backend** | RAG retrieval + LLM generation is server-side |

**Why:**
- Keeps the backend lean — it only handles operations that genuinely require server-side compute (file parsing, LLM calls, vector search).
- Reduces latency for simple reads/writes (profile edits go straight to Supabase, not through a Python server).
- The `api.ts` client abstracts this split — consumers call `api.profile.update()` or `api.resumes.upload()` without knowing which backend they hit.

### 4. Groq (Llama 3.1 8B) via LiteLLM

**Choice:** Groq's hosted Llama models accessed through LiteLLM, replacing local Ollama.

**Why:**
- **Developer experience:** No need to download 4+ GB models or manage GPU resources locally. A single API key is all that's needed.
- **LiteLLM abstraction:** The `litellm_model` computed property in `config.py` builds the provider-prefixed model string (`groq/llama-3.1-8b-instant`). Switching to OpenAI, Anthropic, or back to Ollama requires changing two env vars (`LLM_PROVIDER`, `LLM_MODEL`) — no code changes.
- **Instructor for structured output:** Resume parsing uses `instructor.from_litellm()` with a Pydantic `ResumeSections` model to guarantee the LLM returns valid structured JSON. This is more reliable than manual JSON parsing with regex fallbacks.
- **Cost:** Groq's free tier provides ~30 RPM — sufficient for development and early usage.

### 5. Local Embeddings with FastEmbed (nomic-embed-text-v1.5)

**Choice:** Embeddings are generated locally using `fastembed` with the `nomic-ai/nomic-embed-text-v1.5` model (768 dimensions), rather than calling an external embedding API.

**Why:**
- **Zero latency, zero cost:** Embedding calls happen in-process with no network round trips. The model is small (~130 MB) and loads once.
- **Async wrapper:** The synchronous `fastembed` library is wrapped in `asyncio.run_in_executor()` with a 2-thread pool to avoid blocking the FastAPI event loop.
- **Batch-first API:** `embed_texts()` is the primary interface; `embed_text()` is a convenience wrapper. The retrieval module batches all form field labels into a single `embed_texts()` call rather than one embedding call per field.

### 6. RAG Pipeline: Selective Retrieval over Full-Context Stuffing

**Choice:** The autofill engine retrieves only the chunks relevant to the current form's fields, rather than concatenating the user's entire knowledge base into every prompt.

**Why:**
- **Token efficiency:** A user with 5 work experiences, 10 projects, and a 3-page resume would generate a massive context window if everything were included. Selective retrieval via pgvector keeps context small and relevant.
- **Ingestion design (`ingestion.py`):** Structured knowledge-base rows (one job, one project, one degree) are embedded as single chunks — they're already self-contained units. Only the raw resume text goes through `chunk_text()` splitting (800-char chunks with 150-char overlap).
- **Skills are special-cased:** Individual skills ("Python", "React") carry almost no embeddable meaning in isolation. They're combined into a single "Skills: Python (advanced); React (intermediate - 3 years); ..." chunk.
- **Deduplication:** The retrieval layer deduplicates chunks with >70% word overlap to prevent the LLM from seeing near-identical context from both the raw resume chunk and a structured knowledge-base entry.
- **Full wipe-and-rebuild:** `reindex_profile()` deletes all chunks for a profile and rebuilds from scratch. This is fine at the scale of one person's career history (dozens of chunks, milliseconds of work) and avoids stale-chunk bugs.

### 7. Two-Stage Resume Parsing

**Choice:** Resumes go through a two-stage pipeline: text extraction → LLM structuring.

1. **Stage 1 — Text extraction:** `pymupdf4llm` converts PDFs to Markdown (preserving headings, tables, lists). `python-docx` handles DOCX files.
2. **Stage 2 — LLM structuring:** The Markdown is sent to Groq with a `ResumeSections` Pydantic schema. `instructor` enforces JSON mode, guaranteeing the response conforms to the schema.

**Why:**
- Separating extraction from structuring makes each stage independently testable and swappable.
- `pymupdf4llm` produces higher-quality Markdown than raw text extraction (preserves document structure), which significantly improves LLM extraction accuracy.
- The Pydantic schema (`ResumeSections` with `ContactInfo`, `EducationItem`, `WorkExperienceItem`, etc.) serves as both the LLM's output contract and the validation layer — invalid responses are caught before they reach the database.

### 8. Authentication Flow: Supabase-First with Auto-Profile Creation

**Choice:** Authentication is handled entirely by Supabase Auth on the frontend. The backend only validates JWTs — it never stores passwords or manages sessions.

**Flow:**
1. Frontend authenticates with Supabase (email/password or Google OAuth).
2. The `AuthContext` stores the session and broadcasts the access token to the Chrome extension via `window.postMessage`.
3. For backend calls, `api.ts` attaches the JWT as a `Bearer` token.
4. `get_current_user()` in `auth.py` calls `supabase.auth.get_user(token)` to validate. If no `user_profiles` row exists, it auto-creates one — zero-friction onboarding.

**Why:**
- Eliminates the need to implement password hashing, session management, OAuth flows, or email verification.
- Auto-profile creation means the first backend call after signup "just works" without a separate registration step.
- The extension syncs auth state via the `auth-sync.ts` content script, which listens for `JOBSA_AUTH_SYNC` messages on the dashboard domain.

### 9. Shared Type System: Pydantic ↔ TypeScript ↔ Zod

**Choice:** Data models are defined three times — as Pydantic models (backend), TypeScript interfaces (`@jobsa/shared`), and Zod schemas (`@jobsa/shared`) — and kept in sync manually.

**Why:**
- **Pydantic** validates backend request/response payloads and drives the OpenAPI spec.
- **TypeScript interfaces** provide compile-time type safety in the frontend.
- **Zod schemas** provide runtime validation for forms (via `react-hook-form` + `@hookform/resolvers/zod`).
- Auto-generation was considered (OpenAPI → TypeScript) but adds a build step, introduces brittleness, and struggles with the hybrid data access pattern where half the types go through FastAPI and half go directly to Supabase.
- The `@jobsa/shared` package is a build dependency of both `web-dashboard` and `extension`, so Turborepo ensures it's built before consumers.

### 10. TailwindCSS v4 with CSS-First Configuration

**Choice:** TailwindCSS v4 using CSS-first configuration (`@theme` blocks in CSS files) instead of the traditional `tailwind.config.ts`.

**Why:**
- No JavaScript config file needed per app — the entire design system lives in `packages/ui/src/globals.css` using CSS custom properties.
- oklch color space for perceptually uniform colors and automatic dark mode via `.dark` class toggle.
- Shared across all frontend apps via the `@jobsa/ui` package.

### 11. Frontend Data Layer: TanStack Query

**Choice:** TanStack Query for all server state management, replacing manual `useEffect` + `useState` fetch patterns.

**Why:**
- Built-in caching, background refetching, optimistic updates, and error/loading states.
- Eliminates boilerplate: a typical data-fetching component went from ~30 lines (useEffect + useState + error handling) to ~5 lines (`useQuery`).
- Mutation hooks (`useMutation`) with `onSuccess` invalidation keep the cache consistent after creates/updates/deletes.
- Stale-while-revalidate behavior means the UI never shows a loading spinner on navigation back to a previously visited page.

### 12. Request Tracing with X-Request-ID

**Choice:** Every backend request gets a UUID (client-provided or server-generated) bound to structlog context.

**Why:**
- All log lines within a request include the same `request_id`, making it trivial to trace a single request through the system (upload → parse → structure → store → respond).
- The ID is returned in the `X-Request-ID` response header, so the frontend can correlate errors with backend logs.
- structlog's `contextvars` integration means the request ID is automatically included in every log call within the request — no manual passing required.

### 13. Storage Abstraction with Local Fallback

**Choice:** The `StorageService` class abstracts Supabase Storage with an automatic local filesystem fallback.

**Why:**
- Tests can run without Supabase credentials — files are written to a local `uploads/` directory.
- The abstraction is thin (upload, download, delete, get_url) and the fallback is a simple directory write — no complex mocking needed.
- Bucket auto-creation: on startup, the service checks if the configured bucket exists and creates it if missing.

### 14. Single-Service Backend (No Microservices)

**Choice:** One FastAPI application handles all backend concerns (resumes, autofill, health), rather than the originally planned 3 microservices.

**Why:**
- At the current scale (single user, single deployment), microservices add operational overhead (service discovery, inter-service auth, deployment orchestration) with no benefit.
- The codebase is organized as if it could be split later — `services/` contains isolated modules (`resume_parser`, `storage`, `rag_engine`, `retrieval`, `chunking`, `embeddings`, `ingestion`) with clean interfaces.
- The monolith can be deployed as a single Docker container on Render's free tier.

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Monorepo** | Turborepo 2.x + npm workspaces | Zero-install orchestration, parallel builds, caching |
| **Frontend** | React 18, TypeScript 5, TailwindCSS 4 | Modern defaults, CSS-first Tailwind, strict TS |
| **UI Library** | Radix UI + shadcn-style components | Accessible primitives, consistent design system |
| **Data Fetching** | TanStack Query, React Hook Form, Zod | Cache management, form validation, runtime types |
| **Extension** | Chrome Manifest V3 | Required for Chrome Web Store distribution |
| **Backend** | FastAPI, Pydantic v2, structlog | Async-native, automatic OpenAPI docs, structured logging |
| **Database** | Supabase (PostgreSQL + pgvector) | Managed hosting, vector search, RLS, Auth, Storage |
| **LLM** | Groq (Llama 3.1 8B) via LiteLLM | Free tier, provider-agnostic abstraction |
| **Embeddings** | FastEmbed (nomic-embed-text-v1.5) | Local, zero-cost, 768-dim vectors |
| **Resume Parsing** | pymupdf4llm + instructor | PDF → Markdown → structured JSON via LLM |
| **CI/CD** | GitHub Actions | Lint + typecheck + test on every push |

---

## API Surface

### FastAPI Backend (port 8000)

All routes require `Authorization: Bearer <supabase_jwt>`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check (DB, Supabase, LLM status) |
| `GET` | `/api/resumes` | List user's resumes |
| `POST` | `/api/resumes` | Upload resume (multipart: file, name, is_primary) |
| `GET` | `/api/resumes/:id` | Get resume with parsed content |
| `PATCH` | `/api/resumes/:id` | Update resume metadata |
| `DELETE` | `/api/resumes/:id` | Delete resume + storage file |
| `GET` | `/api/resumes/:id/download` | Download resume file |
| `POST` | `/api/resumes/:id/import` | Parse resume → import to knowledge base |
| `POST` | `/api/autofill` | RAG-based form field answer generation |

### Direct Supabase Access (Frontend → RLS)

| Table | Operations | Page |
|---|---|---|
| `user_profiles` | CRUD | Profile |
| `education` | CRUD | Knowledge Base |
| `work_experience` | CRUD | Knowledge Base |
| `projects` | CRUD | Knowledge Base |
| `skills` / `user_skills` | Read/Create/Delete | Knowledge Base |
| `certifications` | CRUD | Knowledge Base |
| `achievements` | CRUD | Knowledge Base |
| `publications` | CRUD | Knowledge Base |
| `applications` | CRUD + stats | Applications |

---

## Deployment

| Component | Platform | Notes |
|---|---|---|
| Web Dashboard | Vercel | Static SPA, set `VITE_*` env vars |
| Backend API | Render | Single Docker container, set all env vars |
| Chrome Extension | Chrome Web Store | Build → zip `dist/` → publish |
| Database/Auth/Storage | Supabase | Already hosted |
