# Jobsa: AI Job Application Copilot - Project Context

**Target Audience:** AI Agents / Developers
**Purpose:** Provide full context of the project architecture, stack, state, and structure without needing to read the entire codebase. This file should be read first by any agent entering the workspace.
**Last Updated:** 2026-07-31

## 1. Project Overview
Jobsa is an AI-powered copilot for job applications. It includes:
- A **web dashboard** for managing resumes, user profiles, career knowledge bases, and job applications.
- A **Chrome extension** (MV3) for interacting directly with job boards and autofilling applications.
- A **FastAPI backend** for resume parsing, RAG-based answer generation, and file storage.

## 2. Current Phase
**Current Phase:** Phase 1 - Simplified Architecture & Backend Feature Implementation.
- **Phase 0 (Completed):** Monorepo setup, basic extension ↔ backend round trip, UI packages.
- **Phase 1 (In Progress):**
  - Migrated to Supabase (PostgreSQL + pgvector + Storage + Auth).
  - Switched LLM provider to Groq (Llama 3.3 70B) via LiteLLM.
  - Implemented Core Backend schemas, models, and routes (`resumes`, `knowledge`, `profile`, `applications`).
  - Added frontend TanStack Query integration.
  - Hardened extension content scripts against iframe race conditions (e.g., Recaptcha) and MV3 Side Panel API limitations (`tab.url` stripping causing 422 errors).
  - *Current Focus:* Refining backend endpoints (e.g., fixing type checker errors), and implementing the UI dashboard pages (Resumes, Profile, Knowledge Base, Applications) to connect with the backend.

## 3. Technology Stack
- **Monorepo:** Turborepo (`npx turbo`) with npm workspaces.
- **Backend:** FastAPI (Python 3.12), structlog, Pydantic, pymupdf4llm (for resume parsing).
- **Database & Storage:** Supabase (managed Postgres, pgvector, Storage, Auth).
- **Frontend (Web & Extension):** React 18, Vite 5, TypeScript, TailwindCSS v4.
- **Frontend Data Fetching:** TanStack Query, React Hook Form, Zod.
- **LLM/AI:** Groq (Llama-3.1-8b-instant) integrated via LiteLLM.
- **Shared UI:** `@jobsa/ui` package — Radix-based, shadcn-style component library.
- **Shared Types:** `@jobsa/shared` package — TypeScript types + Zod schemas mirroring backend Pydantic models.

## 4. Directory Structure (Full File Map)
```text
jobsa/
├── apps/
│   ├── extension/                      # Chrome MV3 extension (Vite + React)
│   │   ├── manifest.json               # MV3 manifest (permissions, content scripts, service worker)
│   │   ├── vite.config.ts
│   │   ├── src/
│   │   │   ├── background/             # Service worker (background script)
│   │   │   ├── content/                # Content scripts (injected into pages)
│   │   │   │   ├── index.ts            # Main content script (runs on <all_urls>)
│   │   │   │   └── auth-sync.ts        # Auth token sync (runs on localhost:5173)
│   │   │   └── sidepanel/              # Extension side panel UI (React)
│   │   └── dist/                       # Built extension output (load unpacked from here)
│   │
│   └── web-dashboard/                  # Dashboard SPA (Vite + React + TanStack Query)
│       ├── .env                        # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
│       ├── index.html
│       ├── vite.config.ts              # Vite + React + TailwindCSS v4 plugin, port 5173
│       └── src/
│           ├── main.tsx                # React DOM entry point
│           ├── App.tsx                 # Router + AuthProvider + ProtectedRoute wrapper
│           ├── index.css               # Tailwind base styles
│           ├── contexts/
│           │   └── AuthContext.tsx      # Supabase auth state + extension token sync
│           ├── lib/
│           │   ├── supabase.ts         # Supabase client init (from env vars)
│           │   └── api.ts              # API client (see §7 for details)
│           ├── components/
│           │   ├── Layout.tsx          # App shell with sidebar
│           │   └── Sidebar.tsx         # Navigation sidebar
│           └── pages/
│               ├── LandingPage.tsx     # Public landing page (/)
│               ├── LoginPage.tsx       # Auth page — email/password + Google OAuth (/login)
│               ├── DashboardPage.tsx   # Overview dashboard (/dashboard)
│               ├── ProfilePage.tsx     # User profile editor (/profile)
│               ├── ResumesPage.tsx     # Resume list + upload (/resumes)
│               ├── ResumeDetailPage.tsx# Single resume view (/resumes/:id)
│               ├── KnowledgeBasePage.tsx# Education, experience, skills, etc. (/knowledge)
│               ├── ApplicationsPage.tsx# Application tracker (/applications)
│               └── SettingsPage.tsx    # Settings page (/settings)
│
├── packages/
│   ├── ui/                             # @jobsa/ui — Shared UI component library
│   │   └── src/
│   │       ├── index.ts                # Re-exports all components
│   │       ├── globals.css             # CSS custom properties (colors, radii, design tokens)
│   │       ├── lib/                    # Utility functions (cn, etc.)
│   │       └── components/             # Radix-based shadcn-style components:
│   │           ├── badge.tsx
│   │           ├── button.tsx
│   │           ├── card.tsx
│   │           ├── data-table.tsx
│   │           ├── dialog.tsx
│   │           ├── file-upload.tsx
│   │           ├── input.tsx
│   │           ├── label.tsx
│   │           ├── select.tsx
│   │           ├── separator.tsx
│   │           ├── skeleton.tsx
│   │           ├── sonner.tsx           # Toast notifications (wraps sonner)
│   │           ├── tabs.tsx
│   │           └── textarea.tsx
│   │
│   ├── shared/                         # @jobsa/shared — Shared TS types & Zod schemas
│   │   └── src/
│   │       ├── index.ts                # Re-exports types + schemas
│   │       ├── types/index.ts          # TypeScript interfaces (see §6)
│   │       └── schemas/index.ts        # Zod validation schemas
│   │
│   └── prompts/                        # System prompts and agent guidelines
│
├── services/
│   └── backend/                        # FastAPI backend service
│       ├── .env                        # Local env vars (DB, Supabase, Groq keys)
│       ├── requirements.txt
│       ├── alembic.ini
│       ├── alembic/                    # DB migrations
│       ├── tests/                      # Pytest suite
│       └── app/
│           ├── __init__.py
│           ├── main.py                 # FastAPI app factory (create_app, lifespan)
│           ├── config.py               # Pydantic Settings (env-driven config singleton)
│           ├── api/
│           │   └── routes/
│           │       ├── health.py       # GET /api/health
│           │       ├── resumes.py      # Full CRUD: /api/resumes (see §7)
│           │       └── autofill.py     # POST /api/autofill
│           ├── core/
│           │   ├── __init__.py         # (contains setup_logging — same as logging.py)
│           │   ├── auth.py             # Supabase JWT validation + auto-profile creation
│           │   ├── logging.py          # structlog JSON logging config
│           │   └── middleware.py       # RequestIDMiddleware (X-Request-ID tracing)
│           ├── schemas/
│           │   ├── __init__.py         # Re-exports
│           │   ├── resume.py           # Resume Pydantic schemas
│           │   └── autofill.py         # Autofill request/response schemas
│           └── services/
│               ├── __init__.py
│               ├── resume_parser.py    # PDF → Markdown → structured JSON via Groq LLM
│               ├── storage.py          # Supabase Storage file upload/download
│               ├── ingestion.py        # Resume ingestion pipeline (parse → chunk → embed → store)
│               ├── chunking.py         # Text chunking for RAG
│               ├── embeddings.py       # Embedding generation for pgvector
│               ├── retrieval.py        # Vector similarity search
│               └── rag_engine.py       # RAG answer generation
│
└── infrastructure/
    └── docker/
        ├── docker-compose.yml          # Local dev fallback (Postgres 16 + optional backend)
        ├── backend.Dockerfile          # Multi-stage Python 3.13 production image
        └── .env.example                # Template for docker env vars
```

## 5. Architecture & Key Decisions

### Authentication Flow
1. **Frontend → Supabase (direct):** The React app uses `@supabase/supabase-js` to authenticate directly with Supabase Auth (email/password or Google OAuth). No backend involvement.
2. **Supabase → Browser:** On success, Supabase returns a JWT session. The `AuthContext` stores it and broadcasts the access token to the Chrome extension via `window.postMessage`.
3. **Frontend → Backend:** For backend calls (resumes), the `api.ts` client attaches the Supabase JWT as a `Bearer` token in the `Authorization` header.
4. **Backend validates JWT:** `app/core/auth.py` calls `supabase.auth.get_user(token)` to validate. If no `user_profiles` row exists for the user, it auto-creates one.
5. **Extension auth:** The content script `auth-sync.ts` listens for `JOBSA_AUTH_SYNC` messages on the dashboard page. It can also request the token via `JOBSA_AUTH_REQUEST`.

### Data Access Pattern (Hybrid)
- **Profile, Knowledge Base, Applications:** The frontend talks **directly to Supabase** using the JS client (RLS-secured). No backend involved.
- **Resumes:** The frontend talks to the **FastAPI backend** (`/api/resumes`), which handles file upload to Supabase Storage, PDF parsing via pymupdf4llm, and LLM-powered structuring via Groq.
- **Autofill:** The extension calls the **FastAPI backend** (`/api/autofill`) for RAG-based answer generation.

### Frontend Routing (React Router v6)
| Route | Page Component | Auth Required |
|---|---|---|
| `/` | `LandingPage` | No |
| `/login` | `LoginPage` | No |
| `/dashboard` | `DashboardPage` | Yes |
| `/profile` | `ProfilePage` | Yes |
| `/resumes` | `ResumesPage` | Yes |
| `/resumes/:id` | `ResumeDetailPage` | Yes |
| `/knowledge` | `KnowledgeBasePage` | Yes |
| `/applications` | `ApplicationsPage` | Yes |
| `/settings` | `SettingsPage` | Yes |

Protected routes are wrapped in `<ProtectedRoute>` which checks `useAuth()` session and redirects to `/login` if unauthenticated.

## 6. Data Models (Shared TypeScript Types)
Defined in `packages/shared/src/types/index.ts` and mirrored in backend Pydantic schemas:

| Type | Supabase Table | Key Fields |
|---|---|---|
| `UserProfile` | `user_profiles` | id, email, full_name, phone, location, linkedin_url, github_url, portfolio_url, summary, salary_expectation, notice_period, work_authorization, preferred_locations[], languages[] |
| `Resume` | — (backend managed) | id, profile_id, name, storage_path, file_name, file_size, mime_type, parsed_text, parsed_markdown, parsed_sections, is_primary |
| `ResumeListItem` | — | id, name, file_name, file_size, mime_type, is_primary, created_at |
| `Education` | `education` | profile_id, institution, degree, field_of_study, start_date, end_date, gpa, description, is_current |
| `WorkExperience` | `work_experience` | profile_id, company, title, location, start_date, end_date, description, highlights[], technologies[], is_current |
| `Project` | `projects` | profile_id, name, description, url, technologies[], highlights[], start_date, end_date |
| `Skill` | `skills` | name, category (global skill catalog) |
| `UserSkill` | `user_skills` | profile_id, skill_id, skill? (joined), proficiency, years_experience |
| `Certification` | `certifications` | profile_id, name, issuer, issue_date, expiry_date, credential_id, credential_url |
| `Achievement` | `achievements` | profile_id, title, description, date, url |
| `Publication` | `publications` | profile_id, title, publisher, date, url, description |
| `Application` | `applications` | profile_id, resume_id, company, role, posting_url, ats_platform, status, match_score, generated_answers, applied_at, notes |
| `ApplicationStats` | — (computed) | total, by_status{}, this_week, interview_rate |
| `ClassifiedField` | — | field_id, label, canonical_field, confidence, source, suggested_value |

## 7. API Surface

### Backend API (FastAPI on port 8000)
All backend routes require `Authorization: Bearer <supabase_jwt>` (enforced by `get_current_user` dependency).

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check (DB, Supabase, LLM status) |
| `GET` | `/api/resumes` | List user's resumes |
| `POST` | `/api/resumes` | Upload resume (multipart form: file, name, is_primary) |
| `GET` | `/api/resumes/:id` | Get resume details |
| `PATCH` | `/api/resumes/:id` | Update resume metadata |
| `DELETE` | `/api/resumes/:id` | Delete resume |
| `GET` | `/api/resumes/:id/download` | Download resume file |
| `POST` | `/api/resumes/:id/import` | Parse resume → import to knowledge base |
| `POST` | `/api/autofill` | RAG-based answer generation (accepts optional `resume_id` and `context`) |

### Direct Supabase Access (Frontend JS Client)
The frontend bypasses the backend for these, using the Supabase JS client with RLS:

| Table | Operations | Used By |
|---|---|---|
| `user_profiles` | CRUD | ProfilePage |
| `education` | CRUD | KnowledgeBasePage |
| `work_experience` | CRUD | KnowledgeBasePage |
| `projects` | CRUD | KnowledgeBasePage |
| `skills` | Read/Create | KnowledgeBasePage |
| `user_skills` | CRUD (with skill join) | KnowledgeBasePage |
| `certifications` | CRUD | KnowledgeBasePage |
| `achievements` | CRUD | KnowledgeBasePage |
| `publications` | CRUD | KnowledgeBasePage |
| `applications` | CRUD + stats query | ApplicationsPage |

### Frontend API Client (`apps/web-dashboard/src/lib/api.ts`)
- `BACKEND_URL` is hardcoded to `http://localhost:8000` — **needs to be made configurable** via `VITE_API_URL` for deployment.
- `request<T>()` helper: auto-attaches Supabase JWT, sets Content-Type, handles errors.
- `api.resumes.*` → calls FastAPI backend.
- `api.profile.*`, `api.knowledge.*`, `api.applications.*` → calls Supabase directly.

## 8. Backend Configuration (`services/backend/app/config.py`)
Uses Pydantic Settings, loaded from `.env` files. Key settings:

| Setting | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://jobsa:jobsa_dev@localhost:5432/jobsa` | Async DB connection |
| `DATABASE_URL_SYNC` | `postgresql://jobsa:...` | Sync DB connection (migrations) |
| `SUPABASE_URL` | (empty) | Supabase project URL |
| `SUPABASE_ANON_KEY` | (empty) | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | (empty) | Supabase service role key (admin) |
| `SUPABASE_STORAGE_BUCKET` | `resumes` | Storage bucket name |
| `CORS_ORIGINS` | `http://localhost:5173,...` | Comma-separated allowed origins |
| `GROQ_API_KEY` | (empty) | Groq API key for LLM |
| `LLM_PROVIDER` | `groq` | LiteLLM provider |
| `LLM_MODEL` | `llama-3.1-8b-instant` | Model identifier |
| `MAX_UPLOAD_SIZE_MB` | `10` | Max resume file size |
| `DEBUG` | `true` | Enables /docs, /redoc |

## 9. Chrome Extension Details
- **Manifest Version:** 3
- **Permissions:** `storage`, `activeTab`
- **Host Permissions:** `http://localhost:8000/*`, `http://34.41.44.108:8000/*`, `https://xhnzyznqeojaqqzutdfp.supabase.co/*`
- **Content Scripts:**
  - `src/content/index.ts` → Runs on `<all_urls>` (Injects Shadow DOM floating panel UI, handles tracking)
  - `src/content/auth-sync.ts` → Runs on `localhost:5173` and `jobsa-web-dashboard.vercel.app` (token sync with dashboard)
- **Service Worker:** `src/background/service-worker.ts` (Handles API requests, creates/updates applications in Supabase via REST)
- **Popup:** `src/popup/index.html` (Displays connection status and handles waking-up state)

## 10. How to Run Locally
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
**Extension:**
```bash
cd apps/extension
npm run build
# Then load unpacked from apps/extension/dist in chrome://extensions
```
**Tests (Backend):**
```bash
cd services/backend
.venv\Scripts\activate
pytest tests/ -v
```

## 11. Deployment Plan
| Component | Platform | Notes |
|---|---|---|
| Web Dashboard | Vercel | Static SPA, set VITE_* env vars |
| Backend API | Google Cloud VM | Docker via SSH, set all env vars |
| Chrome Extension | Chrome Web Store | Build → zip dist/ → upload ($5 one-time) |
| Database/Auth | Supabase | Already hosted, update redirect URLs post-deploy |

Key deployment tasks:
- Make `BACKEND_URL` in `api.ts` configurable via `VITE_API_URL` env var.
- Update extension `host_permissions` and content script matches for production URLs.
- Update `CORS_ORIGINS` on backend to include Vercel domain.
- Add Vercel dashboard URL to Supabase Auth redirect URLs.

## 12. Next Steps
- Implement the "Human Review Shell" in the dashboard.
- End-to-end testing and polishing frontend integration with the backend REST endpoints.
- Provide a mechanism for users to update the 'context' field for autofill.
- Full deployment (Vercel + Google Cloud VM + Chrome Web Store).
