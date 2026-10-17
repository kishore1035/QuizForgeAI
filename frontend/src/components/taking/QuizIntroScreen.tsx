"use client";

import React from "react";
import { Play, ArrowLeft, Clock, BookOpen, HelpCircle, Layers } from "lucide-react";

interface QuizIntroScreenProps {
  title: string;
  questionCount: number;
  questionTypes: string[];
  difficulty?: string;
  subject?: string;
  exam?: string;
  academicYear?: string;
  sourceType?: string;
  timeLimitEnabled: boolean;
  timeLimitSeconds?: number | null;
  onStartQuiz: () => void;
  onBackToEditor: () => void;
}

export const QuizIntroScreen: React.FC<QuizIntroScreenProps> = ({
  title,
  questionCount,
  questionTypes,
  difficulty = "Medium",
  subject,
  exam,
  academicYear,
  sourceType,
  timeLimitEnabled,
  timeLimitSeconds = 30,
  onStartQuiz,
  onBackToEditor,
}) => {
  const hasQuestions = questionCount > 0;

  const formatType = (t: string) => {
    if (t === "multiple_choice") return "Multiple Choice";
    if (t === "true_false") return "True / False";
    if (t === "short_answer") return "Short Answer";
    return t;
  };

  return (
    <div className="min-h-full bg-black py-8 px-4 flex flex-col justify-center">
      <div className="max-w-2xl mx-auto w-full flex flex-col justify-center">
        {/* Top Back Action */}
        <div className="mb-6">
          <button
            type="button"
            onClick={onBackToEditor}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-600"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Editor</span>
          </button>
        </div>

        {/* Card */}
        <div className="rounded-xl p-6 sm:p-10 bg-zinc-950 border border-zinc-800 shadow-2xl">
          {/* Header Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className="px-2.5 py-1 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 text-[11px] font-mono uppercase">
              Assessment
            </span>

            {difficulty && (
              <span className="px-2.5 py-1 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 text-[11px] font-mono capitalize">
                {difficulty}
              </span>
            )}

            {sourceType && (
              <span className="px-2.5 py-1 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 text-[11px] font-mono capitalize">
                Source: {sourceType}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3 uppercase">
            {title || "Untitled Practice Quiz"}
          </h1>

          <p className="text-sm leading-relaxed text-zinc-400 mb-8">
            Review instructions and start your practice session. Answers will be scored and saved automatically.
          </p>

          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {/* Question Count */}
            <div className="flex items-start gap-3.5 p-4 rounded-lg bg-black border border-zinc-800">
              <div className="p-2 rounded bg-zinc-900 border border-zinc-800 text-white">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  Questions
                </div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {questionCount} {questionCount === 1 ? "Question" : "Questions"}
                </div>
              </div>
            </div>

            {/* Question Formats */}
            <div className="flex items-start gap-3.5 p-4 rounded-lg bg-black border border-zinc-800">
              <div className="p-2 rounded bg-zinc-900 border border-zinc-800 text-white">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  Question Types
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {questionTypes.length > 0 ? (
                    questionTypes.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-300"
                      >
                        {formatType(t)}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-zinc-400">Multiple Choice</span>
                  )}
                </div>
              </div>
            </div>

            {/* Curriculum */}
            {(subject || exam || academicYear) && (
              <div className="flex items-start gap-3.5 p-4 rounded-lg bg-black border border-zinc-800 sm:col-span-2">
                <div className="p-2 rounded bg-zinc-900 border border-zinc-800 text-white">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                    Curriculum Specs
                  </div>
                  <div className="text-xs font-semibold text-zinc-200 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {subject && <span>Subject: {subject}</span>}
                    {exam && <span>Exam: {exam}</span>}
                    {academicYear && <span>Year: {academicYear}</span>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Timer Settings */}
          <div className="mb-8 p-4 rounded-lg bg-black border border-zinc-800 flex items-start gap-3.5">
            <div className="p-2 rounded bg-zinc-900 border border-zinc-800 text-white mt-0.5">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-white">
                {timeLimitEnabled
                  ? `Timer: ${timeLimitSeconds}s Per Question`
                  : "Untimed Practice"}
              </div>
              <div className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {timeLimitEnabled
                  ? "Duration applies to each question individually. When the timer expires, answers are preserved and the view advances automatically."
                  : "No time limit is active. Take as much time as you need for each question."}
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onBackToEditor}
              className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-zinc-300 bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-800 hover:border-zinc-700"
            >
              Edit Questions
            </button>

            <button
              type="button"
              onClick={onStartQuiz}
              disabled={!hasQuestions}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold text-zinc-950 bg-zinc-100 hover:bg-white rounded-lg transition-colors active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Quiz</span>
            </button>
          </div>

          {!hasQuestions && (
            <p className="mt-3 text-xs text-center text-zinc-400 font-mono">
              This quiz has 0 questions. Please add questions before starting.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
