import { CreatorQuestion, QuizCreatorState } from "@/types/creator";
import {
  QuizTakingQuestion,
  QuizTakingOption,
  StartAttemptResponse,
  SubmittedAnswer,
  AttemptResultResponse,
  QuestionResultItem,
} from "@/types/attempt";

/**
 * Scrubs a creator question of its correct answer and explanation for safe test-taking.
 */
export function scrubQuestionForTaking(
  q: CreatorQuestion,
  index: number
): QuizTakingQuestion {
  const options: QuizTakingOption[] = q.options.map((opt) => ({
    id: opt.id,
    text: opt.text,
  }));

  return {
    question_id: q.id,
    number: index + 1,
    type: q.type || "multiple_choice",
    question_text: q.text,
    options,
    difficulty: q.difficulty || "medium",
    topic: q.topic || null,
    max_score: 1.0,
  };
}

/**
 * Creates a sanitized StartAttemptResponse from QuizCreatorState.
 * CRITICAL: Excludes all answers and explanations.
 */
export function createTakingSessionFromCreator(
  creatorState: QuizCreatorState
): StartAttemptResponse {
  const takingQuestions = creatorState.questions.map((q, idx) =>
    scrubQuestionForTaking(q, idx)
  );

  return {
    attempt_id: `local_att_${Date.now()}`,
    quiz_id: creatorState.id,
    title: creatorState.title,
    time_limit_enabled: creatorState.timeLimit.enabled,
    time_limit_seconds: creatorState.timeLimit.enabled
      ? creatorState.timeLimit.secondsPerQuestion
      : null,
    total_questions: takingQuestions.length,
    questions: takingQuestions,
    started_at: new Date().toISOString(),
  };
}

/**
 * Prepares a save payload for the backend API from QuizCreatorState.
 */
export function convertCreatorStateToBackendSave(creatorState: QuizCreatorState) {
  const generatedQuestions = creatorState.questions.map((q) => {
    let opts = q.options.map((o) => ({ id: o.id, text: o.text }));
    if (q.type === "short_answer") {
      opts = [];
    }

    return {
      question_id: q.id,
      type: q.type || "multiple_choice",
      question_text: q.text,
      options: opts,
      correct_option_id: q.type === "short_answer" ? null : q.correctOptionId,
      expected_answer: q.type === "short_answer" ? q.expectedAnswer : null,
      explanation: q.explanation || "Detailed curriculum explanation.",
      difficulty: q.difficulty || "medium",
      topic: q.topic || null,
      sources: q.sources || [],
    };
  });

  return {
    quiz_id: creatorState.id,
    title: creatorState.title,
    questions: generatedQuestions,
    settings: {
      difficulty: "medium",
      question_types: Array.from(new Set(creatorState.questions.map((q) => q.type || "multiple_choice"))),
      time_limit_enabled: creatorState.timeLimit.enabled,
      time_limit_seconds: creatorState.timeLimit.enabled ? creatorState.timeLimit.secondsPerQuestion : null,
      subject: creatorState.specification.subject || null,
      exam: creatorState.specification.exam || null,
      academic_year: creatorState.specification.year || null,
    },
    source_metadata: {
      source_id: "draft",
      source_type: "topic",
      title: creatorState.title,
    },
  };
}

/**
 * Evaluates submitted answers deterministically against CreatorState.
 * Used for offline mode or immediate local grading.
 */
export function evaluateLocalAttempt(
  creatorState: QuizCreatorState,
  attemptId: string,
  startedAt: string,
  answers: SubmittedAnswer[],
  timeSpentSeconds?: number
): AttemptResultResponse {
  const answersMap = new Map<string, SubmittedAnswer>();
  for (const ans of answers) {
    answersMap.set(ans.question_id, ans);
  }

  const results: QuestionResultItem[] = [];
  let totalScore = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let answeredCount = 0;
  let unansweredCount = 0;

  creatorState.questions.forEach((q, idx) => {
    const sub = answersMap.get(q.id);
    let hasAnswer = false;

    if (sub) {
      if (q.type === "short_answer") {
        hasAnswer = !!sub.text_answer && sub.text_answer.trim().length > 0;
      } else {
        hasAnswer = !!sub.selected_option_id && sub.selected_option_id.trim().length > 0;
      }
    }

    if (!hasAnswer) {
      unansweredCount += 1;
      incorrectCount += 1;

      let correctText = "";
      if (q.type === "short_answer") {
        correctText = q.expectedAnswer || "Expected answer omitted.";
      } else {
        const opt = q.options.find((o) => o.id === q.correctOptionId);
        correctText = opt ? opt.text : q.correctOptionId || "";
      }

      results.push({
        question_id: q.id,
        number: idx + 1,
        type: q.type || "multiple_choice",
        question_text: q.text,
        selected_option_id: null,
        user_answer_text: null,
        correct_answer_text: correctText,
        correct_option_id: q.correctOptionId,
        is_correct: false,
        is_unanswered: true,
        score: 0.0,
        max_score: 1.0,
        explanation: q.explanation || "No explanation provided.",
        feedback: "Question was left unanswered.",
        sources: q.sources,
      });
      return;
    }

    answeredCount += 1;

    if (q.type === "short_answer") {
      const userText = sub?.text_answer?.trim() || "";
      const expectedText = q.expectedAnswer?.trim() || "";

      // Heuristic token overlap
      const stopWords = new Set(["a", "an", "the", "in", "on", "at", "to", "for", "of", "and", "or", "is", "are"]);
      const tokenize = (str: string) =>
        new Set(
          str
            .toLowerCase()
            .split(/\W+/)
            .filter((w) => w.length > 2 && !stopWords.has(w))
        );

      const userTokens = tokenize(userText);
      const expectedTokens = tokenize(expectedText);

      let overlapCount = 0;
      for (const t of userTokens) {
        if (expectedTokens.has(t)) overlapCount++;
      }

      const ratio = expectedTokens.size > 0 ? overlapCount / expectedTokens.size : 1.0;
      let score = 0.0;
      let feedback = "";

      if (ratio >= 0.5) {
        score = 1.0;
        feedback = "Excellent response covering key concepts.";
      } else if (ratio >= 0.25) {
        score = 0.5;
        feedback = "Partially correct. Captures some core terminology.";
      } else {
        score = 0.0;
        feedback = "Answer does not adequately match the expected concepts.";
      }

      const isCorrect = score >= 0.5;
      if (isCorrect) correctCount += 1;
      else incorrectCount += 1;
      totalScore += score;

      results.push({
        question_id: q.id,
        number: idx + 1,
        type: "short_answer",
        question_text: q.text,
        selected_option_id: null,
        user_answer_text: userText,
        correct_answer_text: expectedText,
        correct_option_id: null,
        is_correct: isCorrect,
        is_unanswered: false,
        score,
        max_score: 1.0,
        explanation: q.explanation,
        feedback,
        sources: q.sources,
      });
    } else {
      // Multiple Choice or True/False
      const selId = sub?.selected_option_id || "";
      const corrId = q.correctOptionId || "";
      const isCorrect = selId.toLowerCase() === corrId.toLowerCase();

      const selOpt = q.options.find((o) => o.id === selId);
      const corrOpt = q.options.find((o) => o.id === corrId);

      const userText = selOpt ? selOpt.text : selId;
      const corrText = corrOpt ? corrOpt.text : corrId;

      const score = isCorrect ? 1.0 : 0.0;
      if (isCorrect) {
        correctCount += 1;
        totalScore += 1.0;
      } else {
        incorrectCount += 1;
      }

      results.push({
        question_id: q.id,
        number: idx + 1,
        type: q.type || "multiple_choice",
        question_text: q.text,
        selected_option_id: selId,
        user_answer_text: userText,
        correct_answer_text: corrText,
        correct_option_id: corrId,
        is_correct: isCorrect,
        is_unanswered: false,
        score,
        max_score: 1.0,
        explanation: q.explanation,
        feedback: isCorrect ? "Correct answer!" : `Incorrect. The correct answer is: ${corrText}.`,
        sources: q.sources,
      });
    }
  });

  const maxScore = creatorState.questions.length;
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 1000) / 10 : 0;

  return {
    attempt_id: attemptId,
    quiz_id: creatorState.id,
    title: creatorState.title,
    total_questions: maxScore,
    answered_count: answeredCount,
    unanswered_count: unansweredCount,
    correct_count: correctCount,
    incorrect_count: incorrectCount,
    total_score: Math.round(totalScore * 10) / 10,
    max_score: maxScore,
    percentage,
    time_spent_seconds: timeSpentSeconds,
    is_submitted: true,
    started_at: startedAt,
    submitted_at: new Date().toISOString(),
    questions: results,
  };
}

export function formatTimeRemaining(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export function formatTimeSpent(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}
