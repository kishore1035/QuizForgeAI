# QuizForge AI — Turn Anything Into a Quiz

> An AI-powered quiz generation, authoring, practice, and persistence platform powered by **Nemotron 3 Nano 30B Cloud** via **Ollama Cloud**.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016.4%20%7C%20React%2019-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![SQLAlchemy](https://img.shields.io/badge/Database-SQLAlchemy%202.x%20%7C%20SQLite-D71F00?logo=sqlite&logoColor=white)](https://www.sqlalchemy.org/)
[![Nemotron 3](https://img.shields.io/badge/AI%20Model-Nemotron%203%20Nano%2030B%20Cloud-76B900?logo=nvidia&logoColor=white)](https://ollama.com/)

---

## 1. Product Overview

**QuizForge AI** is a complete, production-grade learning and assessment platform. It transforms any learning material into interactive, high-yield practice quizzes.

```
       Learning Source                      Nemotron 3 AI Engine                     Interactive Quiz
 ┌─────────────────────────┐               ┌──────────────────────┐               ┌────────────────────┐
 │ • Topic Exploration     │               │  Ollama Cloud        │               │ • 3-Column Creator │
 │ • Pasted Study Text     │ ────────────> │  nemotron-3-nano:    │ ────────────> │ • Real-Time Taking │
 │ • Uploaded PDF Handout  │               │  30b-cloud           │               │ • Auto-Scoring     │
 └─────────────────────────┘               └──────────────────────┘               └────────────────────┘
                                                      │                                      │
                                                      ▼                                      ▼
                                            SQLite Persistent DB                  Export Engine
                                            • Quizzes & Sources                   • Student Quiz (.md/.txt)
                                            • Attempts & Results                  • Answer Key (.md/.txt)
                                            • Question Snapshots                  • Graded Report (.md/.txt)
```

### Key Capabilities

1. **Multi-Source Generation Engine**:
   - **Topic**: Generate curriculum-grounded quizzes from any academic concept or subject.
   - **Pasted Text**: Extract questions strictly from notes, summaries, or lecture transcripts.
   - **PDF Handouts**: Page-by-page extraction via PyMuPDF with text density validation and page citation tracking.
2. **Nemotron 3 Nano 30B Cloud Integration**:
   - Structured question generation with strict JSON schema enforcement.
   - Automatic retry recovery for malformed output and prompt correction.
   - Anti-hallucination validation: citations verify against uploaded pages.
3. **3-Column Quiz Creator Workspace**:
   - Left: Question Navigator with completion indicators (`Complete` / `Incomplete`).
   - Center: Question editor with options, image attachment, and type selection (`Multiple Choice`, `True/False`, `Short Answer`).
   - Right: Quiz specification (Subject, Exam, Academic Year) and per-question duration presets.
   - Live Save State pill (`Unsaved changes`, `Saving...`, `Saved at HH:MM`, `Save failed`) with browser `beforeunload` unsaved loss prevention.
4. **Interactive Quiz-Taking Engine**:
   - Sanitized taking session: student view strictly hides correct answer IDs and explanations.
   - Per-question countdown timer (automatically advances without wiping entered answers).
   - Question palette navigation (Previous, Next, direct jump).
   - Submission dialog with answered vs. unanswered counts.
5. **Deterministic & Semantic Scoring**:
   - Objective questions (Multiple Choice & True/False) scored deterministically with zero latency.
   - Short Answer evaluation with keyword/semantic overlap heuristic and LLM fallback.
   - Grade performance tiers (Outstanding, Good Effort, Needs Review) with score breakdown.
   - Interactive Answer Review with filters (`All`, `Correct`, `Incorrect`, `Unanswered`), grading feedback, and explanations.
6. **Persistent Database & Library**:
   - SQLite persistent database with SQLAlchemy 2.x and Alembic schema tracking.
   - Saved Quiz Library with search, source filtering, and multi-mode sorting (Recently Updated, Title A-Z, Difficulty, Question Count).
   - Attempt History drawer with past scores, time spent, review dialog, and direct export.
7. **Comprehensive Export Engine**:
   - **Student Quiz** (`.md` / `.txt`): Formatted questions with all answer keys and explanations scrubbed.
   - **Teacher Answer Key** (`.md` / `.txt`): Explicitly labelled master key with correct answers, full explanations, and source page citations.
   - **Attempt Results Report** (`.md` / `.txt`): Graded report containing score metrics, time taken, submitted answers, evaluations, and solutions.

---

## 2. Architecture & Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 16.4 (App Router), React 19, TypeScript 5, Tailwind CSS, Turbopack, Lucide Icons |
| **Backend** | Python 3.10+, FastAPI 0.115+, Pydantic v2, Uvicorn, PyMuPDF (fitz) |
| **Database** | SQLite 3, SQLAlchemy 2.x ORM, Alembic migrations |
| **AI Integration** | Ollama Cloud (`POST https://ollama.com/api/chat`), `nemotron-3-nano:30b-cloud` |
| **Testing** | Pytest (Backend, 57 tests), Node / TSX (Frontend, 15 tests) |

---

## 3. Repository Directory Structure

```
QuizForge AI/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health.py             # Health check & system diagnostics
│   │   │   ├── sources.py            # Topic, text, and PDF upload endpoints
│   │   │   ├── quiz.py               # Validation, generation & draft saving
│   │   │   ├── attempts.py           # Start attempt, submit, results & exports
│   │   │   └── routes.py             # Central API router
│   │   ├── core/
│   │   │   ├── config.py             # Pydantic BaseSettings & CORS
│   │   │   ├── database.py           # SQLAlchemy 2.x session & engine
│   │   │   └── errors.py             # Global exception handlers
│   │   ├── models/
│   │   │   ├── base.py               # Declarative base & timestamp mixins
│   │   │   ├── source.py             # Persistent Source model
│   │   │   ├── quiz.py               # Persistent Quiz model with JSON snapshot
│   │   │   └── attempt.py            # Persistent QuizAttempt model
│   │   ├── schemas/                  # Pydantic v2 request/response schemas
│   │   ├── services/
│   │   │   ├── ollama_service.py     # Resilient Ollama Cloud client
│   │   │   ├── quiz_generation_service.py # Generation prompt & anti-hallucination engine
│   │   │   ├── attempt_service.py    # Scoring, attempt tracking & review
│   │   │   ├── export_service.py     # Markdown & plain-text exporter
│   │   │   ├── pdf_service.py        # PyMuPDF text & page extractor
│   │   │   └── source_service.py     # File storage & source registry
│   │   └── main.py                   # FastAPI entrypoint
│   ├── data/                         # Persistent SQLite storage directory
│   ├── storage/                      # Controlled directory for uploaded PDFs
│   ├── tests/                        # 57 automated backend unit & integration tests
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── app/                      # Next.js App Router (page.tsx, layout.tsx, creator/)
│   │   ├── components/
│   │   │   ├── creator/              # 3-column Quiz Creator & Save Status
│   │   │   ├── wizard/               # 3-step Quiz Generation Wizard
│   │   │   ├── taking/               # Interactive Quiz-Taking & Review views
│   │   │   ├── library/              # Saved Quiz Library & Attempt History
│   │   │   └── layout/               # Header, Sidebar, and App Shell
│   │   ├── lib/
│   │   │   ├── api.ts                # Typed ApiClient with fallback support
│   │   │   ├── attemptDefaults.ts    # Client scoring & sanitization
│   │   │   ├── exportUtils.ts        # Client-side Markdown & TXT formatter
│   │   │   └── quizDefaults.ts       # Quiz models & completion validation
│   │   └── types/                    # TypeScript interfaces for API, quizzes, attempts
│   ├── package.json
│   └── .env.example
│
├── docs/
│   ├── ARCHITECTURE.md               # Detailed system design
│   └── DEMO_CHECKLIST.md             # Complete step-by-step presentation script
├── .gitignore
└── README.md
```

---

## 4. Quickstart Guide

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**

---

### Step 1: Start the Backend (FastAPI)

1. Open a terminal and navigate to `backend/`:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv .venv
     .venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create your local `.env` from `.env.example`:
   ```bash
   cp .env.example .env
   ```
   *Configure `OLLAMA_API_KEY` with your Ollama Cloud key.*
   ```env
   OLLAMA_API_KEY=your_ollama_cloud_api_key_here
   OLLAMA_BASE_URL=https://ollama.com
   OLLAMA_MODEL=nemotron-3-nano:30b-cloud
   DATABASE_URL=sqlite:///./data/quizforge.db
   ```

5. Run automated backend tests:
   ```bash
   pytest -v
   ```

6. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   - API Root: [http://localhost:8000](http://localhost:8000)
   - Health Diagnostic: [http://localhost:8000/api/health](http://localhost:8000/api/health)
   - Interactive Swagger API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Step 2: Start the Frontend (Next.js)

1. Open a second terminal and navigate to `frontend/`:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your local `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   *Default: `NEXT_PUBLIC_API_URL=http://localhost:8000`*

4. Run automated frontend unit tests:
   ```bash
   npm test
   ```

5. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   - Access the web application at: [http://localhost:3000](http://localhost:3000)

---

## 5. Automated Verification

Both tiers feature comprehensive test coverage:

### Backend Test Suite (Pytest)
```bash
cd backend
.venv\Scripts\python -m pytest -v
```
- **57 passing tests** covering:
  - Source preparation (Topic, raw text, PDF parsing and OCR density validation).
  - Ollama Cloud generation with prompt engineering, retries, and schema validation.
  - Interactive quiz attempt creation and strict answer-key hiding.
  - Deterministic and semantic answer scoring.
  - SQLite database persistence, source references, and cascade operations.
  - Markdown and plain-text export formatting for questions, answer keys, and attempt reports.

### Frontend Test Suite (TSX / Node Test Runner)
```bash
cd frontend
npm test
```
- **15 passing tests** covering:
  - Question completion validation across MCQ, True/False, and Short Answer.
  - Transformation between API schemas and Quiz Creator state.
  - Answer-key scrubbing for student taking sessions.
  - Deterministic evaluation and heuristic scoring.
  - Export formatting and answer scrubbing verification.

### Production Build Check
```bash
cd frontend
npm run build
```
- Verifies that TypeScript types, App Router routes, and Turbopack bundler compile cleanly with 0 errors.

---

## 6. Security & Integrity Guarantees

- **No AI Key Exposure**: The Ollama Cloud API key is kept strictly in the backend `.env` environment. It is never bundled into client-side JS or returned in HTTP response headers.
- **Answer-Key Protection**: When a student begins a quiz, the returned session JSON strictly omits `correct_option_id`, `correct_answer_text`, and `explanation`. It is technically impossible to inspect network traffic to cheat during an active attempt.
- **Export Scrubbing**: Student quiz exports (`.md` / `.txt`) scrub all solution fields. Only explicitly requested Answer Key exports contain solutions.
- **Unsaved Changes Loss Prevention**: Navigating away or refreshing while editing questions in the Quiz Creator triggers a browser `beforeunload` confirmation dialog.
- **Honest Platform Boundaries**: QuizForge AI is designed as a focused standalone application with local persistent storage. It does not pretend to have enterprise multi-tenant authentication or external payments.
