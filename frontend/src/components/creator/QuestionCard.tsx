"use client";

import React from "react";
import { CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { CreatorQuestion } from "@/types/creator";

interface QuestionCardProps {
  question: CreatorQuestion;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
  canDelete: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  index,
  isSelected,
  onSelect,
  onDelete,
  canDelete,
}) => {
  const previewText = question.text.trim() || "Empty question...";
  const filledOptionsCount = question.options.filter((o) => o.text.trim().length > 0).length;
  const isShortAnswer = question.type === "short_answer";

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group relative p-3 rounded-xl border text-left cursor-pointer transition-all duration-150 select-none ${
        isSelected
          ? "bg-zinc-900 border-zinc-600 ring-1 ring-zinc-500/20 shadow-sm"
          : "bg-zinc-950 hover:bg-zinc-900/60 border-zinc-800/80"
      }`}
    >
      {/* Header: Question Number & Status */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span
            className={`text-xs font-bold ${
              isSelected ? "text-white" : "text-zinc-300"
            }`}
          >
            Question {index + 1}
          </span>
          {question.type && (
            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
              {question.type === "multiple_choice"
                ? "MCQ"
                : question.type === "true_false"
                ? "TF"
                : "Short"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {question.isComplete ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/60">
              <CheckCircle2 className="w-2.5 h-2.5 text-zinc-300" />
              Complete
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-zinc-900 text-zinc-500 border border-zinc-800">
              <AlertCircle className="w-2.5 h-2.5 text-zinc-500" />
              Incomplete
            </span>
          )}

          {canDelete && (
            <button
              onClick={onDelete}
              aria-label="Delete question"
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-all ml-1"
              title="Delete question"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Miniature Content Preview */}
      <p
        className={`text-xs line-clamp-2 leading-relaxed ${
          isSelected ? "text-white font-medium" : "text-zinc-400"
        }`}
      >
        {previewText}
      </p>

      {/* Options Summary indicator */}
      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500 pt-1.5 border-t border-white/10">
        {isShortAnswer ? (
          <>
            <span>Short Answer</span>
            {question.expectedAnswer?.trim() ? (
              <span className="text-zinc-200 font-bold">Answer set</span>
            ) : (
              <span className="text-zinc-600">No answer</span>
            )}
          </>
        ) : (
          <>
            <span>
              {filledOptionsCount}/{question.options.length} options filled
            </span>
            {question.correctOptionId ? (
              <span className="text-zinc-200 font-bold">Answer set</span>
            ) : (
              <span className="text-zinc-600">No answer</span>
            )}
          </>
        )}
      </div>
    </div>
  );
};
