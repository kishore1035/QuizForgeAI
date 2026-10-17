"use client";

import React from "react";
import {
  Flame,
  LayoutDashboard,
  Zap,
  Edit3,
  Layers,
  Plus,
} from "lucide-react";
import { HealthResponse } from "@/types/api";

export type ActiveView = "wizard" | "creator" | "workspace" | "taking" | "library";

interface IconRailProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  health: HealthResponse | null;
  isOnline: boolean;
}

interface NavItem {
  id: ActiveView;
  icon: React.ReactNode;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "workspace",
    icon: <LayoutDashboard className="w-4 h-4" />,
    label: "Dashboard",
  },
  {
    id: "wizard",
    icon: <Zap className="w-4 h-4" />,
    label: "Generate Quiz",
  },
  {
    id: "creator",
    icon: <Edit3 className="w-4 h-4" />,
    label: "Question Editor",
  },
  {
    id: "library",
    icon: <Layers className="w-4 h-4" />,
    label: "Quiz Library",
  },
];

export const IconRail: React.FC<IconRailProps> = ({
  activeView,
  onNavigate,
  health,
  isOnline,
}) => {
  return (
    <aside
      className="fixed left-0 top-0 h-screen w-14 flex flex-col items-center justify-between py-4 z-50 select-none bg-black border-r border-white/10"
      aria-label="Navigation rail"
    >
      {/* Top: Logo & Nav items */}
      <div className="flex flex-col items-center gap-4 w-full">
        {/* Minimalist Logo */}
        <button
          onClick={() => onNavigate("workspace")}
          className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-950 flex items-center justify-center font-black transition-transform hover:scale-105 active:scale-95 shadow-xs"
          title="QuizForge AI"
        >
          <Flame className="w-4 h-4 fill-current text-zinc-950" />
        </button>

        <div className="w-5 h-[1px] bg-white/15 my-1" />

        {/* Navigation list */}
        <nav className="flex flex-col items-center gap-1.5 w-full px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors group ${
                  isActive
                    ? "bg-zinc-100 text-zinc-950 shadow-xs"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
                title={item.label}
              >
                {item.icon}

                {/* Tooltip */}
                <span className="absolute left-full ml-3 px-2 py-1 rounded bg-black text-white text-[11px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity border border-white/20 z-50">
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* New Quiz button */}
          <div className="mt-2 pt-2 border-t border-white/10 w-full flex justify-center">
            <button
              onClick={() => onNavigate("wizard")}
              className="w-9 h-9 rounded-lg border border-zinc-700 text-zinc-300 flex items-center justify-center hover:bg-zinc-100 hover:text-zinc-950 transition-colors group relative"
              title="New Quiz (Ctrl+N)"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="absolute left-full ml-3 px-2 py-1 rounded bg-black text-white text-[11px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity border border-white/20 z-50">
                New Quiz [Ctrl+N]
              </span>
            </button>
          </div>
        </nav>
      </div>

      {/* Bottom: Monochrome Status */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative group cursor-pointer p-1">
          <div
            className={`w-2 h-2 rounded-full ${
              isOnline ? "bg-white" : "border border-zinc-500 animate-pulse"
            }`}
          />
          <span className="absolute left-full ml-3 bottom-0 px-2 py-1 rounded bg-black text-white text-[11px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity border border-white/20 z-50">
            {isOnline
              ? `Backend Active (${health?.model_target || "Local"})`
              : "Backend Offline"}
          </span>
        </div>
      </div>
    </aside>
  );
};
