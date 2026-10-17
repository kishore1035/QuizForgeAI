"use client";

import React from "react";
import { Clock, HelpCircle } from "lucide-react";
import { DURATION_PRESETS } from "@/lib/durationPresets";
import { TimeLimitConfig } from "@/types/creator";

interface TimeLimitSelectorProps {
  timeLimit: TimeLimitConfig;
  onChange: (updated: Partial<TimeLimitConfig>) => void;
}

export const TimeLimitSelector: React.FC<TimeLimitSelectorProps> = ({
  timeLimit,
  onChange,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800 shadow-xl space-y-4">
      {/* Header with Monochrome Toggle */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-zinc-400" />
          <h3 className="text-sm font-bold text-zinc-100">Time Limit</h3>
        </div>

        {/* Toggle Switch */}
        <button
          type="button"
          role="switch"
          aria-checked={timeLimit.enabled}
          onClick={() => onChange({ enabled: !timeLimit.enabled })}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-zinc-400 ${
            timeLimit.enabled ? "bg-zinc-200" : "bg-zinc-800"
          }`}
          title="Toggle question timer"
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-sm ring-0 transition duration-200 ease-in-out ${
              timeLimit.enabled ? "translate-x-4 bg-zinc-950" : "translate-x-0 bg-zinc-500"
            }`}
          />
        </button>
      </div>

      {/* Accessible Note: Per Question */}
      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
        <HelpCircle className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
        <span>Time limit applies <strong className="text-zinc-300">per question</strong></span>
      </div>

      {/* Presets Grid */}
      {timeLimit.enabled ? (
        <div className="grid grid-cols-4 gap-1.5 max-h-56 overflow-y-auto pr-1">
          {DURATION_PRESETS.map((preset) => {
            const isSelected = timeLimit.selectedLabel === preset.label;

            return (
              <button
                key={preset.label}
                type="button"
                onClick={() =>
                  onChange({
                    selectedLabel: preset.label,
                    secondsPerQuestion: preset.seconds,
                  })
                }
                className={`py-1.5 px-1 rounded-lg text-xs font-semibold text-center border transition-all select-none ${
                  isSelected
                    ? "border-zinc-400 bg-zinc-200 text-zinc-950 font-bold shadow-xs"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="py-6 px-3 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 text-center">
          <p className="text-xs text-zinc-400 font-medium">Timer disabled</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Toggle on above to enforce a duration per question
          </p>
        </div>
      )}
    </div>
  );
};
