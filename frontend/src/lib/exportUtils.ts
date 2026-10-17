import { QuizCreatorState, CreatorQuestion } from "@/types/creator";
import { GeneratedQuizResponse, GeneratedQuestion } from "@/types/api";
import { AttemptResultResponse } from "@/types/attempt";

/**
 * Triggers a browser file download using a Blob.
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string = "text/markdown;charset=utf-8"
): void {
  if (typeof window === "undefined") return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generates a clean filename slug.
 */
export function slugifyTitle(title: string, fallback: string = "quiz"): string {
  const cleaned = (title || "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[-\s]+/g, "-");
  return cleaned.slice(0, 40) || fallback;
}

interface NormalizedQuizData {
  title: string;
  subject?: string;
  exam?: string;
  academicYear?: string;
  difficulty?: string;
  timeLimitEnabled?: boolean;
  timeLimitSeconds?: number;
  questions: Array<{
    number: number;
    text: string;
    type: string;
    options: Array<{ id: string; text: string }>;
    correctOptionId?: string | null;
    expectedAnswer?: string | null;
    explanation?: string;
    sources?: Array<{ source_id: string; page?: number }>;
  }>;
}

function normalizeQuizInput(
  quiz: QuizCreatorState | GeneratedQuizResponse
): NormalizedQuizData {
  if ("specification" in quiz) {
    // QuizCreatorState
    return {
      title: quiz.title || "Untitled Quiz",
      subject: quiz.specification.subject || undefined,
      exam: quiz.specification.exam || undefined,
      academicYear: quiz.specification.year || undefined,
      difficulty: quiz.questions[0]?.difficulty || "medium",
      timeLimitEnabled: quiz.timeLimit.enabled,
      timeLimitSeconds: quiz.timeLimit.secondsPerQuestion,
      questions: quiz.questions.map((q, idx) => ({
        number: idx + 1,
        text: q.text,
        type: q.type || "multiple_choice",
        options: q.options.map((o) => ({ id: o.id, text: o.text })),
        correctOptionId: q.correctOptionId,
        expectedAnswer: q.expectedAnswer,
        explanation: q.explanation,
        sources: q.sources,
      })),
    };
  } else {
    // GeneratedQuizResponse
    return {
      title: quiz.title || "Untitled Quiz",
      subject: quiz.settings.subject || undefined,
      exam: quiz.settings.exam || undefined,
      academicYear: quiz.settings.academic_year || undefined,
      difficulty: quiz.settings.difficulty,
      timeLimitEnabled: quiz.settings.time_limit_enabled,
      timeLimitSeconds: quiz.settings.time_limit_seconds || undefined,
      questions: quiz.questions.map((q, idx) => ({
        number: idx + 1,
        text: q.question_text,
        type: q.type,
        options: q.options.map((o) => ({ id: o.id, text: o.text })),
        correctOptionId: q.correct_option_id,
        expectedAnswer: q.expected_answer,
        explanation: q.explanation,
        sources: q.sources,
      })),
    };
  }
}

/**
 * 1. Export Quiz Questions (STUDENT-FACING: NO ANSWERS OR EXPLANATIONS)
 */
export function formatQuizQuestionsExport(
  quizInput: QuizCreatorState | GeneratedQuizResponse,
  format: "markdown" | "txt" = "markdown"
): string {
  const quiz = normalizeQuizInput(quizInput);
  const isMd = format === "markdown";
  const lines: string[] = [];

  if (isMd) {
    lines.push(`# ${quiz.title}\n`);
    const meta: string[] = [];
    if (quiz.subject) meta.push(`**Subject:** ${quiz.subject}`);
    if (quiz.exam) meta.push(`**Exam:** ${quiz.exam}`);
    if (quiz.academicYear) meta.push(`**Year:** ${quiz.academicYear}`);
    if (quiz.difficulty) meta.push(`**Difficulty:** ${quiz.difficulty.toUpperCase()}`);
    meta.push(`**Questions:** ${quiz.questions.length}`);
    if (quiz.timeLimitEnabled && quiz.timeLimitSeconds) {
      meta.push(`**Time Limit:** ${quiz.timeLimitSeconds}s per question`);
    }
    lines.push(meta.join(" | "));
    lines.push("\n---\n");
    lines.push("### Instructions\nAnswer all questions below. For multiple-choice questions, select the single best option.\n");
  } else {
    const sep = "=".repeat(60);
    lines.push(sep);
    lines.push(`QUIZ: ${quiz.title.toUpperCase()}`);
    lines.push(sep);
    if (quiz.subject) lines.push(`Subject: ${quiz.subject}`);
    if (quiz.exam) lines.push(`Exam: ${quiz.exam}`);
    if (quiz.academicYear) lines.push(`Year: ${quiz.academicYear}`);
    if (quiz.difficulty) lines.push(`Difficulty: ${quiz.difficulty.toUpperCase()}`);
    lines.push(`Total Questions: ${quiz.questions.length}`);
    if (quiz.timeLimitEnabled && quiz.timeLimitSeconds) {
      lines.push(`Time Limit: ${quiz.timeLimitSeconds}s per question`);
    }
    lines.push("-".repeat(60));
    lines.push("INSTRUCTIONS: Answer all questions below.\n");
  }

  quiz.questions.forEach((q) => {
    if (isMd) {
      lines.push(`#### Question ${q.number}`);
      lines.push(`${q.text}\n`);
    } else {
      lines.push(`Question ${q.number}. ${q.text}\n`);
    }

    if (q.type === "short_answer") {
      if (isMd) {
        lines.push("*Your Answer:*\n\n_________________________________________________\n");
      } else {
        lines.push("Your Answer:\n_________________________________________________\n");
      }
    } else {
      q.options.forEach((opt, optIdx) => {
        const label = opt.id.length <= 2 ? opt.id.toUpperCase() : String.fromCharCode(65 + optIdx);
        if (isMd) {
          lines.push(`- **${label}.** ${opt.text}`);
        } else {
          lines.push(`   ${label}. ${opt.text}`);
        }
      });
      lines.push("");
    }

    // Source reference if available (scrubs any answer leaks)
    if (q.sources && q.sources.length > 0) {
      const srcStr = q.sources
        .map((s) => (s.page ? `Source: ${s.source_id} (Page ${s.page})` : `Source: ${s.source_id}`))
        .join(", ");
      if (isMd) {
        lines.push(`\n> *Reference:* ${srcStr}\n`);
      } else {
        lines.push(`   [Reference: ${srcStr}]\n`);
      }
    }

    if (isMd) lines.push("");
  });

  return lines.join("\n").trim() + "\n";
}

/**
 * 2. Export Quiz Answer Key (EXPLICIT SEPARATE SOLUTION DOCUMENT)
 */
export function formatQuizAnswerKeyExport(
  quizInput: QuizCreatorState | GeneratedQuizResponse,
  format: "markdown" | "txt" = "markdown"
): string {
  const quiz = normalizeQuizInput(quizInput);
  const isMd = format === "markdown";
  const lines: string[] = [];

  if (isMd) {
    lines.push(`# Answer Key: ${quiz.title}\n`);
    const meta: string[] = [];
    if (quiz.subject) meta.push(`**Subject:** ${quiz.subject}`);
    if (quiz.exam) meta.push(`**Exam:** ${quiz.exam}`);
    meta.push(`**Total Questions:** ${quiz.questions.length}`);
    lines.push(meta.join(" | "));
    lines.push("\n---\n");
    lines.push("### Official Solutions & Explanations\n");
  } else {
    const sep = "=".repeat(60);
    lines.push(sep);
    lines.push(`ANSWER KEY: ${quiz.title.toUpperCase()}`);
    lines.push(sep);
    if (quiz.subject) lines.push(`Subject: ${quiz.subject}`);
    if (quiz.exam) lines.push(`Exam: ${quiz.exam}`);
    lines.push(`Total Questions: ${quiz.questions.length}`);
    lines.push("-".repeat(60));
    lines.push("OFFICIAL SOLUTIONS & EXPLANATIONS\n");
  }

  quiz.questions.forEach((q) => {
    if (isMd) {
      lines.push(`#### Question ${q.number}. ${q.text}`);
    } else {
      lines.push(`Question ${q.number}. ${q.text}`);
    }

    if (q.type === "short_answer") {
      const expected = q.expectedAnswer || "(Answer not specified)";
      if (isMd) {
        lines.push(`- **Expected Answer:** ${expected}`);
      } else {
        lines.push(`   Expected Answer: ${expected}`);
      }
    } else {
      const corrId = (q.correctOptionId || "").toLowerCase();
      const match = q.options.find((o) => o.id.toLowerCase() === corrId);
      const ansText = match
        ? `Option ${match.id.toUpperCase()}: ${match.text}`
        : `Option ${corrId.toUpperCase()}`;
      if (isMd) {
        lines.push(`- **Correct Answer:** ${ansText}`);
      } else {
        lines.push(`   Correct Answer: ${ansText}`);
      }
    }

    const expl = q.explanation || "No explanation provided.";
    if (isMd) {
      lines.push(`- **Explanation:** ${expl}`);
    } else {
      lines.push(`   Explanation: ${expl}`);
    }

    if (q.sources && q.sources.length > 0) {
      const srcStr = q.sources
        .map((s) => (s.page ? `${s.source_id} (Page ${s.page})` : s.source_id))
        .join(", ");
      if (isMd) {
        lines.push(`- **Source Reference:** ${srcStr}`);
      } else {
        lines.push(`   Source Reference: ${srcStr}`);
      }
    }

    lines.push(isMd ? "\n" : "");
  });

  return lines.join("\n").trim() + "\n";
}

/**
 * 3. Export Attempt Results Report
 */
export function formatAttemptResultsExport(
  result: AttemptResultResponse,
  format: "markdown" | "txt" = "markdown"
): string {
  const isMd = format === "markdown";
  const lines: string[] = [];
  const dateStr = result.submitted_at || result.started_at;
  const timeTaken =
    result.time_spent_seconds !== null && result.time_spent_seconds !== undefined
      ? `${result.time_spent_seconds} seconds`
      : "Not recorded";

  if (isMd) {
    lines.push(`# Quiz Attempt Report: ${result.title}\n`);
    lines.push(`**Attempt ID:** \`${result.attempt_id}\` | **Date:** ${dateStr}\n`);
    lines.push("### Performance Summary\n");
    lines.push(`- **Score Earned:** **${result.total_score}** / ${result.max_score} (${result.percentage}%)`);
    lines.push(`- **Total Questions:** ${result.total_questions}`);
    lines.push(`- **Answered:** ${result.answered_count} | **Unanswered:** ${result.unanswered_count}`);
    lines.push(`- **Correct:** ${result.correct_count} | **Incorrect:** ${result.incorrect_count}`);
    lines.push(`- **Time Spent:** ${timeTaken}`);
    lines.push("\n---\n");
    lines.push("### Question-by-Question Breakdown\n");
  } else {
    const sep = "=".repeat(60);
    lines.push(sep);
    lines.push(`QUIZ ATTEMPT REPORT: ${result.title.toUpperCase()}`);
    lines.push(sep);
    lines.push(`Attempt ID: ${result.attempt_id}`);
    lines.push(`Date: ${dateStr}`);
    lines.push(`Score Earned: ${result.total_score} / ${result.max_score} (${result.percentage}%)`);
    lines.push(`Total Questions: ${result.total_questions}`);
    lines.push(`Answered: ${result.answered_count} | Unanswered: ${result.unanswered_count}`);
    lines.push(`Correct: ${result.correct_count} | Incorrect: ${result.incorrect_count}`);
    lines.push(`Time Spent: ${timeTaken}`);
    lines.push("-".repeat(60));
    lines.push("QUESTION-BY-QUESTION BREAKDOWN\n");
  }

  result.questions.forEach((q, idx) => {
    const status = q.is_correct ? "CORRECT" : q.is_unanswered ? "UNANSWERED" : "INCORRECT";
    const scoreBadge = `${q.score}/${q.max_score} pts`;

    if (isMd) {
      lines.push(`#### Question ${idx + 1} \`[${status}]\` (${scoreBadge})`);
      lines.push(`${q.question_text}\n`);
      lines.push(`- **Your Answer:** ${q.user_answer_text || "(No answer provided)"}`);
      lines.push(`- **Correct Answer:** ${q.correct_answer_text}`);
      if (q.feedback) lines.push(`- **Grading Feedback:** ${q.feedback}`);
      if (q.explanation) lines.push(`- **Explanation:** ${q.explanation}`);
      if (q.sources && q.sources.length > 0) {
        const srcs = q.sources.map((s) => (s.page ? `${s.source_id} (p. ${s.page})` : s.source_id));
        lines.push(`- **Source Reference:** ${srcs.join(", ")}`);
      }
      lines.push("");
    } else {
      lines.push(`Question ${idx + 1} [${status}] (${scoreBadge})`);
      lines.push(`${q.question_text}`);
      lines.push(`   Your Answer: ${q.user_answer_text || "(No answer provided)"}`);
      lines.push(`   Correct Answer: ${q.correct_answer_text}`);
      if (q.feedback) lines.push(`   Grading Feedback: ${q.feedback}`);
      if (q.explanation) lines.push(`   Explanation: ${q.explanation}`);
      if (q.sources && q.sources.length > 0) {
        const srcs = q.sources.map((s) => (s.page ? `${s.source_id} (p. ${s.page})` : s.source_id));
        lines.push(`   Source Reference: ${srcs.join(", ")}`);
      }
      lines.push("");
    }
  });

  return lines.join("\n").trim() + "\n";
}

/**
 * Convenience helper to download Quiz Questions
 */
export function downloadQuizQuestions(
  quiz: QuizCreatorState | GeneratedQuizResponse,
  format: "markdown" | "txt" = "markdown"
): void {
  const content = formatQuizQuestionsExport(quiz, format);
  const slug = slugifyTitle("specification" in quiz ? quiz.title : quiz.title, "quiz");
  const ext = format === "markdown" ? "md" : "txt";
  const mime = format === "markdown" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8";
  downloadFile(content, `${slug}-questions.${ext}`, mime);
}

/**
 * Convenience helper to download Answer Key
 */
export function downloadQuizAnswerKey(
  quiz: QuizCreatorState | GeneratedQuizResponse,
  format: "markdown" | "txt" = "markdown"
): void {
  const content = formatQuizAnswerKeyExport(quiz, format);
  const slug = slugifyTitle("specification" in quiz ? quiz.title : quiz.title, "quiz");
  const ext = format === "markdown" ? "md" : "txt";
  const mime = format === "markdown" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8";
  downloadFile(content, `${slug}-answer-key.${ext}`, mime);
}

/**
 * Convenience helper to download Attempt Report
 */
export function downloadAttemptReport(
  result: AttemptResultResponse,
  format: "markdown" | "txt" = "markdown"
): void {
  const content = formatAttemptResultsExport(result, format);
  const slug = slugifyTitle(result.title, "quiz");
  const ext = format === "markdown" ? "md" : "txt";
  const mime = format === "markdown" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8";
  downloadFile(content, `${slug}-attempt-${result.attempt_id.slice(0, 8)}-report.${ext}`, mime);
}
