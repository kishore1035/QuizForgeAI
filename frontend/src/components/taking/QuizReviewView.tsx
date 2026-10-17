"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  BookOpen,
  FileText,
  Sparkles,
  Download,
  ChevronDown,
} from "lucide-react";
import { AttemptResultResponse } from "@/types/attempt";
import { downloadAttemptReport } from "@/lib/exportUtils";

interface QuizReviewViewProps {
  result: AttemptResultResponse;
  onBackToResults: () => void;
  onRetakeQuiz: () => void;
  onBackToEditor: () => void;
}

export const QuizReviewView: React.FC<QuizReviewViewProps> = ({
  result,
  onBackToResults,
  onRetakeQuiz,
  onBackToEditor,
}) => {
  const [filter, setFilter] = useState<"all" | "correct" | "incorrect" | "unanswered">("all");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setIsExportOpen(false);
      }
    };
    if (isExportOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExportOpen]);

  const filteredQuestions = result.questions.filter((q) => {
    if (filter === "correct") return q.is_correct;
    if (filter === "incorrect") return !q.is_correct && !q.is_unanswered;
    if (filter === "unanswered") return q.is_unanswered;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto w-full px-3 sm:px-6 py-6 sm:py-10">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <button
          type="button"
          onClick={onBackToResults}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/5 hover:bg-white/5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Results Summary</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Export Report Dropdown */}
          <div ref={exportRef} className="relative">
            <button
              type="button"
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors shadow-xs"
              title="Download results report"
            >
              <Download className="w-3.5 h-3.5 text-zinc-300" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {isExportOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 w-48 rounded-xl shadow-2xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    downloadAttemptReport(result, "markdown");
                    setIsExportOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white text-left"
                >
                  <FileText className="w-3.5 h-3.5 text-white" />
                  <span>Markdown Report (.md)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadAttemptReport(result, "txt");
                    setIsExportOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white text-left"
                >
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Plain Text Report (.txt)</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onRetakeQuiz}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake Quiz</span>
          </button>
          <button
            type="button"
            onClick={onBackToEditor}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-black bg-white hover:bg-zinc-200 rounded-lg transition-colors shadow-xs"
          >
            <span>Edit Questions</span>
          </button>
        </div>
      </div>

      {/* Review Header Card */}
      <div
        className="rounded-2xl border p-6 mb-6 shadow-xl"
        style={{
          background: "var(--bg-surface)",
          borderColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Answer Review & Explanations
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              {result.title} • Score: <span className="font-bold text-white">{result.total_score} / {result.max_score}</span> ({result.percentage}%)
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              filter === "all"
                ? "bg-zinc-100 text-zinc-950 shadow-xs"
                : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10"
            }`}
          >
            All Questions ({result.questions.length})
          </button>
          <button
            onClick={() => setFilter("correct")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              filter === "correct"
                ? "bg-zinc-100 text-zinc-950 shadow-xs"
                : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10"
            }`}
          >
            Correct ({result.correct_count})
          </button>
          <button
            onClick={() => setFilter("incorrect")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              filter === "incorrect"
                ? "bg-zinc-100 text-zinc-950 shadow-xs"
                : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10"
            }`}
          >
            Incorrect ({result.incorrect_count - result.unanswered_count})
          </button>
          <button
            onClick={() => setFilter("unanswered")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              filter === "unanswered"
                ? "bg-zinc-100 text-zinc-950 shadow-xs"
                : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10"
            }`}
          >
            Unanswered ({result.unanswered_count})
          </button>
        </div>
      </div>

      {/* Question Cards List */}
      <div className="space-y-6">
        {filteredQuestions.map((q) => {
          const isCorrect = q.is_correct;
          const isUnanswered = q.is_unanswered;

          return (
            <div
              key={q.question_id}
              className="rounded-2xl border p-6 transition-all shadow-xl"
              style={{
                background: "var(--bg-surface)",
                borderColor: isCorrect
                  ? "rgba(255, 255, 255, 0.22)"
                  : "rgba(255, 255, 255, 0.08)",
              }}
            >
              {/* Question Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Question {q.number}
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-xs font-medium text-zinc-400 capitalize">
                    {q.type.replace("_", " ")}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status Badge */}
                  {isCorrect ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 text-white border border-white/25">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      <span>Correct (+{q.score} pt)</span>
                    </span>
                  ) : isUnanswered ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/[0.04] text-zinc-400 border border-white/10">
                      <AlertCircle className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Unanswered (0.0 pt)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-900 text-zinc-300 border border-white/10">
                      <XCircle className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Incorrect (0.0 pt)</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <h3 className="text-base sm:text-lg font-bold text-white mb-4 leading-relaxed">
                {q.question_text}
              </h3>

              {/* Answers Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {/* User Answer */}
                <div
                  className={`p-3.5 rounded-xl border text-sm ${
                    isCorrect
                      ? "bg-white/[0.06] border-white/20 text-white"
                      : isUnanswered
                      ? "bg-white/[0.02] border-white/5 text-zinc-500 italic"
                      : "bg-zinc-900/60 border-white/10 text-zinc-300"
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-1 text-zinc-400">
                    Your Submitted Answer:
                  </div>
                  <div className="font-medium whitespace-pre-wrap">
                    {q.user_answer_text || "No answer submitted"}
                  </div>
                </div>

                {/* Correct Answer */}
                <div className="p-3.5 rounded-xl border bg-white/[0.08] border-white/25 text-white text-sm">
                  <div className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                    Correct Answer:
                  </div>
                  <div className="font-bold whitespace-pre-wrap text-white">
                    {q.correct_answer_text}
                  </div>
                </div>
              </div>

              {/* Qualitative AI Feedback if Short Answer */}
              {q.feedback && q.type === "short_answer" && (
                <div className="mb-4 p-3.5 rounded-xl bg-zinc-900/80 border border-white/15 text-zinc-200 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5 font-bold text-white mb-1">
                    <Sparkles className="w-4 h-4 text-white" />
                    <span>Nemotron AI Feedback:</span>
                  </div>
                  <p className="leading-relaxed text-zinc-300">{q.feedback}</p>
                </div>
              )}

              {/* Explanation Box */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 text-xs sm:text-sm text-zinc-300">
                <div className="flex items-center gap-1.5 font-bold text-white mb-1">
                  <BookOpen className="w-4 h-4 text-white" />
                  <span>Curriculum Explanation:</span>
                </div>
                <p className="leading-relaxed text-zinc-400">{q.explanation}</p>
              </div>

              {/* Grounded Source Citations */}
              {q.sources && q.sources.length > 0 && (
                <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                  <FileText className="w-3.5 h-3.5 text-zinc-500" />
                  <span>
                    Grounded Source:{" "}
                    {q.sources.map((s, sIdx) => (
                      <span key={sIdx} className="font-semibold text-zinc-300">
                        {s.page ? `Page ${s.page}` : s.source_id}
                        {sIdx < (q.sources?.length ?? 0) - 1 ? ", " : ""}
                      </span>
                    ))}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {filteredQuestions.length === 0 && (
          <div className="p-8 text-center bg-white/[0.02] rounded-2xl border border-white/5 text-zinc-500 text-sm">
            No questions match the selected filter.
          </div>
        )}
      </div>
    </div>
  );
};
