"use client";

import React from "react";
import { IconRail, ActiveView } from "./IconRail";
import { Header } from "./Header";
import { useBackendHealth } from "@/hooks/useBackendHealth";
import { QuizSourceType } from "@/types/quiz";

interface MainLayoutProps {
  activeView?: ActiveView;
  onNavigate?: (view: ActiveView) => void;
  onOpenLibrary?: () => void;
  children: (props: {
    onOpenNewQuiz: () => void;
    onOpenNewQuizWithSource: (source: QuizSourceType) => void;
    health: ReturnType<typeof useBackendHealth>["health"];
    isOnline: boolean;
    isLoadingHealth: boolean;
    onRefreshHealth: () => void;
  }) => React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  activeView = "workspace",
  onNavigate,
  onOpenLibrary,
  children,
}) => {
  const { health, isLoading, isOnline, refetch } = useBackendHealth();

  const handleOpenNewQuiz = () => {
    if (onNavigate) {
      onNavigate("wizard");
    }
  };

  const handleOpenWithSource = (_source: QuizSourceType) => {
    if (onNavigate) {
      onNavigate("wizard");
    }
  };

  const handleNavigation = (view: ActiveView) => {
    if (onNavigate) {
      onNavigate(view);
    } else if (view === "library" && onOpenLibrary) {
      onOpenLibrary();
    }
  };

  return (
    <div
      className="flex h-screen w-screen overflow-hidden text-zinc-100"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Sleek Icon Rail */}
      <IconRail
        activeView={activeView}
        onNavigate={handleNavigation}
        health={health}
        isOnline={isOnline}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden" style={{ marginLeft: "56px" }}>
        <Header
          onOpenNewQuiz={handleOpenNewQuiz}
          health={health}
          isOnline={isOnline}
          isLoadingHealth={isLoading}
          onRefreshHealth={refetch}
        />

        <main className="flex-1 overflow-y-auto">
          {children({
            onOpenNewQuiz: handleOpenNewQuiz,
            onOpenNewQuizWithSource: handleOpenWithSource,
            health,
            isOnline,
            isLoadingHealth: isLoading,
            onRefreshHealth: refetch,
          })}
        </main>
      </div>
    </div>
  );
};
