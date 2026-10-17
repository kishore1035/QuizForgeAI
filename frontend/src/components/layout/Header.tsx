"use client";

import React from "react";
import { Menu, Cpu, Activity, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { HealthResponse } from "@/types/api";

interface HeaderProps {
  onToggleSidebar?: () => void;
  onOpenNewQuiz: () => void;
  health: HealthResponse | null;
  isOnline: boolean;
  isLoadingHealth: boolean;
  onRefreshHealth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenNewQuiz,
  health,
  isOnline,
  isLoadingHealth,
  onRefreshHealth,
}) => {
  return (
    <header className="h-14 border-b border-white/10 bg-black sticky top-0 z-20 px-4 md:px-8 flex items-center justify-between">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            aria-label="Toggle Navigation Sidebar"
            className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-white tracking-tight">QuizForge</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-400 font-medium">Workspace</span>
        </div>
      </div>

      {/* Center: Model Indicator */}
      <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs">
        <Cpu className="w-3.5 h-3.5 text-zinc-400" />
        <span className="text-zinc-400 text-[11px]">Model:</span>
        <span className="font-mono text-zinc-200 text-[11px]">
          {health?.model_target || "nemotron-3-nano"}
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-white ml-1" />
      </div>

      {/* Right: Health & New Quiz Action */}
      <div className="flex items-center gap-2">
        <button
          onClick={onRefreshHealth}
          title="Refresh backend status"
          disabled={isLoadingHealth}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 transition-colors"
        >
          <Activity
            className={`w-3 h-3 text-zinc-400 ${isLoadingHealth ? "animate-spin" : ""}`}
          />
          <span className="text-[11px] font-medium hidden sm:inline">
            {isLoadingHealth
              ? "Checking..."
              : isOnline
              ? "Backend Active"
              : "Backend Offline"}
          </span>
          <RefreshCw className="w-3 h-3 text-zinc-500 hover:text-zinc-300 ml-0.5" />
        </button>

        <Button
          size="sm"
          variant="primary"
          onClick={onOpenNewQuiz}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          <span>New Quiz</span>
        </Button>
      </div>
    </header>
  );
};
