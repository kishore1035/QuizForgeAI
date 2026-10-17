"use client";

import React from "react";
import {
  BookOpen,
  FileText,
  UploadCloud,
  ArrowRight,
  Cpu,
  Shield,
  Plus,
} from "lucide-react";
import { QuizSourceType } from "@/types/quiz";
import { HealthResponse } from "@/types/api";

interface EmptyWorkspaceProps {
  onOpenNewQuizWithSource: (source: QuizSourceType) => void;
  onOpenNewQuiz: () => void;
  health: HealthResponse | null;
  isOnline: boolean;
  isLoadingHealth: boolean;
  onCheckHealth: () => void;
}

const SOURCE_CARDS = [
  {
    type: "topic" as QuizSourceType,
    icon: <BookOpen className="w-4 h-4 text-white" />,
    label: "Topic Prompt",
    desc: "Generate curriculum-grounded quizzes from any subject, concept, or curriculum prompt.",
    example: "Photosynthesis, Distributed Systems, Calculus...",
    badge: "Topic",
  },
  {
    type: "study_notes" as QuizSourceType,
    icon: <FileText className="w-4 h-4 text-white" />,
    label: "Pasted Study Material",
    desc: "Extract test questions directly from raw lecture transcripts, textbook excerpts, or notes.",
    example: "Transformer Architecture & Self-Attention...",
    badge: "Text",
  },
  {
    type: "document" as QuizSourceType,
    icon: <UploadCloud className="w-4 h-4 text-white" />,
    label: "Uploaded PDF Handout",
    desc: "Upload study guides or slides with strict PyMuPDF page citation verification.",
    example: "Microeconomics_Market_Structures.pdf...",
    badge: "PDF",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Generate on Demand",
    desc: "Set question types, count, and duration. Powered by Nemotron 3 AI.",
  },
  {
    num: "02",
    title: "Timed Interactive Practice",
    desc: "Test yourself with per-question countdowns, instant auto-scoring, and thorough explanations.",
  },
  {
    num: "03",
    title: "Review & Target Weak Concepts",
    desc: "Review misconceptions, track performance, and reinforce topic mastery.",
  },
];

export const EmptyWorkspace: React.FC<EmptyWorkspaceProps> = ({
  onOpenNewQuizWithSource,
  onOpenNewQuiz,
  health,
  isOnline,
  isLoadingHealth,
  onCheckHealth,
}) => {
  return (
    <div className="min-h-full bg-black px-4 md:px-10 py-10">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Hero Section */}
        <div className="space-y-4 pt-4 border-b border-white/10 pb-8">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300">
            <span>QuizForge AI Assessment Engine</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white uppercase">
            Turn Anything Into A Quiz
          </h1>

          <p className="text-sm md:text-base leading-relaxed text-zinc-400 max-w-xl">
            A minimalist assessment platform. Generate questions from academic topics, study notes, or uploaded PDFs.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onOpenNewQuiz}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create New Quiz</span>
            </button>

            <button
              onClick={onCheckHealth}
              disabled={isLoadingHealth}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-zinc-950 text-zinc-300 border border-zinc-800 hover:border-zinc-600 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Cpu className={`w-3.5 h-3.5 ${isLoadingHealth ? "animate-spin" : ""}`} />
              <span>{isLoadingHealth ? "Checking..." : isOnline ? "Backend Connected" : "Check Backend"}</span>
            </button>
          </div>
        </div>

        {/* Source Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
              Input Sources
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SOURCE_CARDS.map((card) => (
              <button
                key={card.type}
                onClick={() => onOpenNewQuizWithSource(card.type)}
                className="group text-left p-5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-white transition-colors cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                      {card.icon}
                    </div>

                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                      {card.badge}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-1 group-hover:text-zinc-200">
                    {card.label}
                  </h3>

                  <p className="text-xs leading-relaxed text-zinc-400">
                    {card.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-900 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-mono text-zinc-500 truncate max-w-[180px]">
                    {card.example}
                  </span>
                  <span className="font-semibold text-white flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 3 Steps */}
        <div className="rounded-xl p-6 bg-zinc-950 border border-zinc-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
            Process Overview
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step) => (
              <div key={step.num} className="space-y-1.5">
                <div className="font-mono text-xs font-bold text-zinc-500">
                  [{step.num}]
                </div>
                <h4 className="text-sm font-bold text-white">
                  {step.title}
                </h4>
                <p className="text-xs leading-relaxed text-zinc-400">
                  {step.desc}
                </p>
              </div>
            ))}
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
                Target: {health?.model_target || "nemotron-3-nano"} · Port 8000
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Privacy by Default */}
        <div className="flex items-center justify-center gap-2 text-zinc-500 text-xs pb-4 font-mono">
          <Shield className="w-3.5 h-3.5 text-zinc-500" />
          <span>Local SQLite persistence · Zero third-party telemetry</span>
        </div>
      </div>
    </div>
  );
};
