import test from "node:test";
import assert from "node:assert/strict";
import {
  formatQuizQuestionsExport,
  formatQuizAnswerKeyExport,
  formatAttemptResultsExport,
  slugifyTitle,
} from "./exportUtils";
import { QuizCreatorState } from "../types/creator";
import { AttemptResultResponse } from "../types/attempt";

function createMockQuiz(): QuizCreatorState {
  return {
    id: "quiz-123",
    title: "Operating Systems Fundamentals",
    questions: [
      {
        id: "q1",
        number: 1,
        text: "What is a deadlock?",
        type: "multiple_choice",
        image: null,
        options: [
          { id: "a", label: "A", text: "A state where processes wait mutually forever" },
          { id: "b", label: "B", text: "A fast memory cache technique" },
        ],
        correctOptionId: "a",
        expectedAnswer: null,
        explanation: "Deadlock occurs when processes hold resources while waiting for each other.",
        difficulty: "hard",
        isComplete: true,
        sources: [{ source_id: "os_book.pdf", page: 42 }],
      },
      {
        id: "q2",
        number: 2,
        text: "What does CPU stand for?",
        type: "short_answer",
        image: null,
        options: [],
        correctOptionId: null,
        expectedAnswer: "Central Processing Unit",
        explanation: "CPU stands for Central Processing Unit.",
        difficulty: "easy",
        isComplete: true,
      },
    ],
    activeQuestionId: "q1",
    specification: {
      exam: "Gate CS",
      subject: "Operating Systems",
      year: "2026",
    },
    timeLimit: {
      enabled: true,
      selectedLabel: "60s",
      secondsPerQuestion: 60,
    },
    hasUnsavedChanges: false,
  };
}

test("formatQuizQuestionsExport scrubs all answer keys and explanations", () => {
  const quiz = createMockQuiz();

  // Markdown
  const md = formatQuizQuestionsExport(quiz, "markdown");
  assert.match(md, /# Operating Systems Fundamentals/);
  assert.match(md, /What is a deadlock\?/);
  assert.match(md, /A state where processes wait mutually forever/);
  assert.match(md, /What does CPU stand for\?/);
  assert.match(md, /Source: os_book\.pdf \(Page 42\)/);

  // MUST NOT leak answers or explanations
  assert.doesNotMatch(md, /Deadlock occurs when processes hold resources/);
  assert.doesNotMatch(md, /Central Processing Unit/);
  assert.doesNotMatch(md, /Correct Answer/i);
  assert.doesNotMatch(md, /Expected Answer/i);

  // Plain Text
  const txt = formatQuizQuestionsExport(quiz, "txt");
  assert.match(txt, /QUIZ: OPERATING SYSTEMS FUNDAMENTALS/);
  assert.match(txt, /Question 1\. What is a deadlock\?/);
  assert.doesNotMatch(txt, /Deadlock occurs when processes hold resources/);
  assert.doesNotMatch(txt, /Central Processing Unit/);
});

test("formatQuizAnswerKeyExport contains full solutions and explanations", () => {
  const quiz = createMockQuiz();

  const md = formatQuizAnswerKeyExport(quiz, "markdown");
  assert.match(md, /# Answer Key: Operating Systems Fundamentals/);
  assert.match(md, /Correct Answer:\*\* Option A: A state where processes wait mutually forever/);
  assert.match(md, /Explanation:\*\* Deadlock occurs when processes hold resources/);
  assert.match(md, /Expected Answer:\*\* Central Processing Unit/);
  assert.match(md, /os_book\.pdf \(Page 42\)/);

  const txt = formatQuizAnswerKeyExport(quiz, "txt");
  assert.match(txt, /ANSWER KEY: OPERATING SYSTEMS FUNDAMENTALS/);
  assert.match(txt, /Correct Answer: Option A/);
  assert.match(txt, /Expected Answer: Central Processing Unit/);
});

test("formatAttemptResultsExport formats full graded report", () => {
  const result: AttemptResultResponse = {
    attempt_id: "att-xyz-987",
    quiz_id: "quiz-123",
    title: "Operating Systems Fundamentals",
    total_questions: 2,
    answered_count: 2,
    unanswered_count: 0,
    correct_count: 2,
    incorrect_count: 0,
    total_score: 2.0,
    max_score: 2.0,
    percentage: 100.0,
    time_spent_seconds: 45,
    is_submitted: true,
    started_at: "2026-10-09T10:00:00Z",
    submitted_at: "2026-10-09T10:00:45Z",
    questions: [
      {
        question_id: "q1",
        number: 1,
        type: "multiple_choice",
        question_text: "What is a deadlock?",
        selected_option_id: "a",
        user_answer_text: "A state where processes wait mutually forever",
        correct_answer_text: "A state where processes wait mutually forever",
        correct_option_id: "a",
        is_correct: true,
        is_unanswered: false,
        score: 1.0,
        max_score: 1.0,
        explanation: "Deadlock is a mutual waiting state.",
        feedback: "Excellent!",
        sources: [{ source_id: "os.pdf", page: 1 }],
      },
    ],
  };

  const md = formatAttemptResultsExport(result, "markdown");
  assert.match(md, /# Quiz Attempt Report: Operating Systems Fundamentals/);
  assert.match(md, /Score Earned:\*\* \*\*2\*\* \/ 2 \(100%\)/);
  assert.match(md, /Time Spent:\*\* 45 seconds/);
  assert.match(md, /Your Answer:\*\* A state where processes wait mutually forever/);
  assert.match(md, /Grading Feedback:\*\* Excellent!/);

  const txt = formatAttemptResultsExport(result, "txt");
  assert.match(txt, /QUIZ ATTEMPT REPORT: OPERATING SYSTEMS FUNDAMENTALS/);
  assert.match(txt, /Score Earned: 2 \/ 2 \(100%\)/);
  assert.match(txt, /Time Spent: 45 seconds/);
});

test("slugifyTitle produces safe url-friendly names", () => {
  assert.equal(slugifyTitle("Hello World! 123"), "hello-world-123");
  assert.equal(slugifyTitle("Python & Data Science"), "python-data-science");
  assert.equal(slugifyTitle("   "), "quiz");
});
