"use client";

import React from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

export interface ValidationErrorItem {
  questionNumber?: number;
  message: string;
}

interface SaveValidationMessagesProps {
  isOpen: boolean;
  onClose: () => void;
  isValid: boolean;
  errors: ValidationErrorItem[];
  savedAt?: string;
}

export const SaveValidationMessages: React.FC<SaveValidationMessagesProps> = ({
  isOpen,
  onClose,
  isValid,
  errors,
  savedAt,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-2xl shadow-2xl p-6 border animate-in fade-in-0 zoom-in-95 duration-150 text-white"
        style={{
          background: "var(--bg-surface)",
          borderColor: "rgba(255, 255, 255, 0.12)",
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center justify-center font-bold">
              {isValid ? <CheckCircle2 className="w-5 h-5 text-zinc-200" /> : <AlertCircle className="w-5 h-5 text-zinc-400" />}
            </div>
            <div>
              <h4 className="text-base font-bold text-zinc-100">
                {isValid ? "Quiz Saved Successfully" : "Validation Errors"}
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                {isValid
                  ? `Saved to local state at ${savedAt || "just now"}`
                  : "Please resolve the following issues before saving:"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Errors list */}
        {!isValid && (
          <div className="mt-4 max-h-56 overflow-y-auto space-y-2 pr-1">
            {errors.map((err, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex items-start gap-2"
              >
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-zinc-400" />
                <span>
                  {err.questionNumber ? (
                    <strong className="text-zinc-200">Question {err.questionNumber}: </strong>
                  ) : null}
                  {err.message}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-zinc-950 bg-zinc-100 hover:bg-white transition-colors shadow-xs"
          >
            {isValid ? "Done" : "Review Questions"}
          </button>
        </div>
      </div>
    </div>
  );
};
