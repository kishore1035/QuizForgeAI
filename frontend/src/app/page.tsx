"use client";

import React, { useState, useEffect } from "react";
import { IconRail, ActiveView } from "@/components/layout/IconRail";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { QuizCreator } from "@/components/creator/QuizCreator";
import { QuizGenerationWizard } from "@/components/wizard/QuizGenerationWizard";
import { QuizTakingContainer } from "@/components/taking/QuizTakingContainer";
import { QuizLibrary } from "@/components/library/QuizLibrary";
import { SplashScreen } from "@/components/ui/SplashScreen";
import { convertGeneratedQuizToCreatorState } from "@/lib/quizDefaults";
import { GeneratedQuizResponse } from "@/types/api";
import { QuizCreatorState } from "@/types/creator";
import { QuizSourceType } from "@/types/quiz";
import { WizardSourceType } from "@/types/wizard";
import { useBackendHealth } from "@/hooks/useBackendHealth";

// Unified persistent AppShell that keeps IconRail accessible everywhere
const AppShell: React.FC<{
  activeView: ActiveView;
  onNavigate: (v: ActiveView) => void;
  children: React.ReactNode;
}> = ({ activeView, onNavigate, children }) => {
  const { health, isOnline } = useBackendHealth();
  return (
    <div
      className="flex h-screen w-screen overflow-hidden text-zinc-100"
      style={{ background: "var(--bg-base)" }}
    >
      <IconRail
        activeView={activeView}
        onNavigate={onNavigate}
        health={health}
        isOnline={isOnline}
      />
      <div
        className="flex-1 min-w-0 h-full overflow-y-auto"
        style={{ marginLeft: "56px" }}
      >
        {children}
      </div>
    </div>
  );
};

export default function Home() {
  // Default to the Dashboard when opening the project
  const [currentView, setCurrentView] = useState<ActiveView>("workspace");
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [wizardSourceType, setWizardSourceType] = useState<WizardSourceType>("topic");

  const [passedConfig, setPassedConfig] = useState<{
    title: string;
    subject: string;
    exam: string;
    year: string;
    timeLimitEnabled: boolean;
    secondsPerQuestion: number;
  } | undefined>(undefined);
  const [createdQuizState, setCreatedQuizState] = useState<QuizCreatorState | undefined>(undefined);

  const { health, isOnline, isLoading: isLoadingHealth, refetch: onRefreshHealth } = useBackendHealth();

  // Global Keyboard shortcut Ctrl+N for wizard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setWizardSourceType("topic");
        setCurrentView("wizard");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // When wizard successfully generates a real quiz via Nemotron 3 AI
  const handleGeneratedQuizHandOff = (generated: GeneratedQuizResponse) => {
    const creatorState = convertGeneratedQuizToCreatorState(generated);
    setCreatedQuizState(creatorState);
    setCurrentView("creator");
  };

  // Fallback if wizard opens without AI generation
  const handleWizardHandOff = (config: {
    title: string;
    subject: string;
    exam: string;
    year: string;
    timeLimitEnabled: boolean;
    secondsPerQuestion: number;
  }) => {
    setPassedConfig(config);
    setCreatedQuizState(undefined);
    setCurrentView("creator");
  };

  const handleOpenWizardWithSource = (source?: QuizSourceType) => {
    if (source === "document") {
      setWizardSourceType("pdf");
    } else if (source === "study_notes") {
      setWizardSourceType("text");
    } else {
      setWizardSourceType("topic");
    }
    setCurrentView("wizard");
  };

  const navigate = (view: ActiveView) => setCurrentView(view);

  return (
    <>
      {/* High-contrast Monochrome Splash Screen on initial boot */}
      {showSplash && (
        <SplashScreen onComplete={() => setShowSplash(false)} minDurationMs={1500} />
      )}

      {currentView === "wizard" && (
        <AppShell activeView="wizard" onNavigate={navigate}>
          <QuizGenerationWizard
            initialSourceType={wizardSourceType}
            onCancel={() => setCurrentView("workspace")}
            onOpenInCreatorWithGeneratedQuiz={handleGeneratedQuizHandOff}
            onOpenInCreatorWithConfig={handleWizardHandOff}
          />
        </AppShell>
      )}

      {currentView === "creator" && (
        <AppShell activeView="creator" onNavigate={navigate}>
          <QuizCreator
            onBackToWorkspace={() => setCurrentView("workspace")}
            onOpenWizard={() => setCurrentView("wizard")}
            onTakeQuiz={(quiz) => {
              setCreatedQuizState(quiz);
              setCurrentView("taking");
            }}
            initialConfig={passedConfig}
            initialQuizState={createdQuizState}
          />
        </AppShell>
      )}

      {currentView === "taking" && createdQuizState && (
        <AppShell activeView="taking" onNavigate={navigate}>
          <div className="min-h-full flex flex-col justify-center p-2 sm:p-6 font-sans">
            <QuizTakingContainer
              quiz={createdQuizState}
              onBackToEditor={() => setCurrentView("creator")}
            />
          </div>
        </AppShell>
      )}

      {currentView === "library" && (
        <AppShell activeView="library" onNavigate={navigate}>
          <QuizLibrary
            onOpenCreatorWithQuiz={(quizState) => {
              setCreatedQuizState(quizState);
              setCurrentView("creator");
            }}
            onStartTakingQuiz={(quizState) => {
              setCreatedQuizState(quizState);
              setCurrentView("taking");
            }}
            onOpenWizard={() => setCurrentView("wizard")}
          />
        </AppShell>
      )}

      {currentView === "workspace" && (
        <AppShell activeView="workspace" onNavigate={navigate}>
          <DashboardView
            onOpenWizard={handleOpenWizardWithSource}
            onOpenCreator={() => {
              setCreatedQuizState(undefined);
              setCurrentView("creator");
            }}
            onOpenLibrary={() => setCurrentView("library")}
            onTakeQuiz={(quizState) => {
              setCreatedQuizState(quizState);
              setCurrentView("taking");
            }}
            onEditQuiz={(quizState) => {
              setCreatedQuizState(quizState);
              setCurrentView("creator");
            }}
            onTriggerSplash={() => setShowSplash(true)}
            health={health}
            isOnline={isOnline}
            isLoadingHealth={isLoadingHealth}
            onRefreshHealth={onRefreshHealth}
          />
        </AppShell>
      )}
    </>
  );
}
