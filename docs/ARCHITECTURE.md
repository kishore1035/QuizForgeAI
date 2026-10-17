# QuizForge AI — System Architecture & Design

> **"Turn Anything Into a Quiz"**  
> An AI-powered quiz generation and practice platform powered by Nemotron 3 Nano 30B Cloud via Ollama Cloud.

---

## 1. High-Level Architecture Overview

QuizForge AI is designed as a standalone, decoupled two-tier application:

```
┌────────────────────────────────────────────────────────┐
│                   Next.js Frontend                     │
│  (React 19, TypeScript, Tailwind CSS, Turbopack)       │
│                                                        │
│  • Modern AI Product Shell (Chatbot-UI UX Reference)   │
│  • Collapsible Sidebar & Quiz History                  │
│  • Multi-Source Input Configuration (Topic/Text/PDF)  │
│  • Typed API Client with Diagnostics & State Handling  │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ HTTP / JSON (CORS Enabled)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   FastAPI Backend                      │
│        (Python 3.14, Pydantic v2, Uvicorn)             │
│                                                        │
│  • GET  /api/health (Readiness & Model Diagnostics)    │
│  • POST /api/quiz/generate (Staged for Stage 2)        │
│  • Centralized Exception Handling & Typed Schemas     │
│  • Server-Side Ollama Cloud Integration Interface     │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ Server-Side Only (Secure)
                            ▼
┌────────────────────────────────────────────────────────┐
│                Ollama Cloud Platform                   │
│        Model: nemotron-3-nano:30b-cloud                │
│                                                        │
│  • Zero browser exposure of AI credentials             │
│  • Structured JSON schema generation                   │
└────────────────────────────────────────────────────────┘
```

---

## 2. Component Design & Project Structure

```
quizforge-ai/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css         # Dark theme design tokens & scrollbar
│   │   │   ├── layout.tsx          # Root layout & SEO meta tags
│   │   │   └── page.tsx            # App entry point
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx      # Top bar with model target indicator & ping
│   │   │   │   ├── Sidebar.tsx     # Chatbot-UI style collapsible sidebar & empty state
│   │   │   │   └── MainLayout.tsx  # Layout container & global keyboard shortcuts
│   │   │   ├── quiz/
│   │   │   │   ├── EmptyWorkspace.tsx  # Hero landing with 3 generation sources
│   │   │   │   ├── FeatureCard.tsx     # Clickable source configuration cards
│   │   │   │   └── NewQuizModal.tsx    # Interactive quiz parameter modal & JSON preview
│   │   │   └── ui/
│   │   │       ├── Badge.tsx       # Status badges
│   │   │       ├── Button.tsx      # Reusable button with variants & loaders
│   │   │       ├── ErrorState.tsx  # Error cards with retry mechanism
│   │   │       ├── LoadingState.tsx# Spinners & pulsing skeletons
│   │   │       └── Modal.tsx       # Accessible dialog with ESC listener
│   │   ├── hooks/
│   │   │   └── useBackendHealth.ts # Reactive health polling & connection status
│   │   ├── lib/
│   │   │   ├── api.ts              # Typed API fetch client
│   │   │   └── utils.ts            # Tailwind class merger
│   │   └── types/
│   │       ├── api.ts              # Backend API response interfaces
│   │       └── quiz.ts             # Quiz generation payload types
│   ├── package.json
│   └── .env.example
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health.py           # GET /api/health implementation
│   │   │   └── routes.py           # Centralized API router
│   │   ├── core/
│   │   │   ├── config.py           # Pydantic BaseSettings & CORS validator
│   │   │   └── errors.py           # Global exception handlers
│   │   ├── schemas/
│   │   │   ├── health.py           # HealthStatusResponse Pydantic model
│   │   │   └── quiz.py             # QuizGenerateRequest & QuizResponse models
│   │   ├── services/
│   │   │   └── ai_service.py       # AIServiceInterface & OllamaCloudService skeleton
│   │   └── main.py                 # FastAPI application factory
│   ├── tests/
│   │   └── test_health.py          # Pytest suite for API endpoints
│   ├── requirements.txt
│   └── .env.example
│
├── docs/
│   └── ARCHITECTURE.md
├── .gitignore
└── README.md
```

---

## 3. Security Guidelines & Environment Management

1. **Server-Side AI Secrets**:
   - `OLLAMA_API_KEY` is loaded strictly inside the backend environment (`backend/.env`).
   - The frontend never has access to the Ollama API key and only communicates with the FastAPI proxy (`NEXT_PUBLIC_API_URL`).
2. **CORS Isolation**:
   - The FastAPI backend validates permitted origins via `CORS_ORIGINS` in `Settings`. Default is `["http://localhost:3000", "http://127.0.0.1:3000"]`.
3. **Pydantic Validation**:
   - All client payloads pass through strict Pydantic v2 validation before reaching application services.

---

---

## 4. Chunk 3 Source Processing Architecture

```
[ Frontend Wizard ]
  ├── Step 1: Source Selection (Topic / Pasted Text / Uploaded PDF)
  │     │
  │     ├── POST /api/sources/topic  ──────> SourceProcessingService.create_topic_source
  │     ├── POST /api/sources/text   ──────> SourceProcessingService.create_text_source
  │     └── POST /api/sources/upload ──────> PDFProcessingService.extract_text (PyMuPDF)
  │                                           ├── Magic byte check (%PDF-)
  │                                           ├── Page-by-page extraction & page numbers
  │                                           └── Scanned / image-only OCR detection
  │
  ├── Step 2: Quiz Configuration
  │     ├── Question Presets (5, 10, 15, 20, 25, 50, Custom)
  │     ├── Difficulty: Easy, Medium, Hard, Mixed
  │     ├── Question Types: MCQ, True/False, Short Answer
  │     └── Per-Question Timer (5s - 90m)
  │
  └── Step 3: Generation Ready Validation
        └── POST /api/quiz/validate-request ──> QuizRequestService.prepare_and_validate
                                                 ├── Authoritative Source ID verification
                                                 └── Typed QuizGenerationRequest contract
```

---

## 5. Security & Isolation Controls

1. **Upload Size Enforcement**: Capped at 15MB via server-side settings.
2. **File Signature Validation**: Validates PDF magic header `%PDF-` rather than trusting client mime-types or filenames.
3. **Scanned PDF Detection**: Identifies image-only or scanned PDFs without text layers and returns explicit OCR notifications.
4. **Filename Sanitization**: Replaces non-alphanumeric characters and prevents path traversal attacks.
5. **Safe Source IDs**: Generates cryptographically safe UUIDs (`src_<12-hex>`) without exposing filesystem paths.
6. **Zero API Key Leakage**: Ollama Cloud credentials remain strictly server-side.

---

## 6. Incremental Roadmap

- **Chunk 1 (Completed)**: Standalone foundation, Next.js frontend, FastAPI backend foundation with `/api/health`.
- **Chunk 2 (Completed)**: High-fidelity Quiz Creator 3-column UI, Question Navigator, Option Editor, Timer Presets, and Preview.
- **Chunk 3 (Completed)**: Quiz Generation Setup Workflow (Step 1-3), Topic/Text/PDF processing via PyMuPDF, authoritative backend validation, and generation-ready contracts.
- **Chunk 4 (Next)**: Nemotron 3 Nano 30B Cloud prompt orchestration, structured JSON quiz generation, and streaming generation.

