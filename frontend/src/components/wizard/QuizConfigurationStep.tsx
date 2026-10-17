"use client";

import React from "react";
import { Check, Clock, Sliders, HelpCircle } from "lucide-react";
import { QuizConfigFormState } from "@/types/wizard";

interface QuizConfigurationStepProps {
  config: QuizConfigFormState;
  onUpdateConfig: (updated: Partial<QuizConfigFormState>) => void;
  defaultDerivedTitle: string;
}

const QUESTION_COUNT_PRESETS = [5, 10, 15, 20, 25, 50];

const DIFFICULTY_OPTIONS: Array<{
  value: "easy" | "medium" | "hard" | "mixed";
  label: string;
  description: string;
}> = [
  { value: "easy", label: "Easy", description: "Foundational concepts and recall" },
  { value: "medium", label: "Medium", description: "Standard exam-level difficulty" },
  { value: "hard", label: "Hard", description: "Complex synthesis and deep reasoning" },
  {
    value: "mixed",
    label: "Mixed",
    description: "Diverse blend across all cognitive levels",
  },
];

const QUESTION_TYPE_OPTIONS = [
  { id: "multiple_choice", label: "Multiple Choice Questions (MCQs)" },
  { id: "true_false", label: "True / False" },
  { id: "short_answer", label: "Short Answer" },
];

const TIMER_PRESETS = [15, 30, 45, 60, 90, 120, 180];

export const QuizConfigurationStep: React.FC<QuizConfigurationStepProps> = ({
  config,
  onUpdateConfig,
  defaultDerivedTitle,
}) => {
  const toggleQuestionType = (typeId: string) => {
    if (config.question_types.includes(typeId)) {
      if (config.question_types.length <= 1) return; // Keep at least one
      onUpdateConfig({
        question_types: config.question_types.filter((t) => t !== typeId),
      });
    } else {
      onUpdateConfig({
        question_types: [...config.question_types, typeId],
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Quiz Title Card */}
      <div className="p-6 rounded-2xl bg-zinc-950/80 border border-white/10 shadow-xl space-y-3">
        <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
          Quiz Title
        </label>
        <input
          type="text"
          value={config.title}
          onChange={(e) => onUpdateConfig({ title: e.target.value })}
          placeholder={defaultDerivedTitle || "Enter quiz title..."}
          className="w-full px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-sm font-semibold text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 transition-all"
        />
        <p className="text-[11px] text-zinc-500">
          Leave blank to use the automatically derived title: &ldquo;{defaultDerivedTitle || "Untitled Quiz"}&rdquo;
        </p>
      </div>

      {/* 2. Number of Questions & Difficulty */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Number of Questions */}
        <div className="p-5 rounded-2xl bg-zinc-950/80 border border-white/10 shadow-xl space-y-3">
          <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
            Number of Questions:{" "}
            <span className="text-white font-extrabold">{config.question_count}</span>
          </label>

          <div className="grid grid-cols-3 gap-2">
            {QUESTION_COUNT_PRESETS.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => onUpdateConfig({ question_count: count })}
                className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                  config.question_count === count
                    ? "border-zinc-400 bg-zinc-200 text-zinc-950 font-bold shadow-xs"
                    : "border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/50"
                }`}
              >
                {count} Qs
              </button>
            ))}
          </div>

          <div className="pt-1 flex items-center gap-2">
            <span className="text-[11px] text-zinc-400">Custom count:</span>
            <input
              type="number"
              min={1}
              max={100}
              value={config.question_count}
              onChange={(e) =>
                onUpdateConfig({
                  question_count: Math.max(1, Math.min(100, Number(e.target.value) || 1)),
                })
              }
              className="w-20 px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-950 text-xs font-bold text-white text-center focus:outline-none focus:border-zinc-500"
            />
            <span className="text-[11px] text-zinc-500">(1 to 100 max)</span>
          </div>
        </div>

        {/* Difficulty */}
        <div className="p-5 rounded-2xl bg-zinc-950/80 border border-white/10 shadow-xl space-y-3">
          <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
            Difficulty Level
          </label>

          <div className="grid grid-cols-2 gap-2">
            {DIFFICULTY_OPTIONS.map((diff) => (
              <button
                key={diff.value}
                type="button"
                onClick={() => onUpdateConfig({ difficulty: diff.value })}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  config.difficulty === diff.value
                    ? "border-zinc-400 bg-zinc-200 text-zinc-950 font-bold shadow-xs"
                    : "border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/50"
                }`}
              >
                <p className="text-xs font-bold">{diff.label}</p>
                <p
                  className={`text-[10px] mt-0.5 leading-tight ${
                    config.difficulty === diff.value ? "text-zinc-700" : "text-zinc-500"
                  }`}
                >
                  {diff.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Question Types */}
      <div className="p-5 rounded-2xl bg-zinc-950/80 border border-white/10 shadow-xl space-y-3">
        <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
          Question Types (Multi-Select)
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {QUESTION_TYPE_OPTIONS.map((item) => {
            const isChecked = config.question_types.includes(item.id);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleQuestionType(item.id)}
                className={`p-3 rounded-xl border flex items-center gap-2.5 text-left transition-all ${
                  isChecked
                    ? "border-zinc-500 bg-zinc-900 text-zinc-100 ring-1 ring-zinc-500/25"
                    : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                    isChecked
                      ? "bg-zinc-200 border-zinc-200 text-zinc-950 font-bold"
                      : "border-zinc-700 bg-zinc-950"
                  }`}
                >
                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className="text-xs font-semibold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Time Limit Configuration (Per Question) */}
      <div className="p-5 rounded-2xl bg-zinc-950/80 border border-white/10 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-300" />
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Time Limit (Per Question)
            </label>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={config.time_limit_enabled}
            onClick={() =>
              onUpdateConfig({ time_limit_enabled: !config.time_limit_enabled })
            }
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
              config.time_limit_enabled ? "bg-zinc-200" : "bg-zinc-800"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-sm transition duration-200 ${
                config.time_limit_enabled
                  ? "translate-x-4 bg-zinc-950"
                  : "translate-x-0 bg-zinc-500"
              }`}
            />
          </button>
        </div>

        {config.time_limit_enabled ? (
          <div className="space-y-2 pt-1">
            <div className="flex flex-wrap gap-2">
              {TIMER_PRESETS.map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  onClick={() => onUpdateConfig({ time_limit_seconds: seconds })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    config.time_limit_seconds === seconds
                      ? "border-zinc-400 bg-zinc-200 text-zinc-950 font-bold shadow-xs"
                      : "border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/50"
                  }`}
                >
                  {seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-zinc-400">
              Each question during practice will count down from {config.time_limit_seconds} seconds.
            </p>
          </div>
        ) : (
          <p className="text-xs text-zinc-500">
            Timer disabled. Learners can answer at their own pace.
          </p>
        )}
      </div>

      {/* 5. Optional Context & Instructions */}
      <div className="p-5 rounded-2xl bg-zinc-950/80 border border-white/10 shadow-xl space-y-4">
        <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
          Academic Context & Instructions (Optional)
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] text-zinc-400 font-semibold block mb-1">Subject</label>
            <input
              type="text"
              value={config.subject}
              onChange={(e) => onUpdateConfig({ subject: e.target.value })}
              placeholder="e.g., Computer Science"
              className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 transition-all"
            />
          </div>

          <div>
            <label className="text-[11px] text-zinc-400 font-semibold block mb-1">Exam</label>
            <input
              type="text"
              value={config.exam}
              onChange={(e) => onUpdateConfig({ exam: e.target.value })}
              placeholder="e.g., AP Exam, SAT"
              className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 transition-all"
            />
          </div>

          <div>
            <label className="text-[11px] text-zinc-400 font-semibold block mb-1">Academic Year</label>
            <input
              type="text"
              value={config.academic_year}
              onChange={(e) => onUpdateConfig({ academic_year: e.target.value })}
              placeholder="e.g., 2026"
              className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] text-zinc-400 font-semibold block mb-1">
            Prompt Instructions for AI Engine
          </label>
          <textarea
            value={config.additional_instructions}
            onChange={(e) => onUpdateConfig({ additional_instructions: e.target.value })}
            rows={2}
            placeholder="e.g., Emphasize core definitions and edge cases."
            className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 resize-none transition-all"
          />
        </div>
      </div>
    </div>
  );
};
