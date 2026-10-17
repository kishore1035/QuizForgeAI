"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Filter,
  Plus,
  Play,
  Edit3,
  Trash2,
  History,
  Clock,
  Sparkles,
  RefreshCw,
  BookOpen,
  FileText,
  FileCode,
  AlertCircle,
  CheckCircle2,
  X,
  Trophy,
  Layers,
  Download,
  ChevronDown,
  ArrowUpDown,
  Eye,
} from "lucide-react";
import { ApiClient } from "@/lib/api";
import { QuizListItem, AttemptHistoryItem, AttemptResultResponse } from "@/types/attempt";
import { convertGeneratedQuizToCreatorState } from "@/lib/quizDefaults";
import { QuizCreatorState } from "@/types/creator";
import {
  downloadQuizQuestions,
  downloadQuizAnswerKey,
  downloadAttemptReport,
} from "@/lib/exportUtils";
import { QuizReviewView } from "@/components/taking/QuizReviewView";

interface QuizLibraryProps {
  onOpenCreatorWithQuiz: (quizState: QuizCreatorState) => void;
  onStartTakingQuiz: (quizState: QuizCreatorState) => void;
  onOpenWizard: () => void;
}

export const QuizLibrary: React.FC<QuizLibraryProps> = ({
  onOpenCreatorWithQuiz,
  onStartTakingQuiz,
  onOpenWizard,
}) => {
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters, Search & Sorting
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");

  // Export Popover States
  const [activeExportQuizId, setActiveExportQuizId] = useState<string | null>(null);
  const [activeExportAttemptId, setActiveExportAttemptId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Attempt History Modal & Review State
  const [historyModalQuiz, setHistoryModalQuiz] = useState<QuizListItem | null>(null);
  const [historyAttempts, setHistoryAttempts] = useState<AttemptHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [reviewingAttemptResult, setReviewingAttemptResult] = useState<AttemptResultResponse | null>(null);
  const [isLoadingReview, setIsLoadingReview] = useState<boolean>(false);

  // Delete Confirmation Modal
  const [quizToDelete, setQuizToDelete] = useState<QuizListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Fetch quizzes from backend database
  const fetchQuizzes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await ApiClient.listQuizzes({
        search: searchQuery.trim() || undefined,
        difficulty: difficultyFilter !== "all" ? difficultyFilter : undefined,
        source_type: sourceTypeFilter !== "all" ? sourceTypeFilter : undefined,
        limit: 100,
      });
      setQuizzes(response.quizzes);
      setTotalCount(response.total);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load saved quizzes from the server.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, difficultyFilter, sourceTypeFilter]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  // Handle Edit Action
  const handleEditQuiz = async (quizItem: QuizListItem) => {
    try {
      const fullQuiz = await ApiClient.getQuiz(quizItem.quiz_id);
      const creatorState = convertGeneratedQuizToCreatorState(fullQuiz);
      onOpenCreatorWithQuiz(creatorState);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      alert(`Could not load quiz details: ${message}`);
    }
  };

  // Handle Take Quiz Action
  const handleTakeQuiz = async (quizItem: QuizListItem) => {
    try {
      const fullQuiz = await ApiClient.getQuiz(quizItem.quiz_id);
      const creatorState = convertGeneratedQuizToCreatorState(fullQuiz);
      onStartTakingQuiz(creatorState);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      alert(`Could not start quiz: ${message}`);
    }
  };

  // Handle Open History
  const handleOpenHistory = async (quizItem: QuizListItem) => {
    setHistoryModalQuiz(quizItem);
    setIsLoadingHistory(true);
    setHistoryError(null);
    try {
      const historyRes = await ApiClient.getQuizAttemptsHistory(quizItem.quiz_id);
      setHistoryAttempts(historyRes.attempts);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load attempt history.";
      setHistoryError(message);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Dismiss popovers on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-export-popover]")) {
        setActiveExportQuizId(null);
        setActiveExportAttemptId(null);
      }
    };
    if (activeExportQuizId || activeExportAttemptId) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [activeExportQuizId, activeExportAttemptId]);

  // Client-side sorting on retrieved quizzes
  const displayedQuizzes = useMemo(() => {
    return [...quizzes].sort((a, b) => {
      if (sortBy === "title_asc") {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === "title_desc") {
        return b.title.localeCompare(a.title);
      }
      if (sortBy === "difficulty") {
        const order: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
        return (order[a.difficulty?.toLowerCase()] || 2) - (order[b.difficulty?.toLowerCase()] || 2);
      }
      if (sortBy === "questions") {
        return b.question_count - a.question_count;
      }
      // Default: recently updated
      const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
      const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
      return timeB - timeA;
    });
  }, [quizzes, sortBy]);

  // Handle Export Quiz Card (Questions or Answer Key)
  const handleExportQuizCard = async (
    quizId: string,
    type: "questions" | "answer_key",
    format: "markdown" | "txt"
  ) => {
    setIsExporting(true);
    try {
      const fullQuiz = await ApiClient.getQuiz(quizId);
      if (type === "questions") {
        downloadQuizQuestions(fullQuiz, format);
      } else {
        downloadQuizAnswerKey(fullQuiz, format);
      }
      setActiveExportQuizId(null);
    } catch {
      const url = ApiClient.getQuizExportUrl(quizId, type, format);
      window.open(url, "_blank");
      setActiveExportQuizId(null);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Export Attempt Row
  const handleExportAttemptRow = async (
    quizId: string,
    attemptId: string,
    format: "markdown" | "txt"
  ) => {
    try {
      const result = await ApiClient.getQuizAttemptResults(quizId, attemptId);
      downloadAttemptReport(result, format);
      setActiveExportAttemptId(null);
    } catch {
      const url = ApiClient.getAttemptExportUrl(quizId, attemptId, format);
      window.open(url, "_blank");
      setActiveExportAttemptId(null);
    }
  };

  // Handle Review Attempt Row
  const handleReviewAttemptRow = async (quizId: string, attemptId: string) => {
    setIsLoadingReview(true);
    try {
      const result = await ApiClient.getQuizAttemptResults(quizId, attemptId);
      setReviewingAttemptResult(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      alert(`Could not load attempt review: ${message}`);
    } finally {
      setIsLoadingReview(false);
    }
  };

  // Handle Confirm Delete
  const handleConfirmDelete = async () => {
    if (!quizToDelete) return;
    setIsDeleting(true);
    try {
      await ApiClient.deleteQuiz(quizToDelete.quiz_id);
      setQuizzes((prev) => prev.filter((q) => q.quiz_id !== quizToDelete.quiz_id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      setQuizToDelete(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      alert(`Failed to delete quiz: ${message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper for source type badge
  const renderSourceBadge = (sourceType: string) => {
    switch (sourceType.toLowerCase()) {
      case "pdf":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-white/10 text-white border border-white/20">
            <FileCode className="w-3 h-3 text-white" />
            PDF Doc
          </span>
        );
      case "text":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-white/10 text-white border border-white/20">
            <FileText className="w-3 h-3 text-white" />
            Pasted Text
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-white/10 text-white border border-white/20">
            <BookOpen className="w-3 h-3 text-white" />
            Topic AI
          </span>
        );
    }
  };

  // Helper for difficulty badge
  const renderDifficultyBadge = (diff: string) => {
    switch (diff.toLowerCase()) {
      case "easy":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white/10 text-white border border-white/20">
            Easy
          </span>
        );
      case "hard":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-800 text-zinc-200 border border-white/20">
            Hard
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white/5 text-zinc-300 border border-white/15">
            Medium
          </span>
        );
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-forge-mesh text-zinc-100 flex flex-col font-sans">
      {/* Top Banner / Navigation Bar */}
      <header
        className="sticky top-0 z-30 px-4 sm:px-8 py-4 backdrop-blur-md"
        style={{
          background: "rgba(17, 20, 32, 0.85)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-white/10 border border-white/20 shadow-md"
            >
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">Quiz Library</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-white/10 text-white border border-white/20">
                  {totalCount} saved
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Persistent repository of AI-generated quizzes, practice sessions, and scores
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchQuizzes()}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all disabled:opacity-50"
              title="Refresh quiz list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-white" : "text-zinc-400"}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={onOpenWizard}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-950 bg-zinc-100 hover:bg-white rounded-lg shadow-xs transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create New Quiz</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Search & Filters FilterBar */}
        <div
          className="p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl"
          style={{
            background: "var(--bg-surface)",
            borderColor: "rgba(255, 255, 255, 0.08)",
          }}
        >
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, subject, or exam..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-lg text-white placeholder:text-zinc-500 outline-none transition-all border"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "rgba(255, 255, 255, 0.08)",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            {/* Difficulty Filter */}
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-300 outline-none border cursor-pointer"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "rgba(255, 255, 255, 0.08)",
              }}
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            {/* Source Type Filter */}
            <select
              value={sourceTypeFilter}
              onChange={(e) => setSourceTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-300 outline-none border cursor-pointer"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "rgba(255, 255, 255, 0.08)",
              }}
            >
              <option value="all">All Sources</option>
              <option value="topic">Topic</option>
              <option value="text">Pasted Text</option>
              <option value="pdf">PDF Document</option>
            </select>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 pl-2 sm:border-l border-white/10">
              <div className="flex items-center gap-1 text-xs text-zinc-400 font-medium">
                <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
                <span>Sort:</span>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-300 outline-none border cursor-pointer"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "rgba(255, 255, 255, 0.08)",
                }}
              >
                <option value="recent">Recently Updated</option>
                <option value="title_asc">Title (A-Z)</option>
                <option value="title_desc">Title (Z-A)</option>
                <option value="difficulty">Difficulty (Easy first)</option>
                <option value="questions">Question Count</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl bg-zinc-900 border border-white/20 text-white flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-white shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-white">Failed to retrieve quizzes</p>
              <p className="mt-0.5 text-zinc-400">{error}</p>
            </div>
            <button
              onClick={() => fetchQuizzes()}
              className="ml-auto text-xs font-bold text-white underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
            <p className="text-xs font-semibold text-zinc-400">Loading quizzes from persistent storage...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && displayedQuizzes.length === 0 && (
          <div
            className="py-16 px-6 rounded-2xl border text-center shadow-xl max-w-lg mx-auto my-8 animate-slide-up"
            style={{
              background: "var(--bg-surface)",
              borderColor: "rgba(255, 255, 255, 0.08)",
            }}
          >
            <div className="w-14 h-14 rounded-2xl bg-white/5 text-white flex items-center justify-center mx-auto mb-4 border border-white/10">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">
              {searchQuery || difficultyFilter !== "all" || sourceTypeFilter !== "all"
                ? "No matching quizzes found"
                : "No saved quizzes yet"}
            </h3>
            <p className="text-xs text-zinc-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
              {searchQuery || difficultyFilter !== "all" || sourceTypeFilter !== "all"
                ? "Try adjusting your query or resetting filters."
                : "Generate quizzes from any academic topic, study notes, or PDF document powered by Nemotron 3 AI."}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {searchQuery || difficultyFilter !== "all" || sourceTypeFilter !== "all" ? (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setDifficultyFilter("all");
                    setSourceTypeFilter("all");
                    setSortBy("recent");
                  }}
                  className="px-4 py-2 text-xs font-semibold text-zinc-300 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  onClick={onOpenWizard}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-zinc-950 bg-zinc-100 hover:bg-white rounded-lg shadow-xs transition-all"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Generate Your First Quiz</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Quizzes Grid */}
        {!isLoading && !error && displayedQuizzes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedQuizzes.map((quiz) => (
              <div
                key={quiz.quiz_id}
                className="rounded-2xl border transition-all flex flex-col justify-between overflow-hidden group shadow-xl hover:shadow-2xl"
                style={{
                  background: "var(--bg-surface)",
                  borderColor: "rgba(255, 255, 255, 0.08)",
                }}
              >
                {/* Card Top */}
                <div className="p-5 pb-3">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      {renderSourceBadge(quiz.source_type)}
                      {renderDifficultyBadge(quiz.difficulty)}
                    </div>
                    <span className="text-[11px] text-zinc-500 font-medium">
                      {formatDate(quiz.updated_at || quiz.created_at)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    className="text-base font-bold text-white group-hover:text-zinc-300 transition-colors line-clamp-2 leading-snug"
                    title={quiz.title}
                  >
                    {quiz.title}
                  </h3>

                  {/* Tags */}
                  {(quiz.subject || quiz.exam) && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-zinc-400">
                      {quiz.subject && (
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 font-medium text-zinc-300 text-[11px]">
                          {quiz.subject}
                        </span>
                      )}
                      {quiz.exam && (
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 font-medium text-zinc-300 text-[11px]">
                          {quiz.exam}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Specs */}
                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
                    <span className="font-semibold text-zinc-200">
                      {quiz.question_count} {quiz.question_count === 1 ? "Question" : "Questions"}
                    </span>
                    <span className="text-zinc-500 font-mono text-[11px]">
                      {quiz.time_limit_enabled && quiz.time_limit_seconds
                        ? `${quiz.time_limit_seconds}s / question`
                        : "Untimed"}
                    </span>
                  </div>

                  {/* Performance stats */}
                  <div
                    className="mt-3 p-2.5 rounded-xl border flex items-center justify-between text-xs"
                    style={{
                      background: "var(--bg-elevated)",
                      borderColor: "rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Trophy className="w-3.5 h-3.5 text-zinc-400" />
                      <span>
                        {quiz.attempt_count === 0
                           ? "No attempts"
                          : `${quiz.attempt_count} ${quiz.attempt_count === 1 ? "attempt" : "attempts"}`}
                      </span>
                    </div>

                    {quiz.attempt_count > 0 && quiz.best_percentage !== null && quiz.best_percentage !== undefined && (
                      <span className="font-bold px-2 py-0.5 rounded text-[11px] bg-white/10 text-white border border-white/20">
                        Best: {quiz.best_percentage}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div
                  className="p-3 border-t flex items-center justify-between gap-1.5"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditQuiz(quiz)}
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                      title="Edit questions in creator"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleOpenHistory(quiz)}
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                      title="View historical attempts"
                    >
                      <History className="w-4 h-4" />
                    </button>

                    {/* Export popover */}
                    <div className="relative" data-export-popover>
                      <button
                        onClick={() =>
                          setActiveExportQuizId(
                            activeExportQuizId === quiz.quiz_id ? null : quiz.quiz_id
                          )
                        }
                        className={`p-1.5 rounded-lg transition-colors ${
                          activeExportQuizId === quiz.quiz_id
                            ? "bg-white/10 text-white"
                            : "text-zinc-400 hover:text-white hover:bg-white/5"
                        }`}
                        title="Export quiz questions or answer key"
                        disabled={isExporting}
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {activeExportQuizId === quiz.quiz_id && (
                        <div
                          className="absolute left-0 bottom-full mb-1.5 w-52 rounded-xl shadow-2xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100"
                          style={{
                            background: "var(--bg-overlay)",
                            border: "1px solid rgba(255, 255, 255, 0.12)",
                          }}
                        >
                          <div className="px-3 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                            Student Quiz
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleExportQuizCard(quiz.quiz_id, "questions", "markdown")
                            }
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white text-left transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-white" />
                            <span>Questions (.md)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleExportQuizCard(quiz.quiz_id, "questions", "txt")
                            }
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white text-left transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Questions (.txt)</span>
                          </button>

                          <div className="my-1 border-t border-white/10" />
                          <div className="px-3 py-0.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                            Answer Key
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleExportQuizCard(quiz.quiz_id, "answer_key", "markdown")
                            }
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white text-left transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            <span>Answer Key (.md)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleExportQuizCard(quiz.quiz_id, "answer_key", "txt")
                            }
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white text-left transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Answer Key (.txt)</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setQuizToDelete(quiz)}
                      className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      title="Delete quiz permanently"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Primary CTA */}
                  <button
                    onClick={() => handleTakeQuiz(quiz)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 bg-zinc-100 hover:bg-white rounded-lg shadow-xs transition-all active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Take Quiz</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Attempt History Modal */}
      {historyModalQuiz && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="rounded-2xl shadow-2xl border max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            style={{
              background: "var(--bg-surface)",
              borderColor: "rgba(255, 255, 255, 0.1)",
            }}
          >
            <div
              className="px-6 py-4 border-b flex items-center justify-between"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "rgba(255, 255, 255, 0.08)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 text-white border border-white/20 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Attempt History</h3>
                  <p className="text-xs text-zinc-400 truncate max-w-sm">{historyModalQuiz.title}</p>
                </div>
              </div>

              <button
                onClick={() => setHistoryModalQuiz(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {isLoadingHistory && (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs text-zinc-400">Loading attempt history...</p>
                </div>
              )}

              {historyError && (
                <div className="p-4 rounded-xl bg-zinc-900 text-white border border-white/20 text-xs font-semibold">
                  {historyError}
                </div>
              )}

              {!isLoadingHistory && !historyError && historyAttempts.length === 0 && (
                <div className="py-12 text-center text-zinc-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                  <p className="text-sm font-semibold text-zinc-300">No attempts recorded</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    You haven't completed any interactive attempts for this quiz yet.
                  </p>
                </div>
              )}

              {!isLoadingHistory && !historyError && historyAttempts.length > 0 && (
                <div className="space-y-3">
                  {historyAttempts.map((att, idx) => (
                    <div
                      key={att.attempt_id}
                      className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      style={{
                        background: "var(--bg-elevated)",
                        borderColor: "rgba(255, 255, 255, 0.06)",
                      }}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            Attempt #{historyAttempts.length - idx}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {formatDate(att.submitted_at || att.started_at)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-zinc-400">
                          <span>
                            {att.correct_count} of {att.total_questions} correct
                          </span>
                          {att.time_taken_seconds !== null && att.time_taken_seconds !== undefined && (
                            <span>Time: {att.time_taken_seconds}s</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-bold px-2.5 py-1 rounded-lg bg-white/10 text-white border border-white/20">
                          {att.percentage}%
                        </span>

                        <button
                          type="button"
                          onClick={() => handleReviewAttemptRow(historyModalQuiz.quiz_id, att.attempt_id)}
                          disabled={isLoadingReview}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-200 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Review</span>
                        </button>

                        <div className="relative" data-export-popover>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveExportAttemptId(
                                activeExportAttemptId === att.attempt_id ? null : att.attempt_id
                              )
                            }
                            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                            title="Export attempt report"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {activeExportAttemptId === att.attempt_id && (
                            <div
                              className="absolute right-0 top-full mt-1 w-44 rounded-xl shadow-2xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
                              style={{
                                background: "var(--bg-overlay)",
                                border: "1px solid rgba(255, 255, 255, 0.12)",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  handleExportAttemptRow(historyModalQuiz.quiz_id, att.attempt_id, "markdown")
                                }
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
                              >
                                <FileText className="w-3 h-3 text-white" />
                                <span>Report (.md)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleExportAttemptRow(historyModalQuiz.quiz_id, att.attempt_id, "txt")
                                }
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
                              >
                                <FileText className="w-3 h-3 text-zinc-400" />
                                <span>Report (.txt)</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              className="px-6 py-3 border-t flex items-center justify-end"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "rgba(255, 255, 255, 0.08)",
              }}
            >
              <button
                onClick={() => setHistoryModalQuiz(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/5 rounded-lg border border-white/10 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewingAttemptResult && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div
            className="rounded-2xl shadow-2xl border max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            style={{
              background: "var(--bg-surface)",
              borderColor: "rgba(255, 255, 255, 0.1)",
            }}
          >
            <div
              className="px-6 py-3.5 border-b flex items-center justify-between"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "rgba(255, 255, 255, 0.08)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 text-white border border-white/20 flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Attempt Review</h3>
                  <p className="text-xs text-zinc-400">
                    {reviewingAttemptResult.title} • Score: {reviewingAttemptResult.total_score} / {reviewingAttemptResult.max_score} ({reviewingAttemptResult.percentage}%)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReviewingAttemptResult(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2 sm:p-4">
              <QuizReviewView
                result={reviewingAttemptResult}
                onBackToResults={() => setReviewingAttemptResult(null)}
                onRetakeQuiz={() => {
                  const q = historyModalQuiz;
                  setReviewingAttemptResult(null);
                  setHistoryModalQuiz(null);
                  if (q) handleTakeQuiz(q);
                }}
                onBackToEditor={() => {
                  const q = historyModalQuiz;
                  setReviewingAttemptResult(null);
                  setHistoryModalQuiz(null);
                  if (q) handleEditQuiz(q);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {quizToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="rounded-2xl shadow-2xl border max-w-md w-full p-6"
            style={{
              background: "var(--bg-surface)",
              borderColor: "rgba(255, 255, 255, 0.1)",
            }}
          >
            <div className="w-12 h-12 rounded-xl bg-white/10 text-white border border-white/20 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Delete Quiz Permanently?</h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-white">"{quizToDelete.title}"</span>?
              This will permanently remove the quiz, all its questions, and past attempt records from the database.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setQuizToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/5 rounded-lg border border-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-zinc-950 bg-zinc-200 hover:bg-white rounded-lg shadow-xs transition-all disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Quiz"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
