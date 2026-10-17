"use client";

import React, { useState, useEffect, useCallback } from "react";
import { SlidersHorizontal } from "lucide-react";
import { QuizHeader } from "./QuizHeader";
import { QuestionNavigator } from "./QuestionNavigator";
import { QuestionEditor } from "./QuestionEditor";
import { QuizSpecification } from "./QuizSpecification";
import { TimeLimitSelector } from "./TimeLimitSelector";
import { QuizPreview } from "./QuizPreview";
import { SaveValidationMessages, ValidationErrorItem } from "./SaveValidationMessages";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  createInitialQuizState,
  createNewQuestion,
  createNewOption,
  checkQuestionCompletion,
  convertCreatorStateToSavePayload,
} from "@/lib/quizDefaults";
import { CreatorQuestion, QuestionImage, QuizCreatorState } from "@/types/creator";
import { ApiClient } from "@/lib/api";
import { downloadQuizQuestions, downloadQuizAnswerKey } from "@/lib/exportUtils";
import { QuizTakingContainer } from "../taking/QuizTakingContainer";

interface QuizCreatorProps {
  onBackToWorkspace?: () => void;
  onOpenWizard?: () => void;
  onTakeQuiz?: (quiz: QuizCreatorState) => void;
  initialConfig?: {
    title?: string;
    subject?: string;
    exam?: string;
    year?: string;
    timeLimitEnabled?: boolean;
    secondsPerQuestion?: number;
  };
  initialQuizState?: QuizCreatorState;
}

export const QuizCreator: React.FC<QuizCreatorProps> = ({
  onBackToWorkspace,
  onOpenWizard,
  onTakeQuiz,
  initialConfig,
  initialQuizState,
}) => {
  const [quizState, setQuizState] = useState<QuizCreatorState>(() => {
    if (initialQuizState) {
      return initialQuizState;
    }
    const base = createInitialQuizState();
    if (initialConfig) {
      if (initialConfig.title) base.title = initialConfig.title;
      if (initialConfig.subject) base.specification.subject = initialConfig.subject;
      if (initialConfig.exam) base.specification.exam = initialConfig.exam;
      if (initialConfig.year) base.specification.year = initialConfig.year;
      if (initialConfig.timeLimitEnabled !== undefined) {
        base.timeLimit.enabled = initialConfig.timeLimitEnabled;
      }
      if (initialConfig.secondsPerQuestion !== undefined) {
        base.timeLimit.secondsPerQuestion = initialConfig.secondsPerQuestion;
        base.timeLimit.selectedLabel = `${initialConfig.secondsPerQuestion}s`;
      }
    }
    return base;
  });

  const [prevInitialState, setPrevInitialState] = useState(initialQuizState);
  if (initialQuizState && initialQuizState !== prevInitialState) {
    setPrevInitialState(initialQuizState);
    setQuizState(initialQuizState);
  }


  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isConfirmCancelOpen, setIsConfirmCancelOpen] = useState(false);
  const [validationModal, setValidationModal] = useState<{
    isOpen: boolean;
    isValid: boolean;
    errors: ValidationErrorItem[];
    savedAt?: string;
  }>({
    isOpen: false,
    isValid: false,
    errors: [],
  });
  const [mobileRightPanelOpen, setMobileRightPanelOpen] = useState(false);
  const [isTakingSession, setIsTakingSession] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Prevent accidental loss of unsaved changes when closing tab or reloading
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (quizState.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [quizState.hasUnsavedChanges]);

  const handleTakeQuizClick = () => {
    // Validate that quiz contains at least one completed question
    const errors: ValidationErrorItem[] = [];
    if (!quizState.title.trim()) {
      errors.push({ message: "Quiz title cannot be blank before taking." });
    }
    if (quizState.questions.length === 0) {
      errors.push({ message: "The quiz must contain at least one question." });
    }
    const completedCount = quizState.questions.filter((q) => q.isComplete).length;
    if (completedCount === 0 && quizState.questions.length > 0) {
      errors.push({ message: "At least one question must be fully filled out and have a correct answer selected." });
    }

    if (errors.length > 0) {
      setValidationModal({
        isOpen: true,
        isValid: false,
        errors,
      });
      return;
    }

    if (onTakeQuiz) {
      onTakeQuiz(quizState);
    } else {
      setIsTakingSession(true);
    }
  };

  const handleExportQuestions = (format: "markdown" | "txt") => {
    downloadQuizQuestions(quizState, format);
  };

  const handleExportAnswerKey = (format: "markdown" | "txt") => {
    downloadQuizAnswerKey(quizState, format);
  };

  // Active question helper
  const activeQuestion =
    quizState.questions.find((q) => q.id === quizState.activeQuestionId) ||
    quizState.questions[0];

  const activeQuestionIndex = quizState.questions.findIndex(
    (q) => q.id === quizState.activeQuestionId
  );

  // Mark state as modified
  const markDirty = useCallback(() => {
    setQuizState((prev) => ({ ...prev, hasUnsavedChanges: true }));
  }, []);

  // Update title
  const handleTitleChange = (newTitle: string) => {
    setQuizState((prev) => ({
      ...prev,
      title: newTitle,
      hasUnsavedChanges: true,
    }));
  };

  // Select question
  const handleSelectQuestion = (id: string) => {
    setQuizState((prev) => ({
      ...prev,
      activeQuestionId: id,
    }));
  };

  // Add question
  const handleAddQuestion = () => {
    const nextNumber = quizState.questions.length + 1;
    const newQ = createNewQuestion(nextNumber);
    setQuizState((prev) => ({
      ...prev,
      questions: [...prev.questions, newQ],
      activeQuestionId: newQ.id,
      hasUnsavedChanges: true,
    }));
  };

  // Delete question
  const handleDeleteQuestion = (id: string) => {
    if (quizState.questions.length <= 1) return;

    setQuizState((prev) => {
      const filtered = prev.questions.filter((q) => q.id !== id);
      // Renumber
      const renumbered = filtered.map((q, idx) => ({ ...q, number: idx + 1 }));
      const newActive =
        prev.activeQuestionId === id
          ? renumbered[Math.min(activeQuestionIndex, renumbered.length - 1)].id
          : prev.activeQuestionId;

      return {
        ...prev,
        questions: renumbered,
        activeQuestionId: newActive,
        hasUnsavedChanges: true,
      };
    });
  };

  // Helper to mutate active question safely
  const updateActiveQuestion = useCallback(
    (updater: (current: CreatorQuestion) => Partial<CreatorQuestion>) => {
      setQuizState((prev) => {
        const updatedQuestions = prev.questions.map((q) => {
          if (q.id === prev.activeQuestionId) {
            const partial = updater(q);
            const combined = { ...q, ...partial };
            combined.isComplete = checkQuestionCompletion(combined);
            return combined;
          }
          return q;
        });

        return {
          ...prev,
          questions: updatedQuestions,
          hasUnsavedChanges: true,
        };
      });
    },
    []
  );

  // Field updates
  const handleUpdateQuestionText = (text: string) => {
    updateActiveQuestion(() => ({ text }));
  };

  const handleUpdateImage = (image: QuestionImage | null) => {
    updateActiveQuestion(() => ({ image }));
  };

  const handleUpdateOptionText = (optionId: string, text: string) => {
    updateActiveQuestion((curr) => ({
      options: curr.options.map((opt) =>
        opt.id === optionId ? { ...opt, text } : opt
      ),
    }));
  };

  const handleSelectCorrectOption = (optionId: string) => {
    updateActiveQuestion(() => ({ correctOptionId: optionId }));
  };

  const handleAddOption = () => {
    updateActiveQuestion((curr) => {
      const nextLabel = String.fromCharCode(65 + curr.options.length);
      return {
        options: [...curr.options, createNewOption(nextLabel)],
      };
    });
  };

  const handleRemoveOption = (optionId: string) => {
    updateActiveQuestion((curr) => {
      if (curr.options.length <= 2) return curr;
      const filtered = curr.options.filter((o) => o.id !== optionId);
      // Re-label A, B, C, etc.
      const relabeled = filtered.map((o, idx) => ({
        ...o,
        label: String.fromCharCode(65 + idx),
      }));
      const newCorrect = curr.correctOptionId === optionId ? null : curr.correctOptionId;
      return {
        options: relabeled,
        correctOptionId: newCorrect,
      };
    });
  };

  const handleUpdateExplanation = (explanation: string) => {
    updateActiveQuestion(() => ({ explanation }));
  };

  const handleUpdateExpectedAnswer = (expectedAnswer: string) => {
    updateActiveQuestion(() => ({ expectedAnswer }));
  };

  // Right card updates
  const handleSpecificationChange = (updated: Partial<QuizCreatorState["specification"]>) => {
    setQuizState((prev) => ({
      ...prev,
      specification: { ...prev.specification, ...updated },
      hasUnsavedChanges: true,
    }));
  };

  const handleTimeLimitChange = (updated: Partial<QuizCreatorState["timeLimit"]>) => {
    setQuizState((prev) => ({
      ...prev,
      timeLimit: { ...prev.timeLimit, ...updated },
      hasUnsavedChanges: true,
    }));
  };

  // Validation & Save
  const handleSave = async () => {
    const errors: ValidationErrorItem[] = [];

    if (!quizState.title.trim()) {
      errors.push({ message: "Quiz title cannot be blank." });
    }

    if (quizState.questions.length === 0) {
      errors.push({ message: "The quiz must contain at least one question." });
    }

    quizState.questions.forEach((q, idx) => {
      const qNum = idx + 1;
      if (!q.text.trim()) {
        errors.push({ questionNumber: qNum, message: "Question text is required." });
      }

      if (q.type === "short_answer") {
        if (!q.expectedAnswer || !q.expectedAnswer.trim()) {
          errors.push({
            questionNumber: qNum,
            message: "Expected answer is required for short answer questions.",
          });
        }
      } else {
        const filledOptions = q.options.filter((o) => o.text.trim().length > 0);
        if (filledOptions.length < 2) {
          errors.push({
            questionNumber: qNum,
            message: "At least two answer options must be filled.",
          });
        }

        if (!q.correctOptionId) {
          errors.push({
            questionNumber: qNum,
            message: "Please select one correct answer option.",
          });
        } else {
          const correctOpt = q.options.find((o) => o.id === q.correctOptionId);
          if (!correctOpt || !correctOpt.text.trim()) {
            errors.push({
              questionNumber: qNum,
              message: "The selected correct answer cannot be empty.",
            });
          }
        }
      }
    });

    if (errors.length > 0) {
      setValidationModal({
        isOpen: true,
        isValid: false,
        errors,
      });
      return;
    }

    // Persist to backend database
    setIsSaving(true);
    try {
      const payload = convertCreatorStateToSavePayload(quizState);
      const saved = await ApiClient.saveQuizDraft(payload);

      setSaveError(null);
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setQuizState((prev) => ({
        ...prev,
        id: saved.quiz_id,
        hasUnsavedChanges: false,
        lastSavedAt: now,
      }));

      setValidationModal({
        isOpen: true,
        isValid: true,
        errors: [],
        savedAt: now,
      });
    } catch (err: any) {
      setSaveError(err?.message || "Failed to save quiz to database");
      setValidationModal({
        isOpen: true,
        isValid: false,
        errors: [{ message: `Failed to save quiz to database: ${err?.message || "Unknown error"}` }],
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel action
  const handleCancelClick = () => {
    if (quizState.hasUnsavedChanges) {
      setIsConfirmCancelOpen(true);
    } else {
      if (onBackToWorkspace) onBackToWorkspace();
    }
  };

  const handleConfirmDiscard = () => {
    setIsConfirmCancelOpen(false);
    setQuizState(createInitialQuizState());
    if (onBackToWorkspace) onBackToWorkspace();
  };

  if (isTakingSession) {
    return (
      <div className="min-h-full bg-forge-mesh text-zinc-100 flex flex-col justify-center p-2 sm:p-4 md:p-6 lg:p-8 font-sans">
        <div className="w-full max-w-[1440px] mx-auto rounded-2xl shadow-2xl border border-white/10 flex flex-col min-h-[calc(100vh-2rem)] md:min-h-[calc(100vh-3rem)] overflow-y-auto" style={{ background: "var(--bg-surface)" }}>
          <QuizTakingContainer
            quiz={quizState}
            onBackToEditor={() => setIsTakingSession(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-forge-mesh text-zinc-100 flex flex-col justify-center p-2 sm:p-4 md:p-6 lg:p-8 font-sans">
      {/* Centered Workspace Card */}
      <div className="w-full max-w-[1440px] mx-auto bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-800 flex flex-col h-[calc(100vh-2rem)] md:h-[calc(100vh-3rem)] overflow-hidden">
        {/* Top Header */}
        <QuizHeader
          quizTitle={quizState.title}
          onTitleChange={handleTitleChange}
          onPreview={() => setIsPreviewOpen(true)}
          onTakeQuiz={handleTakeQuizClick}
          onCancel={handleCancelClick}
          onSave={handleSave}
          isSaving={isSaving}
          hasUnsavedChanges={quizState.hasUnsavedChanges}
          lastSavedAt={quizState.lastSavedAt}
          saveError={saveError}
          onExportQuestions={handleExportQuestions}
          onExportAnswerKey={handleExportAnswerKey}
        />

        {/* Mobile settings toggle */}
        <div className="xl:hidden px-4 py-2 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between text-xs text-zinc-400">
          <span>Active: Question {activeQuestionIndex + 1}</span>
          <button
            type="button"
            onClick={() => setMobileRightPanelOpen(!mobileRightPanelOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800 border border-zinc-700 font-medium text-zinc-200 hover:text-white transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{mobileRightPanelOpen ? "Hide" : "Show"} Specification</span>
          </button>
        </div>

        {/* Three-Column Editor Layout */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* 1. Left Column: Questions Navigator */}
          <QuestionNavigator
            questions={quizState.questions}
            activeQuestionId={quizState.activeQuestionId}
            onSelectQuestion={handleSelectQuestion}
            onAddQuestion={handleAddQuestion}
            onDeleteQuestion={handleDeleteQuestion}
          />

          {/* 2. Center Column: Question Editor */}
          {activeQuestion && (
            <QuestionEditor
              question={activeQuestion}
              questionIndex={activeQuestionIndex}
              onUpdateQuestionText={handleUpdateQuestionText}
              onUpdateImage={handleUpdateImage}
              onUpdateOptionText={handleUpdateOptionText}
              onSelectCorrectOption={handleSelectCorrectOption}
              onAddOption={handleAddOption}
              onRemoveOption={handleRemoveOption}
              onUpdateExplanation={handleUpdateExplanation}
              onUpdateExpectedAnswer={handleUpdateExpectedAnswer}
            />
          )}

          {/* 3. Right Column: Specification & Time Limit Cards */}
          <aside
            className={`w-72 lg:w-80 p-4 border-l border-zinc-800 bg-zinc-950 overflow-y-auto space-y-4 ${
              mobileRightPanelOpen
                ? "fixed inset-y-0 right-0 z-30 shadow-2xl bg-zinc-950 md:static md:shadow-none"
                : "hidden xl:block"
            }`}
          >
            {mobileRightPanelOpen && (
              <div className="xl:hidden flex justify-end pb-2">
                <button
                  onClick={() => setMobileRightPanelOpen(false)}
                  className="text-xs font-semibold text-zinc-400 hover:text-white p-1 transition-colors"
                >
                  Close
                </button>
              </div>
            )}
            <QuizSpecification
              specification={quizState.specification}
              onChange={handleSpecificationChange}
            />

            <TimeLimitSelector
              timeLimit={quizState.timeLimit}
              onChange={handleTimeLimitChange}
            />
          </aside>
        </div>
      </div>

      {/* Interactive Quiz Preview Modal */}
      <QuizPreview
        quiz={quizState}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />

      {/* Save Validation Feedback Modal */}
      <SaveValidationMessages
        isOpen={validationModal.isOpen}
        onClose={() => setValidationModal((prev) => ({ ...prev, isOpen: false }))}
        isValid={validationModal.isValid}
        errors={validationModal.errors}
        savedAt={validationModal.savedAt}
      />

      {/* Cancel Discard Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmCancelOpen}
        title="Discard Unsaved Edits?"
        message="You have unsaved changes in the Quiz Creator. Discarding will revert the quiz back to its initial state."
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        onConfirm={handleConfirmDiscard}
        onCancel={() => setIsConfirmCancelOpen(false)}
      />
    </div>
  );
};
