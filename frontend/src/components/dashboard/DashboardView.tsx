"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Zap,
  Edit3,
  Layers,
  BookOpen,
  FileText,
  UploadCloud,
  ArrowRight,
  Play,
  Cpu,
  Shield,
  Plus,
  RefreshCw,
  Trophy,
  History,
  CheckCircle2,
} from "lucide-react";
import { ApiClient } from "@/lib/api";
import { QuizListItem } from "@/types/attempt";
import { QuizSourceType } from "@/types/quiz";
import { QuizCreatorState } from "@/types/creator";
import { convertGeneratedQuizToCreatorState } from "@/lib/quizDefaults";
import { HealthResponse } from "@/types/api";

interface DashboardViewProps {
  onOpenWizard: (source?: QuizSourceType) => void;
  onOpenCreator: () => void;
  onOpenLibrary: () => void;
  onTakeQuiz: (quizState: QuizCreatorState) => void;
  onEditQuiz: (quizState: QuizCreatorState) => void;
  onTriggerSplash?: () => void;
  health: HealthResponse | null;
  isOnline: boolean;
  isLoadingHealth: boolean;
  onRefreshHealth: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenWizard,
  onOpenCreator,
  onOpenLibrary,
  onTakeQuiz,
  onEditQuiz,
  onTriggerSplash,
  health,
  isOnline,
  isLoadingHealth,
  onRefreshHealth,
}) => {
  const [recentQuizzes, setRecentQuizzes] = useState<QuizListItem[]>([]);
  const [totalQuizzes, setTotalQuizzes] = useState<number>(0);
  const [totalAttempts, setTotalAttempts] = useState<number>(0);
  const [averageScore, setAverageScore] = useState<number | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [actionLoadingQuizId, setActionLoadingQuizId] = useState<string | null>(null);

  const fetchDashboardStats = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const res = await ApiClient.listQuizzes({ limit: 4 });
      setRecentQuizzes(res.quizzes || []);
      setTotalQuizzes(res.total || 0);

      // Compute attempts and average score across loaded quizzes
      let attemptsCount = 0;
      let scoresSum = 0;
      let scoredQuizzesCount = 0;

      res.quizzes.forEach((q) => {
        attemptsCount += q.attempt_count || 0;
        if (q.best_percentage !== null && q.best_percentage !== undefined) {
          scoresSum += q.best_percentage;
          scoredQuizzesCount++;
        }
      });

      setTotalAttempts(attemptsCount);
      setAverageScore(
        scoredQuizzesCount > 0 ? Math.round(scoresSum / scoredQuizzesCount) : null
      );
    } catch {
      // Quiet fallback for fresh installs or empty databases
      setRecentQuizzes([]);
      setTotalQuizzes(0);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  const handleLaunchQuiz = async (quiz: QuizListItem) => {
    setActionLoadingQuizId(quiz.quiz_id);
    try {
      const fullQuiz = await ApiClient.getQuiz(quiz.quiz_id);
      const creatorState = convertGeneratedQuizToCreatorState(fullQuiz);
      onTakeQuiz(creatorState);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load quiz.";
      alert(message);
    } finally {
      setActionLoadingQuizId(null);
    }
  };

  const handleEditSavedQuiz = async (quiz: QuizListItem) => {
    setActionLoadingQuizId(quiz.quiz_id);
    try {
      const fullQuiz = await ApiClient.getQuiz(quiz.quiz_id);
      const creatorState = convertGeneratedQuizToCreatorState(fullQuiz);
      onEditQuiz(creatorState);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load quiz.";
      alert(message);
    } finally {
      setActionLoadingQuizId(null);
    }
  };

  return (
    <div className="min-h-full bg-black text-zinc-100 px-4 md:px-10 py-8 selection:bg-white selection:text-black font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Top Header / Welcome */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>QUIZFORGE AI · MISSION CONTROL</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white uppercase">
              Assessment Dashboard
            </h1>

            <p className="text-sm md:text-base leading-relaxed text-zinc-400 max-w-2xl">
              Autonomous neural quiz generation, timed test execution, and curriculum mastery analytics powered by Nemotron 3 AI.
            </p>
          </div>

          {/* Quick Primary Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => onOpenWizard()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-zinc-100 text-zinc-950 hover:bg-white transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <Zap className="w-4 h-4 fill-current stroke-[2.5]" />
              <span>Generate Quiz</span>
            </button>

            <button
              onClick={onOpenCreator}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-zinc-900 text-zinc-200 border border-zinc-800 hover:border-zinc-700 hover:text-white transition-all cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Manual Editor</span>
            </button>

            <button
              onClick={onOpenLibrary}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-zinc-900 text-zinc-200 border border-zinc-800 hover:border-zinc-700 hover:text-white transition-all cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Quiz Library</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Metric 1: Saved Quizzes */}
          <div className="p-4 md:p-5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider">Repository</span>
              <Layers className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-black text-white font-mono">
                {isLoadingData ? "..." : totalQuizzes}
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                Saved Quizzes
              </div>
            </div>
          </div>

          {/* Metric 2: Completed Attempts */}
          <div className="p-4 md:p-5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider">Sessions</span>
              <History className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-black text-white font-mono">
                {isLoadingData ? "..." : totalAttempts}
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                Completed Attempts
              </div>
            </div>
          </div>

          {/* Metric 3: Best / Average Score */}
          <div className="p-4 md:p-5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider">Mastery</span>
              <Trophy className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-black text-white font-mono">
                {isLoadingData ? "..." : averageScore !== null ? `${averageScore}%` : "—"}
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                Avg Best Accuracy
              </div>
            </div>
          </div>

          {/* Metric 4: AI Model Status */}
          <div className="p-4 md:p-5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider">Runtime</span>
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isOnline ? "bg-white" : "border border-zinc-600 animate-pulse"
                }`}
              />
            </div>
            <div>
              <div className="text-sm font-bold text-white font-mono truncate">
                {health?.model_target || "nemotron-3-nano"}
              </div>
              <div className="text-xs text-zinc-500 mt-0.5 font-mono">
                {isOnline ? "Backend Active · Port 8000" : "Disconnected"}
              </div>
            </div>
          </div>
        </div>

        {/* Input Sources: 1-Click Launchers */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
              Quick Generation Launchers
            </h2>
            <span className="text-[11px] text-zinc-500 font-mono">
              Select source to initialize AI wizard
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Topic Prompt */}
            <button
              onClick={() => onOpenWizard("topic")}
              className="group text-left p-5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-600 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white">
                    <BookOpen className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                    Topic
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mb-1 group-hover:text-zinc-200">
                  Topic Prompt
                </h3>
                <p className="text-xs leading-relaxed text-zinc-400">
                  Generate curriculum-grounded quizzes from any subject, concept, or curriculum prompt.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-900 flex items-center justify-between text-xs">
                <span className="text-[11px] font-mono text-zinc-500 truncate max-w-[180px]">
                  Photosynthesis, Calculus...
                </span>
                <span className="font-semibold text-white flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Forge</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>

            {/* Pasted Study Notes */}
            <button
              onClick={() => onOpenWizard("study_notes")}
              className="group text-left p-5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-600 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                    Text
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mb-1 group-hover:text-zinc-200">
                  Pasted Study Material
                </h3>
                <p className="text-xs leading-relaxed text-zinc-400">
                  Extract test questions directly from raw lecture transcripts, textbook excerpts, or notes.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-900 flex items-center justify-between text-xs">
                <span className="text-[11px] font-mono text-zinc-500 truncate max-w-[180px]">
                  Transformers, Architecture...
                </span>
                <span className="font-semibold text-white flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Forge</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>

            {/* Uploaded PDF Handout */}
            <button
              onClick={() => onOpenWizard("document")}
              className="group text-left p-5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-600 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white">
                    <UploadCloud className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                    PDF
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mb-1 group-hover:text-zinc-200">
                  Uploaded PDF Handout
                </h3>
                <p className="text-xs leading-relaxed text-zinc-400">
                  Upload study guides or slides with strict PyMuPDF page citation verification.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-900 flex items-center justify-between text-xs">
                <span className="text-[11px] font-mono text-zinc-500 truncate max-w-[180px]">
                  Slides & PDF Docs...
                </span>
                <span className="font-semibold text-white flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Forge</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Quizzes Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
                Recent Quizzes
              </h2>
              {totalQuizzes > 0 && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-300 border border-zinc-800">
                  {totalQuizzes} total
                </span>
              )}
            </div>

            {totalQuizzes > 0 && (
              <button
                onClick={onOpenLibrary}
                className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>View Library</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isLoadingData ? (
            <div className="p-8 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-zinc-400 mb-2" />
              <p className="text-xs text-zinc-500 font-mono">Loading saved quizzes...</p>
            </div>
          ) : recentQuizzes.length === 0 ? (
            <div className="p-8 rounded-xl bg-zinc-950 border border-zinc-800 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">No Quizzes Created Yet</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                Generate your first quiz above or start writing custom questions using the Manual Editor.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => onOpenWizard()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Generate Your First Quiz</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentQuizzes.map((quiz) => (
                <div
                  key={quiz.quiz_id}
                  className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/90 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                        {quiz.source_type}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {quiz.question_count} Qs
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug">
                      {quiz.title}
                    </h4>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                      <span>
                        {quiz.attempt_count > 0
                          ? `${quiz.attempt_count} ${quiz.attempt_count === 1 ? "attempt" : "attempts"}`
                          : "Untaken"}
                      </span>
                      {quiz.best_percentage !== null && quiz.best_percentage !== undefined && (
                        <span className="font-bold text-zinc-200 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700/60">
                          {quiz.best_percentage}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-900 flex items-center gap-2">
                    <button
                      onClick={() => handleLaunchQuiz(quiz)}
                      disabled={actionLoadingQuizId === quiz.quiz_id}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 transition-colors disabled:opacity-50 shadow-xs"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{actionLoadingQuizId === quiz.quiz_id ? "Loading..." : "Take Quiz"}</span>
                    </button>

                    <button
                      onClick={() => handleEditSavedQuiz(quiz)}
                      disabled={actionLoadingQuizId === quiz.quiz_id}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors"
                      title="Edit Quiz"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Process Overview */}
        <div className="rounded-xl p-6 bg-zinc-950 border border-zinc-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
            Pipeline Architecture
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <div className="font-mono text-xs font-bold text-zinc-500">[01] INGEST & EXTRACT</div>
              <h4 className="text-sm font-bold text-white">Source Verification</h4>
              <p className="text-xs leading-relaxed text-zinc-400">
                PyMuPDF extracts verified text and page anchors. Topic prompts query curriculum standards.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="font-mono text-xs font-bold text-zinc-500">[02] NEURAL FORGE</div>
              <h4 className="text-sm font-bold text-white">Nemotron-3 Generation</h4>
              <p className="text-xs leading-relaxed text-zinc-400">
                AI generates grounded multiple-choice, true/false, and conceptual short-answer items.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="font-mono text-xs font-bold text-zinc-500">[03] ASSESS & EXPORT</div>
              <h4 className="text-sm font-bold text-white">Interactive Assessment</h4>
              <p className="text-xs leading-relaxed text-zinc-400">
                Per-question timers, automated grading rubrics, score history, and Markdown/TXT exports.
              </p>
            </div>
          </div>
        </div>

        {/* Backend & Environment Diagnostics Banner */}
        <div className="rounded-xl p-4 bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isOnline ? "bg-white" : "border border-zinc-600 animate-pulse"
              }`}
            />
            <div>
              <span className="text-xs font-bold text-white">
                {isOnline ? "FastAPI Server Connected" : "FastAPI Server Offline"}
              </span>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                Target: {health?.model_target || "nemotron-3-nano"} · Port 8000 · Local SQLite
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefreshHealth}
              disabled={isLoadingHealth}
              className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-600 transition-colors disabled:opacity-50"
            >
              <Cpu className={`w-3 h-3 ${isLoadingHealth ? "animate-spin" : ""}`} />
              <span>{isLoadingHealth ? "Pinging..." : "Test Backend"}</span>
            </button>

            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-600 transition-colors"
            >
              <span>Swagger API Docs</span>
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Footer & Replay Splash Option */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-zinc-500 text-xs pb-4 font-mono border-t border-white/5 pt-4">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-zinc-500" />
            <span>Local SQLite persistence · Zero third-party telemetry</span>
          </div>

          {onTriggerSplash && (
            <button
              onClick={onTriggerSplash}
              className="text-zinc-500 hover:text-zinc-300 text-[11px] underline underline-offset-2 transition-colors cursor-pointer"
            >
              Replay Splash Screen
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
