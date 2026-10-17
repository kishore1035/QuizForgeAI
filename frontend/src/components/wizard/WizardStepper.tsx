"use client";

import React from "react";
import { Check, Sparkles, Sliders, Layers } from "lucide-react";
import { WizardStep } from "@/types/wizard";

interface WizardStepperProps {
  currentStep: WizardStep;
  onStepClick: (step: WizardStep) => void;
  canNavigateToStep: (step: WizardStep) => boolean;
}

export const WizardStepper: React.FC<WizardStepperProps> = ({
  currentStep,
  onStepClick,
  canNavigateToStep,
}) => {
  const steps = [
    { number: 1 as WizardStep, label: "Choose Source", icon: Layers },
    { number: 2 as WizardStep, label: "Configure Quiz", icon: Sliders },
    { number: 3 as WizardStep, label: "Generate Quiz", icon: Sparkles },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between relative">
        {/* Background Connecting Line */}
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-px bg-white/10 -z-0" />

        {steps.map((s) => {
          const isCurrent = currentStep === s.number;
          const isCompleted = currentStep > s.number;
          const isClickable = canNavigateToStep(s.number);

          return (
            <button
              key={s.number}
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick(s.number)}
              className={`relative z-10 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border transition-all duration-200 select-none ${
                isCurrent
                  ? "border-zinc-300 bg-zinc-200 text-zinc-950 shadow-xs"
                  : isCompleted
                  ? "border-white/20 bg-zinc-900 text-zinc-300 hover:border-white/40 cursor-pointer"
                  : "border-white/10 bg-zinc-950 text-zinc-600 opacity-60 cursor-not-allowed"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black transition-colors ${
                  isCurrent
                    ? "bg-zinc-950 text-zinc-100"
                    : isCompleted
                    ? "bg-white/10 text-white"
                    : "bg-white/5 text-zinc-500"
                }`}
              >
                {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : s.number}
              </div>

              <span
                className={`text-xs font-semibold ${
                  isCurrent
                    ? "text-zinc-950 font-bold"
                    : isCompleted
                    ? "text-zinc-200"
                    : "text-zinc-500"
                }`}
              >
                Step {s.number} — {s.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
