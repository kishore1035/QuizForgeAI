import test from "node:test";
import assert from "node:assert/strict";
import {
  convertGeneratedQuizToCreatorState,
  convertCreatorStateToSavePayload,
  checkQuestionCompletion,
  createNewQuestion,
  createInitialQuizState,
} from "./quizDefaults";
import { GeneratedQuizResponse } from "../types/api";
import { CreatorQuestion } from "../types/creator";

test("checkQuestionCompletion validates multiple choice questions", () => {
  const mcq: CreatorQuestion = {
    id: "q1",
    number: 1,
    text: "What is the powerhouse of the cell?",
    type: "multiple_choice",
    options: [
      { id: "a", label: "A", text: "Mitochondria" },
      { id: "b", label: "B", text: "Ribosome" },
    ],
    correctOptionId: "a",
    explanation: "Mitochondria produce ATP.",
    isComplete: false,
  };

  assert.equal(checkQuestionCompletion(mcq), true);

  // Incomplete if text is empty
  const blankText = { ...mcq, text: "   " };
  assert.equal(checkQuestionCompletion(blankText), false);

  // Incomplete if no correct option selected
  const noCorrect = { ...mcq, correctOptionId: null };
  assert.equal(checkQuestionCompletion(noCorrect), false);

  // Incomplete if correct option text is blank
  const blankCorrect = {
    ...mcq,
    options: [
      { id: "a", label: "A", text: "" },
      { id: "b", label: "B", text: "Ribosome" },
    ],
  };
  assert.equal(checkQuestionCompletion(blankCorrect), false);
});

test("checkQuestionCompletion validates true/false questions", () => {
  const tf: CreatorQuestion = {
    id: "q2",
    number: 2,
    text: "The Earth revolves around the Sun.",
    type: "true_false",
    options: [
      { id: "a", label: "True", text: "True" },
      { id: "b", label: "False", text: "False" },
    ],
    correctOptionId: "a",
    explanation: "Heliocentric model.",
    isComplete: false,
  };

  assert.equal(checkQuestionCompletion(tf), true);

  // Incomplete if no answer selected
  const unselected = { ...tf, correctOptionId: null };
  assert.equal(checkQuestionCompletion(unselected), false);
});

test("checkQuestionCompletion validates short answer questions", () => {
  const sa: CreatorQuestion = {
    id: "q3",
    number: 3,
    text: "What is the capital of France?",
    type: "short_answer",
    options: [],
    correctOptionId: null,
    expectedAnswer: "Paris",
    explanation: "Paris is France's capital city.",
    isComplete: false,
  };

  assert.equal(checkQuestionCompletion(sa), true);

  // Incomplete if expected answer is missing or blank
  const noExpected = { ...sa, expectedAnswer: "" };
  assert.equal(checkQuestionCompletion(noExpected), false);

  const whitespaceExpected = { ...sa, expectedAnswer: "   " };
  assert.equal(checkQuestionCompletion(whitespaceExpected), false);
});

test("convertGeneratedQuizToCreatorState correctly transforms Nemotron AI response", () => {
  const sampleGeneratedQuiz: GeneratedQuizResponse = {
    quiz_id: "quiz_test_123",
    title: "Cell Biology & Energy Quiz",
    status: "generated",
    question_count: 3,
    settings: {
      difficulty: "medium",
      question_types: ["multiple_choice", "true_false", "short_answer"],
      time_limit_enabled: true,
      time_limit_seconds: 45,
      subject: "Cell Biology",
      exam: "AP Biology",
      academic_year: "2026",
    },
    source_metadata: {
      source_id: "src_abc123",
      source_type: "pdf",
      title: "Cell Biology Chapter 4",
      filename: "biology_ch4.pdf",
      page_count: 5,
      word_count: 1200,
    },
    created_at: "2026-10-09T07:00:00Z",
    questions: [
      {
        question_id: "q1",
        type: "multiple_choice",
        question_text: "What molecule is the primary cellular energy currency?",
        options: [
          { id: "a", text: "ATP" },
          { id: "b", text: "DNA" },
          { id: "c", text: "RNA" },
          { id: "d", text: "Lipid" },
        ],
        correct_option_id: "a",
        expected_answer: null,
        explanation: "ATP stores and transports chemical energy.",
        difficulty: "easy",
        topic: "Energy",
        sources: [{ source_id: "src_abc123", page: 2 }],
      },
      {
        question_id: "q2",
        type: "true_false",
        question_text: "Glycolysis requires oxygen to proceed.",
        options: [
          { id: "a", text: "True" },
          { id: "b", text: "False" },
        ],
        correct_option_id: "b",
        expected_answer: null,
        explanation: "Glycolysis is an anaerobic pathway.",
        difficulty: "medium",
        topic: "Respiration",
        sources: [{ source_id: "src_abc123", page: 4 }],
      },
      {
        question_id: "q3",
        type: "short_answer",
        question_text: "Name the organelle where oxidative phosphorylation takes place.",
        options: [],
        correct_option_id: null,
        expected_answer: "Mitochondria",
        explanation: "Oxidative phosphorylation occurs at the inner mitochondrial membrane.",
        difficulty: "hard",
        topic: "Organelles",
        sources: [{ source_id: "src_abc123", page: 3 }],
      },
    ],
  };

  const creatorState = convertGeneratedQuizToCreatorState(sampleGeneratedQuiz);

  // Verification of quiz metadata
  assert.equal(creatorState.id, "quiz_test_123");
  assert.equal(creatorState.title, "Cell Biology & Energy Quiz");
  assert.equal(creatorState.hasUnsavedChanges, false);

  // Verification of specifications preservation
  assert.equal(creatorState.specification.subject, "Cell Biology");
  assert.equal(creatorState.specification.exam, "AP Biology");
  assert.equal(creatorState.specification.year, "2026");

  // Verification of timer preservation
  assert.equal(creatorState.timeLimit.enabled, true);
  assert.equal(creatorState.timeLimit.secondsPerQuestion, 45);
  assert.equal(creatorState.timeLimit.selectedLabel, "45s");

  // Verification of questions
  assert.equal(creatorState.questions.length, 3);
  assert.equal(creatorState.activeQuestionId, "q1");

  // Question 1 (MCQ)
  const q1 = creatorState.questions[0];
  assert.equal(q1.id, "q1");
  assert.equal(q1.number, 1);
  assert.equal(q1.type, "multiple_choice");
  assert.equal(q1.options.length, 4);
  assert.equal(q1.options[0].label, "A");
  assert.equal(q1.options[0].text, "ATP");
  assert.equal(q1.correctOptionId, "a");
  assert.equal(q1.isComplete, true);
  assert.deepEqual(q1.sources, [{ source_id: "src_abc123", page: 2 }]);

  // Question 2 (True/False)
  const q2 = creatorState.questions[1];
  assert.equal(q2.id, "q2");
  assert.equal(q2.number, 2);
  assert.equal(q2.type, "true_false");
  assert.equal(q2.options.length, 2);
  assert.equal(q2.options[0].text, "True");
  assert.equal(q2.options[1].text, "False");
  assert.equal(q2.correctOptionId, "b");
  assert.equal(q2.isComplete, true);

  // Question 3 (Short Answer)
  const q3 = creatorState.questions[2];
  assert.equal(q3.id, "q3");
  assert.equal(q3.number, 3);
  assert.equal(q3.type, "short_answer");
  assert.equal(q3.options.length, 0);
  assert.equal(q3.expectedAnswer, "Mitochondria");
  assert.equal(q3.isComplete, true);
});

test("question editing preserves completeness and state integrity", () => {
  const q = createNewQuestion(1);
  assert.equal(q.isComplete, false);

  // Fill question text
  q.text = "What is 2 + 2?";
  q.options[0].text = "3";
  q.options[1].text = "4";
  q.correctOptionId = q.options[1].id;

  assert.equal(checkQuestionCompletion(q), true);

  // Deselect answer
  q.correctOptionId = null;
  assert.equal(checkQuestionCompletion(q), false);
});

test("convertCreatorStateToSavePayload produces valid backend persistence payload", () => {
  const state = createInitialQuizState();
  state.title = "Physics 101";
  state.specification.subject = "Physics";
  state.specification.exam = "AP Physics";
  state.specification.year = "2026";
  state.timeLimit.enabled = true;
  state.timeLimit.secondsPerQuestion = 45;

  state.questions = [
    {
      id: "q_1",
      number: 1,
      text: "What is velocity?",
      type: "multiple_choice",
      image: null,
      options: [
        { id: "a", label: "A", text: "Rate of change of position" },
        { id: "b", label: "B", text: "Speed" },
      ],
      correctOptionId: "a",
      expectedAnswer: null,
      explanation: "Velocity is displacement over time.",
      difficulty: "easy",
      isComplete: true,
    },
  ];

  const payload = convertCreatorStateToSavePayload(state);
  assert.equal(payload.title, "Physics 101");
  assert.equal(payload.subject, "Physics");
  assert.equal(payload.exam, "AP Physics");
  assert.equal(payload.academic_year, "2026");
  assert.equal(payload.time_limit_enabled, true);
  assert.equal(payload.time_limit_seconds, 45);
  assert.equal(payload.questions.length, 1);
  assert.equal(payload.questions[0].question_text, "What is velocity?");
  assert.equal(payload.questions[0].correct_option_id, "a");
  assert.equal(payload.questions[0].options.length, 2);
});

