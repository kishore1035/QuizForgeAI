"use client";

import React from "react";
import { ChevronDown, BookOpen } from "lucide-react";
import { QuizSpecification as SpecificationType } from "@/types/creator";

interface QuizSpecificationProps {
  specification: SpecificationType;
  onChange: (updated: Partial<SpecificationType>) => void;
}

const EXAM_OPTIONS = [
  "Select Exam",
  "General Practice",
  "SAT / ACT",
  "AP Examinations",
  "GCSE / A-Levels",
  "MCAT / USMLE",
  "GRE / GMAT",
  "JEE / NEET",
  "University Midterm / Final",
];

const SUBJECT_OPTIONS = [
  "Select Subject",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Economics",
  "History",
  "Psychology",
  "Literature",
];

const YEAR_OPTIONS = [
  "Select Year",
  "2026",
  "2025",
  "2024",
  "2023",
  "2022",
  "2021",
  "2020",
];

export const QuizSpecification: React.FC<QuizSpecificationProps> = ({
  specification,
  onChange,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
        <BookOpen className="w-4 h-4 text-zinc-400" />
        <h3 className="text-sm font-bold text-zinc-100">Specification</h3>
      </div>

      {/* 1. Exam Dropdown */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-400 block">
          Exam
        </label>
        <div className="relative">
          <select
            value={specification.exam || "Select Exam"}
            onChange={(e) =>
              onChange({ exam: e.target.value === "Select Exam" ? "" : e.target.value })
            }
            className="w-full appearance-none px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-xs font-medium text-zinc-200 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 cursor-pointer transition-all"
          >
            {EXAM_OPTIONS.map((opt) => (
              <option key={opt} value={opt} className="bg-zinc-900 text-zinc-200">
                {opt}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* 2. Subject Dropdown */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-400 block">
          Subject
        </label>
        <div className="relative">
          <select
            value={specification.subject || "Select Subject"}
            onChange={(e) =>
              onChange({ subject: e.target.value === "Select Subject" ? "" : e.target.value })
            }
            className="w-full appearance-none px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-xs font-medium text-zinc-200 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 cursor-pointer transition-all"
          >
            {SUBJECT_OPTIONS.map((opt) => (
              <option key={opt} value={opt} className="bg-zinc-900 text-zinc-200">
                {opt}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* 3. Year Dropdown */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-400 block">
          Year
        </label>
        <div className="relative">
          <select
            value={specification.year || "Select Year"}
            onChange={(e) =>
              onChange({ year: e.target.value === "Select Year" ? "" : e.target.value })
            }
            className="w-full appearance-none px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-xs font-medium text-zinc-200 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 cursor-pointer transition-all"
          >
            {YEAR_OPTIONS.map((opt) => (
              <option key={opt} value={opt} className="bg-zinc-900 text-zinc-200">
                {opt}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
