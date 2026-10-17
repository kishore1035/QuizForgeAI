"use client";

import React from "react";
import {
  Flame,
  Plus,
  Clock,
  Layers,
  History,
  Target,
  Settings,
  HelpCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HealthResponse } from "@/types/api";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onOpenNewQuiz: () => void;
  onOpenLibrary?: () => void;
  health: HealthResponse | null;
  isOnline: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  onOpenNewQuiz,
  onOpenLibrary,
  health,
  isOnline,
}) => {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 flex flex-col justify-between w-72 bg-zinc-950 border-r border-zinc-800/80 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top: Branding & New Quiz */}
        <div className="p-4 space-y-4">
          {/* Logo & Product Brand */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center shadow-md font-black">
                <Flame className="w-5 h-5 text-black" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                  QuizForge AI
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-white border border-white/20">
                    AI
                  </span>
                </h1>
                <p className="text-[11px] text-zinc-400">Turn Anything Into a Quiz</p>
              </div>
            </div>

            {/* Collapse toggle (Desktop only) */}
            <button
              onClick={onToggle}
              className="hidden md:flex p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/10 transition-colors"
              title="Toggle sidebar"
            >
              {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          {/* New Quiz Primary Action */}
          <div className="pt-1">
            <Button
              variant="primary"
              size="md"
              onClick={onOpenNewQuiz}
              className="w-full justify-between group"
              leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
              rightIcon={
                <span className="text-[10px] font-mono opacity-60 bg-black/40 text-white px-1.5 py-0.5 rounded">
                  Ctrl+N
                </span>
              }
            >
              New Quiz
            </Button>
          </div>

          {/* Quick Navigation / Workspace Sections */}
          <nav className="space-y-1 pt-2">
            <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-white bg-white/10 border border-white/20 shadow-sm">
              <Layers className="w-4 h-4 text-white" />
              <span>Workspace</span>
              <Badge variant="outline" size="sm" className="ml-auto font-mono text-[10px]">
                Active
              </Badge>
            </button>

            {onOpenLibrary && (
              <button
                onClick={onOpenLibrary}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-zinc-400" />
                <span>Quiz Library</span>
              </button>
            )}

            <button
              onClick={onOpenNewQuiz}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
            >
              <Target className="w-4 h-4 text-zinc-500" />
              <span>Weak Topics</span>
              <span className="text-[10px] text-zinc-600 ml-auto">Stage 2</span>
            </button>

            <button
              onClick={onOpenNewQuiz}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
            >
              <History className="w-4 h-4 text-zinc-500" />
              <span>Practice History</span>
              <span className="text-[10px] text-zinc-600 ml-auto">Stage 2</span>
            </button>
          </nav>
        </div>

        {/* Center: Recent Quizzes Section with Empty State */}
        <div className="flex-1 px-4 py-2 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Recent Quizzes</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">0 total</span>
          </div>

          {/* Recent Quizzes Empty State */}
          <div className="p-4 rounded-xl border border-white/10 bg-zinc-900/40 text-center my-3">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-2 text-zinc-400">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <p className="text-xs font-medium text-zinc-200">No recent quizzes yet</p>
            <p className="text-[11px] text-zinc-500 mt-1 leading-normal">
              Quizzes you create will appear here for practice and review.
            </p>
            <button
              onClick={onOpenNewQuiz}
              className="mt-3 text-xs text-white hover:underline font-semibold inline-block"
            >
              + Create first quiz
            </button>
          </div>
        </div>

        {/* Bottom: Server & AI Engine Status Card */}
        <div className="p-4 border-t border-white/10 bg-zinc-950 space-y-3">
          <div className="p-3 rounded-xl bg-zinc-900/70 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-zinc-400" />
                Backend Engine
              </span>
              <span className="flex items-center gap-1 text-[11px]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isOnline ? "bg-white" : "bg-zinc-600 animate-pulse"
                  }`}
                />
                <span className={isOnline ? "text-white font-medium" : "text-zinc-500"}>
                  {isOnline ? "Connected" : "Offline"}
                </span>
              </span>
            </div>

            <div className="text-[11px] text-zinc-400 font-mono truncate">
              {health ? `${health.app_name} (${health.version})` : "FastAPI Backend (Port 8000)"}
            </div>

            <div className="text-[10px] text-zinc-400 pt-1 border-t border-white/5 flex items-center justify-between">
              <span>Model Target:</span>
              <span className="text-white font-mono">nemotron-3-nano:30b-cloud</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
            <span className="text-[11px]">v0.1.0 Foundation</span>
            <div className="flex items-center gap-2">
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-zinc-400 hover:text-zinc-200 hover:underline"
              >
                API Docs
              </a>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
