"use client";

import React from "react";
import { Check, Trash2, Plus } from "lucide-react";
import { OptionItem } from "@/types/creator";

interface OptionEditorProps {
  options: OptionItem[];
  correctOptionId: string | null;
  onUpdateOptionText: (id: string, text: string) => void;
  onSelectCorrectOption: (id: string) => void;
  onAddOption: () => void;
  onRemoveOption: (id: string) => void;
}

export const OptionEditor: React.FC<OptionEditorProps> = ({
  options,
  correctOptionId,
  onUpdateOptionText,
  onSelectCorrectOption,
  onAddOption,
  onRemoveOption,
}) => {
  return (
    <div className="space-y-3">
      {options.map((option, index) => {
        const isCorrect = option.id === correctOptionId;
        const placeholderNumber = index + 1;

        return (
          <div
            key={option.id}
            className={`group flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
              isCorrect
                ? "bg-zinc-900 border-zinc-500 ring-1 ring-zinc-500/25"
                : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
            }`}
          >
            {/* Circular Letter Indicator */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs select-none transition-colors ${
                isCorrect
                  ? "bg-zinc-200 text-zinc-950 font-bold shadow-xs"
                  : "bg-zinc-900 text-zinc-400 group-hover:bg-zinc-800"
              }`}
            >
              {option.label}
            </div>

            {/* Option Text Input */}
            <input
              type="text"
              value={option.text}
              onChange={(e) => onUpdateOptionText(option.id, e.target.value)}
              placeholder={`Enter option ${placeholderNumber}`}
              className="flex-1 text-sm text-zinc-100 placeholder-zinc-500 bg-transparent focus:outline-none px-2 py-1"
            />

            {/* Remove Option Button (if more than 2 options) */}
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => onRemoveOption(option.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-800 transition-all"
                title="Remove option"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Radio Control on the Right */}
            <button
              type="button"
              onClick={() => onSelectCorrectOption(option.id)}
              className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all focus:outline-none focus:ring-1 focus:ring-zinc-400 ${
                isCorrect
                  ? "border-zinc-300 bg-zinc-200 text-zinc-950"
                  : "border-zinc-700 hover:border-zinc-500 bg-zinc-950"
              }`}
              title={isCorrect ? "Marked as correct answer" : "Click to mark as correct answer"}
            >
              {isCorrect && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </button>
          </div>
        );
      })}

      {/* Compact Add Option control */}
      {options.length < 6 && (
        <div className="pt-1 flex justify-start">
          <button
            type="button"
            onClick={onAddOption}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white hover:underline px-1 py-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add another option</span>
          </button>
        </div>
      )}
    </div>
  );
};
