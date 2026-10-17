# QuizForge AI — Live Demo & Presentation Checklist

> A comprehensive, battle-tested guide for presenting QuizForge AI to faculty, evaluators, and technical audiences.

---

## 1. Pre-Demo Setup & Verification

Before the presentation begins, verify all environments and services:

### 1.1 Backend Service Check
- [ ] Open PowerShell in `QuizForge AI/backend`
- [ ] Verify virtual environment is active: `(\.venv)` in prompt
- [ ] Verify `backend/.env` contains your `OLLAMA_API_KEY`
- [ ] Run backend automated tests:
  ```powershell
  .venv\Scripts\python -m pytest -v
  ```
  *(Expected: 57 passed, 1 skipped)*
- [ ] Start the FastAPI server:
  ```powershell
  uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
  ```
- [ ] Verify health status: open [http://localhost:8000/api/health](http://localhost:8000/api/health)
  - Ensure `"ai_service_configured": true` and `"model_target": "nemotron-3-nano:30b-cloud"`

### 1.2 Frontend Application Check
- [ ] Open a second terminal in `QuizForge AI/frontend`
- [ ] Run frontend unit tests:
  ```powershell
  npm test
  ```
  *(Expected: 15 passed, 0 failures)*
- [ ] Run production build verification:
  ```powershell
  npm run build
  ```
  *(Expected: Compiled successfully with 0 errors)*
- [ ] Start development server:
  ```powershell
  npm run dev
  ```
- [ ] Open browser at: [http://localhost:3000](http://localhost:3000)

---

## 2. 7-Minute Live Demo Flow

### Act 1: The Pitch (1 Minute)
1. **The Problem**: Learning from dense textbooks, slides, and lectures is passive and inefficient. Creating high-quality practice quizzes by hand is tedious.
2. **The Solution**: **QuizForge AI — Turn Anything Into a Quiz**.
3. **The Technology**: Full-stack platform pairing Next.js 16 + React 19 frontend with a FastAPI backend, SQLite database persistence, and NVIDIA's **Nemotron 3 Nano 30B Cloud** via Ollama Cloud.

---

### Act 2: Multi-Source AI Generation (2 Minutes)
1. Navigate to the **Quiz Generation Wizard** on the home screen.
2. **Source Demonstration**:
   - **Option A (Topic)**: Enter a topic like `"Photosynthesis and Cellular Respiration"` or `"Python Memory Management"`.
   - **Option B (Text)**: Paste 2-3 paragraphs from a lecture note or article.
   - **Option C (PDF)**: Upload a sample 2-5 page lecture slide handout.
3. Configure target parameters:
   - Target Question Count: `5 Questions`
   - Question Types: `Multiple Choice`, `True/False`, `Short Answer`
   - Difficulty: `Medium`
   - Per-Question Timer: `30 seconds`
4. Click **Generate Quiz with AI**:
   - Point out the active loading state communicating with Ollama Cloud.
   - Explain that Nemotron 3 Nano 30B generates structured, schema-validated questions grounded in the source text.
   - For PDF uploads, note that page citations are strictly checked against actual extracted pages to prevent AI hallucinations.

---

### Act 3: 3-Column Quiz Creator Workspace (1.5 Minutes)
1. The user is handed off directly into the **Quiz Creator**:
   - **Left Column**: Question Navigator showing Question 1 through 5 with green `Complete` badges.
   - **Center Column**: Active Question Editor.
     - Edit a question stem.
     - Change or add an option.
     - Select a new correct answer radio button.
   - **Right Column**: Quiz Specifications (Subject, Exam, Year) and the 24-preset Timer Grid.
2. **Highlight Engineering Polish**:
   - Point to the live **Save Status badge** in the header (`Unsaved changes` -> auto `Saving...` -> `Saved at HH:MM`).
   - Mention the **Unsaved Changes Guard**: try closing or refreshing the tab to demonstrate the native `beforeunload` warning protecting student work.
   - Demonstrate the **Export Menu** directly in the header (Export Questions vs. Export Answer Key).

---

### Act 4: Interactive Quiz-Taking Experience (1.5 Minutes)
1. Click **Take Quiz** (or start from the Saved Library).
2. **Intro Screen**:
   - Displays clean quiz overview, question count, difficulty, subject, and time limit notice.
   - Clarify: *"The timer is strictly per question, preventing students from exhausting their whole exam time on a single prompt."*
3. Click **Start Quiz**:
   - Point out the countdown progress bar.
   - Point out the question navigation palette (answered questions turn purple).
   - Select an option on Question 1, click **Next**.
   - Answer Question 2 (True/False).
   - Type an answer for Question 3 (Short Answer).
   - Intentionally leave Question 4 blank to demonstrate incomplete submission handling.
4. Click **Submit Quiz**:
   - Point out the **Confirmation Modal** highlighting: `"Answered: 3 of 4 | Unanswered: 1"`.
   - Click **Confirm & Submit**.

---

### Act 5: Real-Time Scoring & Answer Review (1 Minute)
1. **Results View**:
   - Instant score card with final percentage and grade tier badge (*Outstanding*, *Good Effort*, or *Needs Review*).
   - Metric pills: Correct, Incorrect, Unanswered, Time Spent.
2. **Export Report**:
   - Click **Export Report** -> Select **Markdown (.md)** or **Plain Text (.txt)**.
   - The report downloads instantly to the student's browser with zero round-trip lag.
3. Click **Review Answers & Explanations**:
   - Filter pills: Click `Incorrect` or `Unanswered` to immediately focus on study weak spots.
   - Inspect Question Breakdown:
     - Student's selected answer vs. Correct Answer.
     - Clear explanation grounded in the original source material.
     - Source page citation.

---

### Act 6: Saved Quiz Library & History (1 Minute)
1. Switch to **Quiz Library**:
   - Point out that all generated quizzes, questions, and past student attempts are **fully persistent** across browser refreshes and server restarts via SQLite & SQLAlchemy 2.x.
2. **Filter & Sort Showcase**:
   - Search bar: Type a keyword to instantly filter.
   - Filter dropdowns: Filter by source (`PDF`, `Topic`, `Text`) or difficulty.
   - Sort dropdown: Toggle between `Recently Updated`, `Title (A-Z)`, `Difficulty`, and `Question Count`.
3. **Attempt History Drawer**:
   - Click the **History** icon on a quiz card.
   - Shows all previous attempts with timestamps, scores, and time taken.
   - Click **Review** on a past attempt: Opens the full review modal to inspect past performance.
   - Click **Export** on an attempt row to download the attempt report.
4. **Quiz Card Export**:
   - Click the **Download** icon on any quiz card.
   - Show that exporting **Questions** strictly scrubs all correct answers and explanations for clean exam printing.
   - Show that exporting **Answer Key** provides the instructor's solution master.

---

## 3. High-Yield Q&A Cheatsheet for Reviewers

### Q1: How does QuizForge AI prevent students from cheating by inspecting the browser network tab?
> **Answer**: During an active taking session, the backend endpoint `POST /api/quizzes/{id}/attempts` sanitizes the question payload on the server. The returned payload strictly scrubs `correct_option_id`, `expected_answer`, and `explanation`. The client-side code never receives the answer keys until the attempt is submitted and scored on the server.

### Q2: How does the AI guarantee factual correctness and prevent hallucinated answers?
> **Answer**: For PDF and study text inputs, the backend passes extracted text as the sole authoritative grounding material. The prompt strictly instructs Nemotron 3 Nano to produce questions solely from this text. Furthermore, our validation engine cross-references generated source page citations against actual parsed PDF page indices; if an AI hallucinates a non-existent page number, it is automatically filtered.

### Q3: How are short answer questions graded without a human teacher?
> **Answer**: Short answers use a resilient hybrid grading model. First, a deterministic keyword overlap and semantic length heuristic checks the student's answer against the model's reference answer. When the backend LLM service is available, it can optionally invoke an evaluation prompt to grade conceptual accuracy with partial credit.

### Q4: Why use SQLite with SQLAlchemy instead of a cloud database like Firebase or MongoDB?
> **Answer**: SQLite with SQLAlchemy 2.x provides zero-configuration, zero-cost, local relational persistence suitable for a desktop/campus environment. By using SQLAlchemy 2.x Declarative Models and Alembic, the backend is decoupled from SQLite and can be migrated to PostgreSQL simply by changing the `DATABASE_URL` environment variable.

### Q5: How is Ollama Cloud authenticated? Does the browser ever see the API key?
> **Answer**: No. All AI communication happens exclusively server-side in `backend/app/services/ollama_service.py` using `Authorization: Bearer <OLLAMA_API_KEY>`. The key is loaded strictly into Python environment memory and is excluded from `.gitignore`, client-side bundles, and API responses.

---

## 4. Emergency Backup Checklist

If demo internet drops or Ollama Cloud is temporarily slow:
- [ ] **Offline Taking & Grading**: The frontend includes built-in offline taking and local scoring fallbacks (`evaluateLocalAttempt`). You can still take, score, review, and export quizzes even without internet.
- [ ] **Pre-Generated Quizzes**: Ensure at least 2 quizzes are already saved in the database before starting the presentation so you can immediately demonstrate taking, library sorting, and exporting without waiting for AI generation.
