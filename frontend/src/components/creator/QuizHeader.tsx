"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Eye,
  Save,
  X,
  Edit3,
  Play,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  FileText,
  KeyRound,
} from "lucide-react";

interface QuizHeaderProps {
  quizTitle: string;
  onTitleChange: (newTitle: string) => void;
  onPreview: () => void;
  onTakeQuiz?: () => void;
  onCancel: () => void;
  onSave: () => void;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  lastSavedAt?: string;
  saveError?: string | null;
  onExportQuestions?: (format: "markdown" | "txt") => void;
  onExportAnswerKey?: (format: "markdown" | "txt") => void;
}

export const QuizHeader: React.FC<QuizHeaderProps> = ({
  quizTitle,
  onTitleChange,
  onPreview,
  onTakeQuiz,
  onCancel,
  onSave,
  isSaving = false,
  hasUnsavedChanges = false,
  lastSavedAt,
  saveError = null,
  onExportQuestions,
  onExportAnswerKey,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    if (isExportMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExportMenuOpen]);

  return (
    <header className="px-6 py-4 border-b border-zinc-800 bg-zinc-950 flex flex-wrap items-center justify-between gap-4">
      {/* Left: Product/editor title & save status */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight text-white">
          Quiz Creator
        </h1>
        <span className="text-zinc-700">|</span>

        {isEditingTitle ? (
          <input
            type="text"
            value={quizTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            onBlur={() => setIsEditingTitle(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setIsEditingTitle(false);
            }}
            autoFocus
            className="text-sm font-medium text-white border-b border-white bg-transparent focus:outline-none px-1 py-0.5"
            placeholder="Enter quiz title..."
          />
        ) : (
          <button
            onClick={() => setIsEditingTitle(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 hover:text-white group transition-colors"
            title="Click to rename quiz"
          >
            <span className="font-semibold text-white">{quizTitle || "Untitled Quiz"}</span>
            <Edit3 className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" />
          </button>
        )}

        {/* Save Status Badge */}
        <div className="hidden sm:flex items-center gap-1.5 ml-2">
          {isSaving ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/10 text-white border border-white/20">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              Saving...
            </span>
          ) : saveError ? (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-900 text-zinc-300 border border-zinc-700"
              title={saveError}
            >
              <AlertCircle className="w-3 h-3 text-zinc-400" />
              Save failed
            </span>
          ) : hasUnsavedChanges ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-900 text-zinc-400 border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              Unsaved changes
            </span>
          ) : lastSavedAt ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/10 text-white border border-white/20">
              <CheckCircle2 className="w-3 h-3 text-white" />
              Saved ({lastSavedAt})
            </span>
          ) : null}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2.5">
        {/* Export Dropdown */}
        {(onExportQuestions || onExportAnswerKey) && (
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-zinc-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all shadow-xs active:scale-[0.98]"
              title="Export quiz questions or answer key"
            >
              <Download className="w-4 h-4 text-zinc-300" />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {isExportMenuOpen && (
              <div
                className="absolute right-0 mt-1.5 w-56 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                }}
              >
                <div className="px-3 py-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Quiz Questions (Student-Facing)
                </div>
                {onExportQuestions && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onExportQuestions("markdown");
                        setIsExportMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white flex items-center gap-2 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-white" />
                      <span>Download Questions (.md)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onExportQuestions("txt");
                        setIsExportMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white flex items-center gap-2 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Download Questions (.txt)</span>
                    </button>
                  </>
                )}

                <div className="my-1 border-t border-white/5" />

                <div className="px-3 py-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Separate Answer Key
                </div>
                {onExportAnswerKey && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onExportAnswerKey("markdown");
                        setIsExportMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white flex items-center gap-2 transition-colors"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-white" />
                      <span>Download Answer Key (.md)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onExportAnswerKey("txt");
                        setIsExportMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white flex items-center gap-2 transition-colors"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Download Answer Key (.txt)</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Preview button */}
        <button
          type="button"
          onClick={onPreview}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-850 hover:text-white transition-all shadow-xs active:scale-[0.98]"
        >
          <Eye className="w-4 h-4 text-zinc-400" />
          <span className="hidden sm:inline">Preview</span>
        </button>

        {/* Take Quiz button */}
        {onTakeQuiz && (
          <button
            type="button"
            onClick={onTakeQuiz}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-zinc-900 bg-zinc-200 hover:bg-white rounded-lg transition-all shadow-xs active:scale-[0.98]"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Take Quiz</span>
          </button>
        )}

        {/* Cancel button */}
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-lg hover:bg-zinc-900 transition-all shadow-xs active:scale-[0.98]"
        >
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">Cancel</span>
        </button>

        {/* Save button */}
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-bold text-zinc-950 bg-zinc-100 hover:bg-white rounded-lg transition-all shadow-xs active:scale-[0.98] disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? "Saving..." : "Save"}</span>
        </button>
      </div>
    </header>
  );
};
