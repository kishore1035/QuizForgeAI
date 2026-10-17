"use client";

import React, { useState, useEffect } from "react";
import { X, Clock, ArrowRight, ArrowLeft, RotateCcw, Award } from "lucide-react";
import { CreatorQuestion, QuizCreatorState } from "@/types/creator";

interface QuizPreviewProps {
  quiz: QuizCreatorState;
  isOpen: boolean;
  onClose: () => void;
}

export const QuizPreview: React.FC<QuizPreviewProps> = ({
  quiz,
  isOpen,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(
    quiz.timeLimit.enabled ? quiz.timeLimit.secondsPerQuestion : 0
  );
  const [isFinished, setIsFinished] = useState(false);

  const questions = quiz.questions;
  const currentQuestion: CreatorQuestion | undefined = questions[currentIndex];

  // Reset when preview modal opens
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen && !prevIsOpen) {
    setPrevIsOpen(true);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setIsFinished(false);
    setTimeRemaining(quiz.timeLimit.enabled ? quiz.timeLimit.secondsPerQuestion : 0);
  } else if (!isOpen && prevIsOpen) {
    setPrevIsOpen(false);
  }

  // Per-question countdown timer
  useEffect(() => {
    if (!isOpen || isFinished || !quiz.timeLimit.enabled) return;

    const limitSec = quiz.timeLimit.secondsPerQuestion;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Auto advance to next question on timeout
          setCurrentIndex((curr) => {
            if (curr < questions.length - 1) {
              return curr + 1;
            } else {
              setIsFinished(true);
              return curr;
            }
          });
          return limitSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentIndex, isOpen, isFinished, quiz.timeLimit.enabled, quiz.timeLimit.secondsPerQuestion, questions.length]);


  if (!isOpen) return null;

  const handleSelectOption = (optionId: string) => {
    if (isFinished || !currentQuestion) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));
  };

  const handleTextAnswerChange = (text: string) => {
    if (isFinished || !currentQuestion) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: text,
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsFinished(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const isQuestionAnswerCorrect = (q: CreatorQuestion): boolean => {
    const userAns = (selectedAnswers[q.id] || "").trim().toLowerCase();
    if (q.type === "short_answer") {
      const expected = (q.expectedAnswer || "").trim().toLowerCase();
      return !!expected && userAns === expected;
    }
    return !!q.correctOptionId && selectedAnswers[q.id] === q.correctOptionId;
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q) => {
      if (isQuestionAnswerCorrect(q)) {
        correct += 1;
      }
    });
    return correct;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border flex flex-col max-h-[92vh] animate-in fade-in-0 zoom-in-95 duration-150 text-white"
        style={{
          background: "var(--bg-surface)",
          borderColor: "rgba(255, 255, 255, 0.12)",
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{
            borderColor: "rgba(255, 255, 255, 0.08)",
            background: "var(--bg-elevated)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/20">
              Preview Mode
            </span>
            <h3 className="text-sm font-bold text-white truncate max-w-md">
              {quiz.title || "Untitled Quiz"}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {quiz.timeLimit.enabled && !isFinished && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono border ${
                  timeRemaining <= 5
                    ? "bg-zinc-900 text-white border-white/40 animate-pulse"
                    : "bg-white/5 text-zinc-300 border-white/10"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{timeRemaining}s</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1">
          {isFinished ? (
            /* Results Screen */
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 text-zinc-100 flex items-center justify-center mx-auto shadow-md font-bold border border-zinc-700">
                <Award className="w-8 h-8 text-zinc-100" />
              </div>

              <div>
                <h4 className="text-2xl font-extrabold text-white">Preview Completed</h4>
                <p className="text-sm text-zinc-400 mt-1">
                  Preview score: <strong className="text-white">{calculateScore()}</strong> of{" "}
                  <strong className="text-white">{questions.length}</strong> correct
                </p>
                <p className="text-xs text-zinc-500 mt-0.5 italic">
                  Note: Preview responses are temporary and not recorded to permanent scores.
                </p>
              </div>

              {/* Review List */}
              <div className="space-y-4 text-left pt-2 border-t border-white/5">
                {questions.map((q, idx) => {
                  const isCorrect = isQuestionAnswerCorrect(q);
                  const userAnswer = selectedAnswers[q.id];

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-xl border text-sm ${
                        isCorrect
                          ? "bg-white/[0.06] border-white/20"
                          : "bg-zinc-900/60 border-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-zinc-400 text-xs">Question {idx + 1}</span>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            isCorrect ? "bg-zinc-200 text-zinc-950 font-bold" : "bg-zinc-800 text-zinc-400 font-bold"
                          }`}
                        >
                          {isCorrect ? "Correct" : "Incorrect"}
                        </span>
                      </div>
                      <p className="text-white font-medium">{q.text || "No question text provided"}</p>

                      {q.type === "short_answer" ? (
                        <div className="text-xs text-zinc-400 mt-2 space-y-0.5">
                          <p>
                            Your answer: <strong className="text-zinc-200">{userAnswer || "(None)"}</strong>
                          </p>
                          <p>
                            Expected: <strong className="text-zinc-200">{q.expectedAnswer || "Not set"}</strong>
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-400 mt-2">
                          Correct Answer:{" "}
                          <strong className="text-zinc-200">
                            {q.options.find((o) => o.id === q.correctOptionId)?.label}){" "}
                            {q.options.find((o) => o.id === q.correctOptionId)?.text || "Not set"}
                          </strong>
                        </p>
                      )}

                      {q.explanation && (
                        <p className="text-xs text-zinc-400 mt-2 italic bg-black/40 p-2 rounded-lg border border-white/10">
                          Explanation: {q.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <button
                  onClick={() => {
                    setCurrentIndex(0);
                    setSelectedAnswers({});
                    setIsFinished(false);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restart Preview</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-colors shadow-xs"
                >
                  Back to Editor
                </button>
              </div>
            </div>
          ) : currentQuestion ? (
            /* Active Question Screen */
            <div className="space-y-6">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-zinc-400">
                  <span>Question {currentIndex + 1} of {questions.length}</span>
                  <span>{Math.round(((currentIndex + 1) / questions.length) * 100)}% Complete</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-zinc-300 transition-all duration-200"
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question Text */}
              <div>
                <h4 className="text-lg md:text-xl font-bold text-white leading-snug">
                  {currentQuestion.text || (
                    <span className="italic text-zinc-500">Empty question text...</span>
                  )}
                </h4>

                {/* Optional Attached Image */}
                {currentQuestion.image && (
                  <div className="mt-4 max-h-60 rounded-xl overflow-hidden border border-white/10 bg-black">
                    <img
                      src={currentQuestion.image.dataUrl}
                      alt={currentQuestion.image.name}
                      className="w-full h-auto object-contain max-h-60 mx-auto"
                    />
                  </div>
                )}
              </div>

              {/* Options or Short Answer Input */}
              {currentQuestion.type === "short_answer" ? (
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Your Answer
                  </label>
                  <input
                    type="text"
                    value={selectedAnswers[currentQuestion.id] || ""}
                    onChange={(e) => handleTextAnswerChange(e.target.value)}
                    placeholder="Type your answer here..."
                    className="w-full px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-950 text-sm font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 transition-all"
                  />
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {currentQuestion.options.map((opt) => {
                    const isSelected = selectedAnswers[currentQuestion.id] === opt.id;

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectOption(opt.id)}
                        className={`w-full text-left p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                          isSelected
                            ? "bg-zinc-900 text-zinc-100 border-zinc-500 ring-1 ring-zinc-500/25 shadow-xs font-semibold"
                            : "bg-zinc-950 border-white/10 hover:border-white/20 hover:bg-zinc-900/60"
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                            isSelected ? "bg-zinc-200 text-zinc-950" : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                          }`}
                        >
                          {opt.label}
                        </div>
                        <span className={`text-sm flex-1 ${isSelected ? "text-zinc-100 font-semibold" : "text-zinc-200"}`}>
                          {opt.text || <span className="italic text-zinc-600">Empty option</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer Navigation */}
        {!isFinished && (
          <div
            className="px-6 py-4 border-t flex items-center justify-between"
            style={{
              borderColor: "rgba(255, 255, 255, 0.08)",
              background: "var(--bg-elevated)",
            }}
          >
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-white/20 text-zinc-300 hover:bg-white/10 hover:text-white disabled:opacity-40 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <button
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 transition-all shadow-xs"
            >
              <span>{currentIndex === questions.length - 1 ? "Finish" : "Next"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
