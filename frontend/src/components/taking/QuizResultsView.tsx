"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  RotateCcw,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Download,
  ChevronDown,
  FileText,
} from "lucide-react";
import { AttemptResultResponse } from "@/types/attempt";
import { formatTimeSpent } from "@/lib/attemptDefaults";
import { downloadAttemptReport } from "@/lib/exportUtils";

interface QuizResultsViewProps {
  result: AttemptResultResponse;
  onReviewAnswers: () => void;
  onRetakeQuiz: () => void;
  onBackToEditor: () => void;
}

export const QuizResultsView: React.FC<QuizResultsViewProps> = ({
  result,
  onReviewAnswers,
  onRetakeQuiz,
  onBackToEditor,
}) => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const percentage = result.percentage;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
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

  // Radius for SVG ring
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-8 sm:py-12 bg-black min-h-full">
      {/* Top back button */}
      <div className="mb-6">
        <button
          type="button"
          onClick={onBackToEditor}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-600"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Question Editor</span>
        </button>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 sm:p-10 shadow-2xl">
        {/* Header Badge */}
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-zinc-900 border border-zinc-700 text-xs font-mono uppercase text-zinc-200">
            <Award className="w-3.5 h-3.5 text-white" />
            <span>Completed Assessment</span>
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mt-3">
            {result.title || "Quiz Results"}
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto font-mono">
            Score Breakdown & Answer Summary
          </p>
        </div>

        {/* Big Score Display */}
        <div className="my-8 p-8 rounded-xl border border-zinc-800 bg-black text-center flex flex-col items-center justify-center">
          <div className="relative w-36 h-36 flex items-center justify-center mb-3">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
              <circle
                cx="64"
                cy="64"
                r={radius}
                className="stroke-zinc-800"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="64"
                cy="64"
                r={radius}
                stroke="#ffffff"
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <div className="text-3xl font-mono font-black text-white tracking-tight">
                {percentage}%
              </div>
            </div>
          </div>

          <div className="text-xs font-mono uppercase tracking-wider text-zinc-400">
            Total Points: <span className="text-white font-bold">{result.total_score}</span> / {result.max_score}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {/* Correct */}
          <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 text-center">
            <div className="flex items-center justify-center gap-1 text-zinc-400 text-[10px] font-mono uppercase">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              <span>Correct</span>
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {result.correct_count}
            </div>
          </div>

          {/* Incorrect */}
          <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 text-center">
            <div className="flex items-center justify-center gap-1 text-zinc-400 text-[10px] font-mono uppercase">
              <XCircle className="w-3.5 h-3.5 text-zinc-400" />
              <span>Incorrect</span>
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {result.incorrect_count}
            </div>
          </div>

          {/* Unanswered */}
          <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 text-center">
            <div className="flex items-center justify-center gap-1 text-zinc-400 text-[10px] font-mono uppercase">
              <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
              <span>Unanswered</span>
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {result.unanswered_count}
            </div>
          </div>

          {/* Time Spent */}
          <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 text-center">
            <div className="flex items-center justify-center gap-1 text-zinc-400 text-[10px] font-mono uppercase">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Duration</span>
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {formatTimeSpent(result.time_spent_seconds)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6 border-t border-zinc-800">
          <button
            type="button"
            onClick={onReviewAnswers}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-zinc-950 bg-zinc-100 hover:bg-white transition-colors cursor-pointer shadow-xs"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Review Answers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onRetakeQuiz}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-zinc-300 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake Quiz</span>
          </button>

          {/* Export Report Dropdown */}
          <div ref={exportMenuRef} className="relative w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-zinc-300 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:text-white transition-colors"
              title="Download attempt results report"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Report</span>
              <ChevronDown className="w-3 h-3 text-zinc-500" />
            </button>

            {isExportOpen && (
              <div className="absolute right-0 bottom-full mb-2 sm:bottom-auto sm:top-full sm:mt-2 w-56 rounded-lg bg-black border border-zinc-700 py-1.5 z-30 shadow-2xl">
                <div className="px-3 py-1 text-[10px] font-mono font-bold text-zinc-500 uppercase">
                  Download Report
                </div>
                <button
                  type="button"
                  onClick={() => {
                    downloadAttemptReport(result, "markdown");
                    setIsExportOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white text-left transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  <div>
                    <div className="font-semibold text-white">Markdown (.md)</div>
                    <div className="text-[10px] text-zinc-500 font-mono">Scores & breakdown</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadAttemptReport(result, "txt");
                    setIsExportOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white text-left transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  <div>
                    <div className="font-semibold text-white">Plain Text (.txt)</div>
                    <div className="text-[10px] text-zinc-500 font-mono">Standard text format</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
