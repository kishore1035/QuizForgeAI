"use client";

import React, { useState, useEffect } from "react";
import { Flame, CheckCircle2 } from "lucide-react";

interface SplashScreenProps {
  onComplete?: () => void;
  minDurationMs?: number;
}

const BOOT_STAGES = [
  "INITIALIZING NEURAL RUNTIME...",
  "CONNECTING ASSESSMENT ENGINE...",
  "SYNCING LOCAL REPOSITORY...",
  "SYSTEM READY",
];

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  minDurationMs = 1400,
}) => {
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    // Progress increment timer
    const intervalTime = 30;
    const totalSteps = minDurationMs / intervalTime;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const currentPercent = Math.min(100, Math.round((currentStep / totalSteps) * 100));
      setProgress(currentPercent);

      if (currentPercent < 30) {
        setStageIndex(0);
      } else if (currentPercent < 65) {
        setStageIndex(1);
      } else if (currentPercent < 90) {
        setStageIndex(2);
      } else {
        setStageIndex(3);
      }

      if (currentStep >= totalSteps) {
        clearInterval(interval);
        handleDismiss();
      }
    }, intervalTime);

    // Keyboard dismissal (Escape, Space, Enter, or any key)
    const handleKeyDown = () => {
      clearInterval(interval);
      handleDismiss();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [minDurationMs]);

  const handleDismiss = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      setIsMounted(false);
      onComplete?.();
    }, 450);
  };

  if (!isMounted) return null;

  return (
    <div
      onClick={handleDismiss}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-between p-8 bg-black select-none cursor-pointer transition-all duration-500 ease-out ${
        isFadingOut ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 45%, rgba(255, 255, 255, 0.04) 0%, transparent 65%)",
      }}
      aria-label="QuizForge AI Splash Screen"
    >
      {/* Top Header Stamp */}
      <div className="w-full flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span>QUIZFORGE AI CORE</span>
        </div>
        <div>
          <span>SYSTEM V0.3.0</span>
        </div>
      </div>

      {/* Center Branding & Progress */}
      <div className="flex flex-col items-center justify-center text-center my-auto space-y-6">
        {/* Emblem */}
        <div className="relative group">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 text-zinc-950 flex items-center justify-center shadow-2xl transition-transform group-hover:scale-105">
            <Flame className="w-8 h-8 fill-current text-zinc-950" />
          </div>
          {/* Subtle perimeter border */}
          <div className="absolute -inset-1.5 rounded-3xl border border-white/15 pointer-events-none" />
        </div>

        {/* Title & Tagline */}
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-4xl font-black tracking-[0.25em] text-white uppercase">
            QuizForge AI
          </h1>
          <p className="text-xs sm:text-sm font-mono tracking-[0.18em] text-zinc-400 uppercase">
            Neural Assessment & Practice Engine
          </p>
        </div>

        {/* Minimalist Monochrome Progress Bar */}
        <div className="space-y-2 pt-2">
          <div className="w-56 sm:w-72 h-[2px] bg-zinc-900 rounded-full overflow-hidden border border-white/10 relative">
            <div
              className="h-full bg-zinc-200 transition-all duration-75 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 w-56 sm:w-72 px-0.5">
            <span className="truncate">{BOOT_STAGES[stageIndex]}</span>
            <span className="font-bold text-white ml-2">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Footer Diagnostic & Skip Hint */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-zinc-500 border-t border-white/5 pt-3">
        <div className="flex items-center gap-3">
          <span>HOST: 127.0.0.1:3000</span>
          <span>·</span>
          <span>MODEL: NEMOTRON-3-NANO</span>
        </div>

        <div className="text-zinc-400 hover:text-white transition-colors">
          [CLICK ANYWHERE OR PRESS ANY KEY TO CONTINUE]
        </div>
      </div>
    </div>
  );
};
