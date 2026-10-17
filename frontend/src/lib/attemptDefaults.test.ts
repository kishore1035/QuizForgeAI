import test from "node:test";
import assert from "node:assert/strict";
import {
  scrubQuestionForTaking,
  createTakingSessionFromCreator,
  evaluateLocalAttempt,
  formatTimeRemaining,
  formatTimeSpent,
} from "./attemptDefaults";
import { CreatorQuestion, QuizCreatorState } from "../types/creator";
import { SubmittedAnswer } from "../types/attempt";

test("scrubQuestionForTaking protects answer keys and explanations", () => {
  const secretQuestion: CreatorQuestion = {
    id: "q-sec-1",
    number: 1,
    text: "What is an algorithm?",
    type: "multiple_choice",
    options: [
      { id: "a", label: "A", text: "A step-by-step procedure" },
      { id: "b", label: "B", text: "A programming language" },
    ],
    correctOptionId: "a",
    expectedAnswer: "Secret answer text",
    explanation: "Secret explanation details",
    isComplete: true,
  };

  const scrubbed = scrubQuestionForTaking(secretQuestion, 0);

  assert.equal(scrubbed.question_id, "q-sec-1");
  assert.equal(scrubbed.number, 1);
  assert.equal(scrubbed.question_text, "What is an algorithm?");
  assert.equal((scrubbed as any).correct_option_id, undefined);
  assert.equal((scrubbed as any).expected_answer, undefined);
  assert.equal((scrubbed as any).explanation, undefined);
  assert.equal(scrubbed.options.length, 2);
  assert.equal((scrubbed.options[0] as any).is_correct, undefined);
});

test("createTakingSessionFromCreator creates a valid sanitized session", () => {
  const mockQuiz: QuizCreatorState = {
    id: "quiz-test-1",
    title: "Networking 101",
    questions: [
      {
        id: "q1",
        number: 1,
        text: "HTTP operates at what layer?",
        type: "multiple_choice",
        options: [
          { id: "a", label: "A", text: "Application" },
          { id: "b", label: "B", text: "Transport" },
        ],
        correctOptionId: "a",
        explanation: "Application layer",
        isComplete: true,
      },
    ],
    activeQuestionId: "q1",
    specification: { exam: "Midterm", subject: "Networks", year: "2026" },
    timeLimit: { enabled: true, selectedLabel: "45s", secondsPerQuestion: 45 },
    hasUnsavedChanges: false,
  };

  const session = createTakingSessionFromCreator(mockQuiz);

  assert.equal(session.quiz_id, "quiz-test-1");
  assert.equal(session.title, "Networking 101");
  assert.equal(session.time_limit_enabled, true);
  assert.equal(session.time_limit_seconds, 45);
  assert.equal(session.total_questions, 1);
  assert.equal(session.questions.length, 1);
  assert.equal((session.questions[0] as any).correct_option_id, undefined);
});

test("evaluateLocalAttempt scores MCQ, True/False, and Unanswered questions accurately", () => {
  const mockQuiz: QuizCreatorState = {
    id: "quiz-score-1",
    title: "Science Quiz",
    questions: [
      {
        id: "q1",
        number: 1,
        text: "Water is composed of hydrogen and oxygen.",
        type: "true_false",
        options: [
          { id: "a", label: "True", text: "True" },
          { id: "b", label: "False", text: "False" },
        ],
        correctOptionId: "a",
        explanation: "H2O is water.",
        isComplete: true,
      },
      {
        id: "q2",
        number: 2,
        text: "What is the speed of light in vacuum?",
        type: "multiple_choice",
        options: [
          { id: "a", label: "A", text: "300,000 km/s" },
          { id: "b", label: "B", text: "150,000 km/s" },
        ],
        correctOptionId: "a",
        explanation: "Approx 300,000 km/s.",
        isComplete: true,
      },
      {
        id: "q3",
        number: 3,
        text: "Which planet is closest to the Sun?",
        type: "multiple_choice",
        options: [
          { id: "a", label: "A", text: "Mercury" },
          { id: "b", label: "B", text: "Venus" },
        ],
        correctOptionId: "a",
        explanation: "Mercury is closest.",
        isComplete: true,
      },
    ],
    activeQuestionId: "q1",
    specification: { exam: "", subject: "", year: "" },
    timeLimit: { enabled: false, selectedLabel: "Untimed", secondsPerQuestion: 0 },
    hasUnsavedChanges: false,
  };

  const answers: SubmittedAnswer[] = [
    { question_id: "q1", selected_option_id: "a" }, // Correct (+1.0)
    { question_id: "q2", selected_option_id: "b" }, // Incorrect (+0.0)
    // q3 left unanswered
  ];

  const result = evaluateLocalAttempt(mockQuiz, "att-1", new Date().toISOString(), answers, 42);

  assert.equal(result.total_questions, 3);
  assert.equal(result.answered_count, 2);
  assert.equal(result.unanswered_count, 1);
  assert.equal(result.correct_count, 1);
  assert.equal(result.incorrect_count, 2);
  assert.equal(result.total_score, 1.0);
  assert.equal(result.max_score, 3.0);
  assert.equal(result.percentage, 33.3);
  assert.equal(result.time_spent_seconds, 42);

  const q3Res = result.questions.find((q) => q.question_id === "q3");
  assert.ok(q3Res);
  assert.equal(q3Res?.is_unanswered, true);
  assert.equal(q3Res?.score, 0.0);
});

test("evaluateLocalAttempt scores short answer with keyword overlap fallback", () => {
  const mockQuiz: QuizCreatorState = {
    id: "quiz-sa-1",
    title: "Biology",
    questions: [
      {
        id: "q1",
        number: 1,
        text: "What is photosynthesis?",
        type: "short_answer",
        options: [],
        correctOptionId: null,
        expectedAnswer: "Photosynthesis is the process by which green plants synthesize nutrients from carbon dioxide and water using sunlight and chlorophyll.",
        explanation: "Converts light energy into chemical energy.",
        isComplete: true,
      },
    ],
    activeQuestionId: "q1",
    specification: { exam: "", subject: "", year: "" },
    timeLimit: { enabled: false, selectedLabel: "", secondsPerQuestion: 0 },
    hasUnsavedChanges: false,
  };

  const answers: SubmittedAnswer[] = [
    {
      question_id: "q1",
      text_answer: "Photosynthesis is the process plants synthesize nutrients using sunlight carbon dioxide and water.",
    },
  ];

  const result = evaluateLocalAttempt(mockQuiz, "att-sa", new Date().toISOString(), answers, 20);

  assert.equal(result.total_questions, 1);
  assert.equal(result.answered_count, 1);
  assert.equal(result.correct_count, 1);
  assert.equal(result.total_score, 1.0);
  assert.equal(result.percentage, 100.0);
});

test("formatTimeRemaining and formatTimeSpent format time accurately", () => {
  assert.equal(formatTimeRemaining(30), "0:30");
  assert.equal(formatTimeRemaining(5), "0:05");
  assert.equal(formatTimeRemaining(75), "1:15");
  assert.equal(formatTimeRemaining(0), "0:00");

  assert.equal(formatTimeSpent(45), "45s");
  assert.equal(formatTimeSpent(60), "1m");
  assert.equal(formatTimeSpent(95), "1m 35s");
  assert.equal(formatTimeSpent(undefined), "0s");
});
