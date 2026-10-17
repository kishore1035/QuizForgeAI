"use client";

import React from "react";
import { ArrowLeft, ArrowRight, Check, Send } from "lucide-react";
import { QuizTakingQuestion, SubmittedAnswer } from "@/types/attempt";
import { PerQuestionTimer } from "./PerQuestionTimer";

interface QuizQuestionViewProps {
  quizTitle: string;
  questions: QuizTakingQuestion[];
  currentIndex: number;
  answers: Record<string, SubmittedAnswer>;
  timeLimitEnabled: boolean;
  timeLimitSeconds?: number | null;
  onSelectOption: (questionId: string, optionId: string) => void;
  onUpdateTextAnswer: (questionId: string, text: string) => void;
  onNavigateQuestion: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onOpenSubmitModal: () => void;
  onTimerTimeout: () => void;
  isPausedTimer?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: "Multiple Choice",
  true_false: "True / False",
  short_answer: "Short Answer",
};

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

export const QuizQuestionView: React.FC<QuizQuestionViewProps> = ({
  quizTitle,
  questions,
  currentIndex,
  answers,
  timeLimitEnabled,
  timeLimitSeconds = 30,
  onSelectOption,
  onUpdateTextAnswer,
  onNavigateQuestion,
  onPrevious,
  onNext,
  onOpenSubmitModal,
  onTimerTimeout,
  isPausedTimer = false,
}) => {
  const currentQuestion: QuizTakingQuestion | undefined = questions[currentIndex];
  if (!currentQuestion) return null;

  const totalQuestions = questions.length;
  const currentAnswer = answers[currentQuestion.question_id];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalQuestions - 1;

  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  const isQuestionAnswered = (qId: string) => {
    const a = answers[qId];
    if (!a) return false;
    const q = questions.find((item) => item.question_id === qId);
    if (q?.type === "short_answer") {
      return !!a.text_answer && a.text_answer.trim().length > 0;
    }
    return !!a.selected_option_id && a.selected_option_id.trim().length > 0;
  };

  const answeredTally = questions.filter((q) => isQuestionAnswered(q.question_id)).length;
  const typeLabel = TYPE_LABELS[currentQuestion.type] || "Question";

  return (
    <div className="max-w-4xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-8 flex flex-col min-h-[calc(100vh-5rem)] bg-black">
      {/* Top Header Card */}
      <div className="rounded-xl p-4 sm:p-5 mb-4 sm:mb-6 bg-zinc-950 border border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              {quizTitle || "Quiz"}
            </span>
            <h2 className="text-sm sm:text-base font-bold text-white mt-0.5">
              Question {currentIndex + 1} <span className="text-zinc-500 font-normal">of {totalQuestions}</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {timeLimitEnabled && timeLimitSeconds && (
              <PerQuestionTimer
                key={`timer-${currentIndex}`}
                durationSeconds={timeLimitSeconds}
                questionIndex={currentIndex}
                onTimeout={onTimerTimeout}
                isPaused={isPausedTimer}
              />
            )}

            <div className="hidden sm:inline-flex items-center px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono">
              {answeredTally}/{totalQuestions} Answered
            </div>
          </div>
        </div>

        {/* Minimal Progress Bar */}
        <div className="w-full bg-zinc-900 rounded-full h-1 overflow-hidden">
          <div
            className="h-1 bg-zinc-300 transition-all duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Question Card */}
      <div className="rounded-xl p-5 sm:p-8 flex-1 flex flex-col justify-between bg-zinc-950 border border-zinc-800">
        <div>
          {/* Question Meta Badges */}
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-900 text-zinc-300 border border-zinc-800 uppercase">
              {typeLabel}
            </span>
            {currentQuestion.difficulty && (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-800 capitalize">
                {currentQuestion.difficulty}
              </span>
            )}
            <span className="text-xs text-zinc-500 ml-auto font-mono">
              1.0 Point
            </span>
          </div>

          {/* Question Text */}
          <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed mb-6 whitespace-pre-wrap">
            {currentQuestion.question_text}
          </h3>

          {/* Answer Controls Based on Type */}
          {currentQuestion.type === "short_answer" ? (
            <div className="space-y-2">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                Your Answer:
              </label>
              <textarea
                value={currentAnswer?.text_answer || ""}
                onChange={(e) =>
                  onUpdateTextAnswer(
                    currentQuestion.question_id,
                    e.target.value.slice(0, 1000)
                  )
                }
                rows={5}
                maxLength={1000}
                placeholder="Type your explanation or response..."
                className="w-full p-4 rounded-lg text-sm text-white placeholder:text-zinc-600 outline-none transition-all resize-y bg-black border border-zinc-800 focus:border-zinc-500"
              />
              <div className="flex items-center justify-between text-xs text-zinc-500 px-1 font-mono">
                <span>Maximum 1000 characters</span>
                <span>{(currentAnswer?.text_answer || "").length} / 1000</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {currentQuestion.options.map((opt, optIdx) => {
                const isSelected =
                  currentAnswer?.selected_option_id?.toLowerCase() ===
                  opt.id.toLowerCase();
                const optionLetter = OPTION_LETTERS[optIdx] || String.fromCharCode(65 + optIdx);

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      onSelectOption(currentQuestion.question_id, opt.id)
                    }
                    className={`w-full text-left p-3.5 rounded-lg border transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-zinc-900 border-zinc-500 ring-1 ring-zinc-500/25 text-zinc-100 font-medium"
                        : "bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5 ${
                        isSelected
                          ? "bg-zinc-200 text-zinc-950"
                          : "bg-zinc-900 border border-zinc-800 text-zinc-400"
                      }`}
                    >
                      {optionLetter}
                    </div>
                    <div className="flex-1 text-sm leading-normal">
                      {opt.text}
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-zinc-200 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Navigation Bar */}
        <div className="pt-6 mt-6 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onPrevious}
            disabled={isFirst}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-zinc-300 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-2">
            {!isLast ? (
              <button
                type="button"
                onClick={onNext}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-zinc-950 bg-zinc-100 hover:bg-white transition-colors cursor-pointer shadow-xs"
              >
                <span>Next Question</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenSubmitModal}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold text-zinc-950 bg-zinc-100 hover:bg-white transition-colors cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Quiz</span>
              </button>
            )}

            {!isLast && (
              <button
                type="button"
                onClick={onOpenSubmitModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 transition-colors"
                title="Finish and submit attempt early"
              >
                <span>Submit Early</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Numbered Question Palette / Navigator */}
      <div className="mt-4 sm:mt-6 rounded-xl p-4 bg-zinc-950 border border-zinc-800">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-3 px-1 font-mono">
          <span className="font-bold text-white uppercase text-[11px]">Question Palette</span>
          <div className="flex items-center gap-3 text-[11px]">
            <span>Answered: {answeredTally}/{totalQuestions}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {questions.map((q, idx) => {
            const isCurrent = idx === currentIndex;
            const answered = isQuestionAnswered(q.question_id);

            return (
              <button
                key={q.question_id}
                type="button"
                onClick={() => onNavigateQuestion(idx)}
                className={`w-8 h-8 rounded text-xs font-mono font-bold transition-colors flex items-center justify-center cursor-pointer ${
                  isCurrent
                    ? "bg-zinc-200 text-zinc-950 border border-zinc-300"
                    : answered
                    ? "bg-zinc-900 text-white border border-zinc-600"
                    : "bg-black text-zinc-500 border border-zinc-800 hover:border-zinc-600"
                }`}
                title={`Question ${idx + 1}${answered ? " (Answered)" : ""}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
