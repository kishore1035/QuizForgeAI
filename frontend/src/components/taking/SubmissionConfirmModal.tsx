"use client";

import React from "react";
import { AlertCircle, CheckCircle2, X, Send, Loader2 } from "lucide-react";

interface SubmissionConfirmModalProps {
  isOpen: boolean;
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  onConfirmSubmit: () => void;
  onClose: () => void;
  isSubmitting?: boolean;
}

export const SubmissionConfirmModal: React.FC<SubmissionConfirmModalProps> = ({
  isOpen,
  totalQuestions,
  answeredCount,
  unansweredCount,
  onConfirmSubmit,
  onClose,
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  const hasUnanswered = unansweredCount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="rounded-xl max-w-md w-full bg-black border border-white/20 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white">
              {hasUnanswered ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {hasUnanswered ? "Unanswered Questions" : "Ready to Submit?"}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                Quiz Submission
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-zinc-400 hover:text-white p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {hasUnanswered ? (
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs leading-relaxed">
              <span className="font-bold text-white uppercase">Notice:</span> You have{" "}
              <strong className="text-white">{unansweredCount}</strong> unanswered{" "}
              {unansweredCount === 1 ? "question" : "questions"} out of{" "}
              <strong className="text-white">{totalQuestions}</strong>. Unanswered questions will receive 0 points.
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs leading-relaxed">
              All <strong className="text-white">{totalQuestions}</strong> questions have been answered.
            </div>
          )}

          {/* Stat Tally */}
          <div className="grid grid-cols-3 gap-2 text-center py-1">
            <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <div className="text-[10px] font-mono text-zinc-500 uppercase">Total</div>
              <div className="text-base font-bold text-white mt-0.5">{totalQuestions}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <div className="text-[10px] font-mono text-zinc-500 uppercase">Answered</div>
              <div className="text-base font-bold text-white mt-0.5">{answeredCount}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <div className="text-[10px] font-mono text-zinc-500 uppercase">Remaining</div>
              <div className="text-base font-bold text-white mt-0.5">{unansweredCount}</div>
            </div>
          </div>

          <p className="text-[11px] text-zinc-500 text-center font-mono">
            Submission is final. Your answers will be graded immediately.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-zinc-950 border-t border-white/10 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white rounded-lg border border-zinc-800 hover:border-zinc-600 transition-colors disabled:opacity-50"
          >
            Review Answers
          </button>
          <button
            type="button"
            onClick={onConfirmSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-white text-black hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Grading...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Confirm & Submit</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
