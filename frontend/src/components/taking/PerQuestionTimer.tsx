"use client";

import React, { useState, useEffect, useRef } from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface PerQuestionTimerProps {
  durationSeconds: number;
  questionIndex: number;
  onTimeout: () => void;
  isPaused?: boolean;
}

export const PerQuestionTimer: React.FC<PerQuestionTimerProps> = ({
  durationSeconds,
  onTimeout,
  isPaused = false,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(durationSeconds);
  const targetEndRef = useRef<number | null>(null);
  const pausedRemainingRef = useRef<number>(durationSeconds);
  const hasTimedOutRef = useRef(false);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  // Interval loop anchored to Date.now()
  useEffect(() => {
    if (isPaused) {
      if (targetEndRef.current !== null) {
        pausedRemainingRef.current = Math.max(
          0,
          Math.ceil((targetEndRef.current - Date.now()) / 1000)
        );
      }
      return;
    }

    targetEndRef.current = Date.now() + pausedRemainingRef.current * 1000;

    const interval = setInterval(() => {
      if (!targetEndRef.current) return;
      const now = Date.now();
      const diffMs = targetEndRef.current - now;
      const remainingSec = Math.max(0, Math.ceil(diffMs / 1000));

      setSecondsRemaining(remainingSec);

      if (remainingSec <= 0 && !hasTimedOutRef.current) {
        hasTimedOutRef.current = true;
        clearInterval(interval);
        onTimeoutRef.current();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isPaused]);

  const isLowTime = secondsRemaining <= 5 && secondsRemaining > 0;
  const isExpired = secondsRemaining === 0;

  // Format mm:ss
  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timeFormatted = `${mins}:${secs < 10 ? "0" : ""}${secs}`;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono transition-colors ${
        isExpired
          ? "bg-zinc-900 text-zinc-500 border border-zinc-800"
          : isLowTime
          ? "bg-white text-black font-bold border border-white"
          : "bg-zinc-900 text-white border border-zinc-800"
      }`}
      role="timer"
      aria-label={`${secondsRemaining} seconds remaining for this question`}
    >
      {isLowTime ? (
        <AlertTriangle className="w-3.5 h-3.5 text-black" />
      ) : (
        <Clock className="w-3.5 h-3.5 text-zinc-400" />
      )}
      <span className="tabular-nums font-mono text-xs">
        {timeFormatted}
      </span>
      {isLowTime && <span className="text-[10px] uppercase font-bold">Hurry</span>}
    </div>
  );
};
