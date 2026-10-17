"use client";

import React, { useState } from "react";
import { Sparkles, BookOpen, FileText, UploadCloud, Check, Code2, AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DifficultyLevel, QuestionType, QuizGeneratePayload, QuizSourceType } from "@/types/quiz";

interface NewQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSourceType?: QuizSourceType;
  isBackendOnline?: boolean;
}

export const NewQuizModal: React.FC<NewQuizModalProps> = ({
  isOpen,
  onClose,
  initialSourceType = "topic",
  isBackendOnline = false,
}) => {
  const [sourceType, setSourceType] = useState<QuizSourceType>(initialSourceType);
  const [topic, setTopic] = useState("");
  const [studyMaterial, setStudyMaterial] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([
    "multiple_choice",
    "true_false",
  ]);
  const [showPayloadPreview, setShowPayloadPreview] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null);

  // Sync initial source type when opened
  React.useEffect(() => {
    if (isOpen) {
      setSourceType(initialSourceType);
      setSubmissionFeedback(null);
    }
  }, [isOpen, initialSourceType]);

  const toggleQuestionType = (type: QuestionType) => {
    if (questionTypes.includes(type)) {
      if (questionTypes.length === 1) return; // Keep at least one
      setQuestionTypes(questionTypes.filter((t) => t !== type));
    } else {
      setQuestionTypes([...questionTypes, type]);
    }
  };

  const payload: QuizGeneratePayload = {
    source_type: sourceType,
    ...(sourceType === "topic" ? { topic: topic || "Cellular Biology & ATP Synthesis" } : {}),
    ...(sourceType === "study_notes" ? { study_material: studyMaterial || "Lecture Notes on Neural Networks" } : {}),
    ...(sourceType === "document" ? { topic: fileName || "Document: Chapter_4_Economics.pdf" } : {}),
    difficulty,
    question_count: questionCount,
    question_types: questionTypes,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionFeedback(
      "Validated payload contract ready for backend integration in Stage 2. AI generation engine (nemotron-3-nano:30b-cloud) will be connected next without mock quiz data."
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Quiz"
      description="Configure parameters for AI generation via Nemotron 3 Nano 30B Cloud"
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Source Type Selector */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
            1. Quiz Source
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setSourceType("topic")}
              className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                sourceType === "topic"
                  ? "bg-white/10 border-white text-white shadow-sm"
                  : "bg-zinc-950/40 border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
              }`}
            >
              <BookOpen className="w-4 h-4 text-white" />
              <div>
                <p className="text-xs font-semibold">Topic</p>
                <p className="text-[10px] text-zinc-500">Subject title</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSourceType("study_notes")}
              className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                sourceType === "study_notes"
                  ? "bg-white/10 border-white text-white shadow-sm"
                  : "bg-zinc-950/40 border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
              }`}
            >
              <FileText className="w-4 h-4 text-white" />
              <div>
                <p className="text-xs font-semibold">Study Notes</p>
                <p className="text-[10px] text-zinc-500">Pasted text</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSourceType("document")}
              className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                sourceType === "document"
                  ? "bg-white/10 border-white text-white shadow-sm"
                  : "bg-zinc-950/40 border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
              }`}
            >
              <UploadCloud className="w-4 h-4 text-white" />
              <div>
                <p className="text-xs font-semibold">PDF Document</p>
                <p className="text-[10px] text-zinc-500">Course slides</p>
              </div>
            </button>
          </div>
        </div>

        {/* Dynamic Source Input */}
        <div>
          {sourceType === "topic" && (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Topic or Subject
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Photosynthesis and Cellular Respiration"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
              />
            </div>
          )}

          {sourceType === "study_notes" && (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Pasted Study Material
              </label>
              <textarea
                value={studyMaterial}
                onChange={(e) => setStudyMaterial(e.target.value)}
                rows={4}
                placeholder="Paste lecture notes, book summaries, or reference paragraphs..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white resize-none transition-all"
              />
            </div>
          )}

          {sourceType === "document" && (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Upload Document (PDF)
              </label>
              <div
                onClick={() => setFileName(fileName ? null : "Syllabus_Unit_2.pdf")}
                className="border-2 border-dashed border-white/15 hover:border-white/30 rounded-xl p-6 text-center cursor-pointer bg-zinc-950/40 hover:bg-zinc-900/40 transition-colors"
              >
                <UploadCloud className="w-7 h-7 mx-auto text-white mb-2" />
                <p className="text-xs font-medium text-zinc-200">
                  {fileName ? `Attached: ${fileName}` : "Click to select or drop a PDF here"}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  PDF extraction module will parse slides, chapters, and syllabi
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Configuration Row: Difficulty & Question Count */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              2. Difficulty Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["easy", "medium", "hard"] as DifficultyLevel[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold capitalize border transition-all ${
                    difficulty === level
                      ? "bg-white text-black border-white shadow-xs"
                      : "bg-zinc-950/40 border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              3. Questions: <span className="text-white font-bold">{questionCount}</span>
            </label>
            <input
              type="range"
              min={3}
              max={25}
              step={1}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full accent-white mt-2"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
              <span>3 quick</span>
              <span>10 standard</span>
              <span>25 deep practice</span>
            </div>
          </div>
        </div>

        {/* Question Types */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
            4. Question Types
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "multiple_choice", label: "Multiple Choice" },
              { id: "true_false", label: "True / False" },
              { id: "short_answer", label: "Short Answer" },
            ].map((item) => {
              const active = questionTypes.includes(item.id as QuestionType);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleQuestionType(item.id as QuestionType)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                    active
                      ? "bg-white/10 border-white text-white font-semibold"
                      : "bg-zinc-950/40 border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                      active ? "bg-white border-white text-black font-black" : "border-white/20 bg-black"
                    }`}
                  >
                    {active && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Contract Preview Toggle */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowPayloadPreview(!showPayloadPreview)}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <Code2 className="w-3.5 h-3.5 text-white" />
            <span>{showPayloadPreview ? "Hide" : "Inspect"} Backend API Payload Contract</span>
          </button>

          {showPayloadPreview && (
            <div className="mt-2.5 p-3 rounded-xl bg-black border border-white/10 font-mono text-xs text-zinc-300 overflow-x-auto">
              <pre>{JSON.stringify(payload, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* Feedback Alert */}
        {submissionFeedback && (
          <div className="p-3.5 rounded-xl bg-zinc-900 border border-white/20 flex items-start gap-2.5 text-xs text-zinc-200">
            <AlertCircle className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
            <span>{submissionFeedback}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <Badge variant={isBackendOnline ? "success" : "warning"} size="sm">
              {isBackendOnline ? "Backend Live" : "Backend Standby"}
            </Badge>
            <span className="text-[11px] text-zinc-500">nemotron-3-nano:30b-cloud</span>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Generate Quiz
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
