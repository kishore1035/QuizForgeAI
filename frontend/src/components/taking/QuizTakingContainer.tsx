"use client";

import React, { useState } from "react";
import { QuizCreatorState } from "@/types/creator";
import {
  StartAttemptResponse,
  SubmittedAnswer,
  AttemptResultResponse,
} from "@/types/attempt";
import { ApiClient } from "@/lib/api";
import {
  createTakingSessionFromCreator,
  convertCreatorStateToBackendSave,
  evaluateLocalAttempt,
} from "@/lib/attemptDefaults";
import { QuizIntroScreen } from "./QuizIntroScreen";
import { QuizQuestionView } from "./QuizQuestionView";
import { SubmissionConfirmModal } from "./SubmissionConfirmModal";
import { QuizResultsView } from "./QuizResultsView";
import { QuizReviewView } from "./QuizReviewView";

interface QuizTakingContainerProps {
  quiz: QuizCreatorState;
  onBackToEditor: () => void;
}

export const QuizTakingContainer: React.FC<QuizTakingContainerProps> = ({
  quiz,
  onBackToEditor,
}) => {
  const [mode, setMode] = useState<"intro" | "taking" | "results" | "review">("intro");
  const [attemptSession, setAttemptSession] = useState<StartAttemptResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, SubmittedAnswer>>({});
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<AttemptResultResponse | null>(null);
  const [startedAtTimestamp, setStartedAtTimestamp] = useState<number>(() => Date.now());

  // Distinct question types present in quiz
  const questionTypes = Array.from(
    new Set(quiz.questions.map((q) => q.type || "multiple_choice"))
  );

  // ---------------------------------------------------------------------------
  // 1. START QUIZ ATTEMPT
  // ---------------------------------------------------------------------------
  const handleStartQuiz = async () => {
    try {
      // 1. Try to ensure quiz is registered in backend
      const savePayload = convertCreatorStateToBackendSave(quiz);
      await ApiClient.saveQuizDraft(savePayload).catch(() => null);

      // 2. Start attempt via backend to get sanitized payload
      const session = await ApiClient.startQuizAttempt(quiz.id);
      setAttemptSession(session);
    } catch {
      // Offline fallback: scrub locally
      const localSession = createTakingSessionFromCreator(quiz);
      setAttemptSession(localSession);
    }

    setCurrentIndex(0);
    setAnswers({});
    setStartedAtTimestamp(Date.now());
    setMode("taking");
  };

  // ---------------------------------------------------------------------------
  // 2. ANSWER RECORDING (PRESERVES ANSWERS)
  // ---------------------------------------------------------------------------
  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        question_id: questionId,
        selected_option_id: optionId,
      },
    }));
  };

  const handleUpdateTextAnswer = (questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        question_id: questionId,
        text_answer: text,
      },
    }));
  };

  // ---------------------------------------------------------------------------
  // 3. NAVIGATION & QUESTION PALETTE
  // ---------------------------------------------------------------------------
  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    const total = attemptSession?.questions.length || quiz.questions.length;
    setCurrentIndex((prev) => Math.min(total - 1, prev + 1));
  };

  const handleNavigateQuestion = (index: number) => {
    setCurrentIndex(index);
  };

  // ---------------------------------------------------------------------------
  // 4. PER-QUESTION TIMER EXPIRATION
  // ---------------------------------------------------------------------------
  const handleTimerTimeout = () => {
    const total = attemptSession?.questions.length || quiz.questions.length;
    if (currentIndex < total - 1) {
      // Advance to next question automatically, preserving current answer
      setCurrentIndex((prev) => prev + 1);
    } else {
      // On final question, auto-submit attempt
      handleConfirmSubmit();
    }
  };

  // ---------------------------------------------------------------------------
  // 5. SUBMISSION & SCORING
  // ---------------------------------------------------------------------------
  const handleConfirmSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const timeSpent = Math.max(
      1,
      Math.round((Date.now() - startedAtTimestamp) / 1000)
    );
    const answersList = Object.values(answers);

    try {
      if (attemptSession && !attemptSession.attempt_id.startsWith("local_")) {
        const gradedResult = await ApiClient.submitQuizAttempt(
          quiz.id,
          attemptSession.attempt_id,
          {
            answers: answersList,
            time_spent_seconds: timeSpent,
          }
        );
        setResults(gradedResult);
      } else {
        // Local evaluation fallback
        const localResult = evaluateLocalAttempt(
          quiz,
          attemptSession?.attempt_id || `att_${Date.now()}`,
          attemptSession?.started_at || new Date().toISOString(),
          answersList,
          timeSpent
        );
        setResults(localResult);
      }
    } catch {
      // Safe fallback if network error during submit
      const localResult = evaluateLocalAttempt(
        quiz,
        attemptSession?.attempt_id || `att_${Date.now()}`,
        attemptSession?.started_at || new Date().toISOString(),
        answersList,
        timeSpent
      );
      setResults(localResult);
    } finally {
      setIsSubmitting(false);
      setIsConfirmModalOpen(false);
      setMode("results");
    }
  };

  // ---------------------------------------------------------------------------
  // 6. RETAKE QUIZ (FRESH ATTEMPT ON SAME QUESTIONS)
  // ---------------------------------------------------------------------------
  const handleRetakeQuiz = async () => {
    setResults(null);
    setAnswers({});
    setCurrentIndex(0);
    setStartedAtTimestamp(Date.now());

    try {
      const freshSession = await ApiClient.startQuizAttempt(quiz.id);
      setAttemptSession(freshSession);
    } catch {
      const localSession = createTakingSessionFromCreator(quiz);
      setAttemptSession(localSession);
    }

    setMode("taking");
  };

  // Compute answered counts for modal
  const questionsList = attemptSession?.questions || quiz.questions.map((q, idx) => ({
    question_id: q.id,
    number: idx + 1,
    type: q.type || "multiple_choice",
    question_text: q.text,
    options: q.options.map((o) => ({ id: o.id, text: o.text })),
    difficulty: q.difficulty,
    max_score: 1.0,
  }));

  const totalQ = questionsList.length;
  const answeredCount = questionsList.filter((q) => {
    const a = answers[q.question_id];
    if (!a) return false;
    if (q.type === "short_answer") return !!a.text_answer && a.text_answer.trim().length > 0;
    return !!a.selected_option_id && a.selected_option_id.trim().length > 0;
  }).length;
  const unansweredCount = totalQ - answeredCount;

  // ---------------------------------------------------------------------------
  // RENDER BASED ON MODE
  // ---------------------------------------------------------------------------
  if (mode === "intro") {
    return (
      <QuizIntroScreen
        title={quiz.title}
        questionCount={quiz.questions.length}
        questionTypes={questionTypes}
        difficulty={quiz.questions[0]?.difficulty || "Medium"}
        subject={quiz.specification.subject}
        exam={quiz.specification.exam}
        academicYear={quiz.specification.year}
        timeLimitEnabled={quiz.timeLimit.enabled}
        timeLimitSeconds={quiz.timeLimit.secondsPerQuestion}
        onStartQuiz={handleStartQuiz}
        onBackToEditor={onBackToEditor}
      />
    );
  }

  if (mode === "taking") {
    return (
      <>
        <QuizQuestionView
          quizTitle={quiz.title}
          questions={questionsList}
          currentIndex={currentIndex}
          answers={answers}
          timeLimitEnabled={quiz.timeLimit.enabled}
          timeLimitSeconds={quiz.timeLimit.secondsPerQuestion}
          onSelectOption={handleSelectOption}
          onUpdateTextAnswer={handleUpdateTextAnswer}
          onNavigateQuestion={handleNavigateQuestion}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onOpenSubmitModal={() => setIsConfirmModalOpen(true)}
          onTimerTimeout={handleTimerTimeout}
          isPausedTimer={isConfirmModalOpen}
        />

        <SubmissionConfirmModal
          isOpen={isConfirmModalOpen}
          totalQuestions={totalQ}
          answeredCount={answeredCount}
          unansweredCount={unansweredCount}
          onConfirmSubmit={handleConfirmSubmit}
          onClose={() => setIsConfirmModalOpen(false)}
          isSubmitting={isSubmitting}
        />
      </>
    );
  }

  if (mode === "results" && results) {
    return (
      <QuizResultsView
        result={results}
        onReviewAnswers={() => setMode("review")}
        onRetakeQuiz={handleRetakeQuiz}
        onBackToEditor={onBackToEditor}
      />
    );
  }

  if (mode === "review" && results) {
    return (
      <QuizReviewView
        result={results}
        onBackToResults={() => setMode("results")}
        onRetakeQuiz={handleRetakeQuiz}
        onBackToEditor={onBackToEditor}
      />
    );
  }

  return null;
};
