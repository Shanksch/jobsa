<div align="center">

<img src="docs/banner.png" alt="JobSA Banner" width="800" />

<br />

# 🚀 JobSA

**AI-powered copilot that automates job applications across ATS platforms using RAG, intelligent browser automation, and human-in-the-loop review.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.12+](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Chrome Extension](https://img.shields.io/badge/Chrome-MV3_Extension-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3)

[Demo](#demo) · [Screenshots](#screenshots) · [Features](#features) · [Architecture](#architecture) · [Quick Start](#quick-start) · [Roadmap](#roadmap)

</div>

---

## Why JobSA?

Job applications require candidates to repeatedly enter the same information across different Applicant Tracking Systems — Greenhouse, Lever, Workday, and dozens more.

**JobSA eliminates repetitive form filling** using Retrieval-Augmented Generation and intelligent browser automation, while keeping you in full control before submission. Upload your resume once, build your career knowledge base, and let the AI handle the rest.

---

## Demo

<div align="center">



https://github.com/user-attachments/assets/b9152a05-dad9-4372-b6c1-28a75c62f132





> **31s walkthrough:** Upload resume → Open a Greenhouse job posting → AI fills the entire application → Review answers → Submit.

</div>

---

## Screenshots

<div align="center">
<table>
  <tr>
    <td><img src="docs/screenshots/dashboard.png" alt="Dashboard" width="400" /><br /><sub><b>Dashboard</b> — Application stats & recent activity</sub></td>
    <td><img src="docs/screenshots/knowledge-base.png" alt="Knowledge Base" width="400" /><br /><sub><b>Knowledge Base</b> — Education, experience, skills</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/resumes.png" alt="Resumes" width="400" /><br /><sub><b>Resumes</b> — Upload & AI-powered parsing</sub></td>
    <td><img src="docs/screenshots/applications.png" alt="Applications" width="400" /><br /><sub><b>Applications</b> — Track every submission</sub></td>
  </tr>
</table>
</div>

---

## Features

| | Feature | Description |
|---|---|---|
| 📄 | **Resume Parsing Engine** | Upload PDF/DOCX → AI extracts structured data (education, experience, skills, projects) via two-stage pipeline |
| ⚡ | **Omni-ATS Autofill** | Chrome extension fills Greenhouse, Lever, and Workday applications with one click |
| 🎯 | **RAG-Powered Answers** | Retrieves only the relevant career context for each form field — no full-context stuffing |
| 🧠 | **Career Knowledge Base** | Centralized store for education, work experience, projects, skills, certifications, and achievements |
| 📊 | **Application Tracker** | Track submissions, statuses, interview rates, and weekly progress |
| 🛡️ | **Human-in-the-Loop** | Review and edit every AI-generated answer before submission — you stay in control |
| 🔐 | **Auth & Security** | Supabase Auth (email + Google OAuth) with Row Level Security on all user data |

---

## Architecture

```mermaid
graph TB
    subgraph Client["🖥️ Client"]
        EXT["Chrome Extension<br/><small>React · MV3 · Side Panel</small>"]
        DASH["Web Dashboard<br/><small>React · Vite · TanStack Query</small>"]
    end

    subgraph Backend["⚙️ FastAPI Backend"]
        API["API Server<br/><small>Python 3.12 · Pydantic v2</small>"]
        RAG["RAG Engine<br/><small>Retrieval · Generation</small>"]
        PARSE["Resume Parser<br/><small>pymupdf4llm · instructor</small>"]
        EMBED["Embeddings<br/><small>FastEmbed · nomic-embed-text</small>"]
    end

    subgraph Data["🗄️ Supabase"]
        DB["PostgreSQL<br/><small>+ pgvector</small>"]
        AUTH["Auth<br/><small>JWT · OAuth</small>"]
        STORE["Storage<br/><small>Resume files</small>"]
    end

    LLM["🤖 Gemini & Groq<br/><small>Primary: gemini-3.5-flash-lite via LiteLLM</small>"]

    EXT -->|"Autofill requests"| API
    DASH -->|"Resume upload"| API
    DASH -.->|"Profile, KB, Apps (RLS)"| DB
    DASH -.->|"Auth"| AUTH

    API --> RAG
    API --> PARSE
    RAG --> EMBED
    RAG --> DB
    RAG --> LLM
    PARSE --> LLM
    API --> STORE
    PARSE --> STORE

    style Client fill:#1a1a2e,stroke:#16213e,color:#e0e0e0
    style Backend fill:#0f3460,stroke:#16213e,color:#e0e0e0
    style Data fill:#533483,stroke:#16213e,color:#e0e0e0
    style LLM fill:#e94560,stroke:#16213e,color:#e0e0e0
```

> **Hybrid data access:** The dashboard talks directly to Supabase (via RLS) for profile, knowledge base, and application CRUD. Only resume uploads and autofill requests go through the FastAPI backend — keeping it lean and focused on server-side compute (PDF parsing, LLM calls, vector search).
>
> 📘 **[Read the full engineering rationale →](ARCHITECTURE.md)**

---

## Tech Stack

| Layer | Technology |
|---|---|
| 🏗️ Monorepo | Turborepo + npm workspaces |
| ⚛️ Frontend | React 18 · TypeScript 5 · TailwindCSS v4 |
| 🧩 UI Library | Radix UI + shadcn-style components |
| 📡 Data Layer | TanStack Query · React Hook Form · Zod |
| 🔌 Extension | Chrome Manifest V3 |
| 🐍 Backend | FastAPI · Pydantic v2 · structlog |
| 🗄️ Database | Supabase (PostgreSQL + pgvector + Auth + Storage) |
| 🤖 LLM | Gemini (gemini-3.5-flash-lite) & Groq via LiteLLM Router |
| 🔍 Observability | Langfuse |
| 🔢 Embeddings | Gemini (gemini-embedding-001) |
| 📄 Resume Parsing | pymupdf4llm + instructor |
| 🚀 CI/CD | GitHub Actions |

---

## Quick Start

### Prerequisites

- Node.js 22+ and npm 10+
- Python 3.12+
- A [Supabase](https://supabase.com) project (free tier)
- A [Gemini](https://aistudio.google.com/) API key
- (Optional) A [Groq](https://console.groq.com) API key
- (Optional) A [Langfuse](https://langfuse.com) API key for observability

### 1. Clone & Install

```bash
git clone https://github.com/Shanksch/jobsa.git
cd jobsa

# JavaScript (monorepo-wide)
npm install

# Python backend
cd services/backend
uv venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
uv pip install -e ".[dev]"
```

### 2. Configure Environment

Copy `.env.example` and fill in your credentials:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=postgresql+asyncpg://postgres:password@db.your-project.supabase.co:5432/postgres

# LLM & Observability
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=https://cloud.langfuse.com

# Frontend (apps/web-dashboard/.env)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Run

```bash
# Terminal 1 — Backend
cd services/backend && .venv\Scripts\activate
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Dashboard
npm run dev
```

### 4. Load Chrome Extension

```bash
cd apps/extension && npm run build
```

1. Open `chrome://extensions` → Enable **Developer mode**
2. Click **Load unpacked** → select `apps/extension/dist`

### 5. Run Tests

```bash
# Backend
cd services/backend && .venv\Scripts\activate && pytest tests/ -v

# Frontend
npm run typecheck && npm run lint
```

<details>
<summary><strong>🐳 Local dev without Supabase (Docker fallback)</strong></summary>

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
# Starts PostgreSQL 16 on localhost:5432
# Update DATABASE_URL in .env to point to local Postgres
```

</details>

---

## Project Structure

```
jobsa/
├── apps/
│   ├── extension/          # Chrome MV3 extension (React + Vite)
│   └── web-dashboard/      # Dashboard SPA (React + Vite + TanStack Query)
├── services/
│   └── backend/            # FastAPI server (Python 3.12+)
├── packages/
│   ├── ui/                 # @jobsa/ui — shared Radix + shadcn component library
│   ├── shared/             # @jobsa/shared — TypeScript types + Zod schemas
│   └── prompts/            # Versioned LLM prompt templates
├── infrastructure/
│   └── docker/             # Docker Compose (local dev fallback)
├── ARCHITECTURE.md         # Engineering decisions & API docs
└── README.md               # ← You are here
```

---

## Roadmap

- ✅ Monorepo Architecture (Turborepo + npm workspaces)
- ✅ Resume Parsing (PDF → Markdown → Structured JSON)
- ✅ RAG Pipeline (pgvector + FastEmbed + LiteLLM)
- ✅ Chrome Extension (MV3 + Side Panel)
- ✅ Career Knowledge Base (Education, Experience, Skills, Projects, Certifications)
- ✅ Application Tracker with Stats
- ✅ Supabase Auth (Email + Google OAuth)
- ✅ Web Dashboard (Profile, Resumes, Knowledge Base, Applications)
- ⬜ Resume Tailoring — job-specific resume optimization
- ✅ Job Match Scoring (Extension API)
- ⬜ Job Match Analytics Dashboard
- ⬜ Multi-ATS Autofill (Workday, ICIMS, Taleo)
- ⬜ Team / Multi-user Support

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Acknowledgements

Built with [FastAPI](https://fastapi.tiangolo.com), [React](https://react.dev), [Supabase](https://supabase.com), [Gemini](https://aistudio.google.com/), [Groq](https://groq.com), [LiteLLM](https://github.com/BerriAI/litellm), [Langfuse](https://langfuse.com), [TanStack Query](https://tanstack.com/query), [Radix UI](https://radix-ui.com), and [Turborepo](https://turbo.build).

---

<div align="center">

**[⬆ Back to Top](#-jobsa)**

</div>
