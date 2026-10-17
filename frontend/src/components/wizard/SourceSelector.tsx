"use client";

import React, { useRef, useState } from "react";
import {
  BookOpen,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  X,
  Loader2,
  HelpCircle,
} from "lucide-react";
import {
  WizardSourceType,
  TopicFormState,
  TextFormState,
  PDFFormState,
} from "@/types/wizard";
import { SourceResponse } from "@/types/api";

interface SourceSelectorProps {
  sourceType: WizardSourceType;
  onSelectSourceType: (type: WizardSourceType) => void;
  topicForm: TopicFormState;
  onUpdateTopicForm: (updated: Partial<TopicFormState>) => void;
  textForm: TextFormState;
  onUpdateTextForm: (updated: Partial<TextFormState>) => void;
  pdfForm: PDFFormState;
  onUpdatePDFForm: (updated: Partial<PDFFormState>) => void;
  onFileSelect: (file: File) => void;
  onRemovePDF: () => void;
  isProcessingSource: boolean;
  preparedSource: SourceResponse | null;
  errorMessage: string | null;
}

export const SourceSelector: React.FC<SourceSelectorProps> = ({
  sourceType,
  onSelectSourceType,
  topicForm,
  onUpdateTopicForm,
  textForm,
  onUpdateTextForm,
  pdfForm,
  onFileSelect,
  onRemovePDF,
  isProcessingSource,
  preparedSource,
  errorMessage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Compute text statistics
  const textWords = textForm.text.trim() ? textForm.text.trim().split(/\s+/).length : 0;
  const textChars = textForm.text.length;
  const maxChars = 150000;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      onFileSelect(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* 3 Visually Distinct Source Cards */}
      <div>
        <div className="mb-3 text-center sm:text-left">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Select Your Quiz Source
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Choose what material you want QuizForge AI to study and convert into a quiz
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Card A: Topic */}
          <div
            onClick={() => onSelectSourceType("topic")}
            role="button"
            tabIndex={0}
            className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-150 select-none ${
              sourceType === "topic"
                ? "border-zinc-500 bg-zinc-900 shadow-xs ring-1 ring-zinc-500/25"
                : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/40"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  sourceType === "topic"
                    ? "bg-zinc-200 text-zinc-950 font-bold shadow-xs"
                    : "bg-zinc-900 text-zinc-300 border border-zinc-800"
                }`}
              >
                <BookOpen className="w-4 h-4" />
              </div>
              {sourceType === "topic" && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-950 shadow-xs">
                  Selected
                </span>
              )}
            </div>
            <h4 className="text-sm font-bold text-white">Generate from a Topic</h4>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Create a quiz about any subject, concept, or curriculum topic.
            </p>
          </div>

          {/* Card B: Text */}
          <div
            onClick={() => onSelectSourceType("text")}
            role="button"
            tabIndex={0}
            className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-150 select-none ${
              sourceType === "text"
                ? "border-zinc-500 bg-zinc-900 shadow-xs ring-1 ring-zinc-500/25"
                : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/40"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  sourceType === "text"
                    ? "bg-zinc-200 text-zinc-950 font-bold shadow-xs"
                    : "bg-zinc-900 text-zinc-300 border border-zinc-800"
                }`}
              >
                <FileText className="w-4 h-4" />
              </div>
              {sourceType === "text" && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-950 shadow-xs">
                  Selected
                </span>
              )}
            </div>
            <h4 className="text-sm font-bold text-white">Generate from Text</h4>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Paste notes, textbook excerpts, or article study material.
            </p>
          </div>

          {/* Card C: PDF */}
          <div
            onClick={() => onSelectSourceType("pdf")}
            role="button"
            tabIndex={0}
            className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-150 select-none ${
              sourceType === "pdf"
                ? "border-zinc-500 bg-zinc-900 shadow-xs ring-1 ring-zinc-500/25"
                : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/40"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  sourceType === "pdf"
                    ? "bg-zinc-200 text-zinc-950 font-bold shadow-xs"
                    : "bg-zinc-900 text-zinc-300 border border-zinc-800"
                }`}
              >
                <UploadCloud className="w-4 h-4" />
              </div>
              {sourceType === "pdf" && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-950 shadow-xs">
                  Selected
                </span>
              )}
            </div>
            <h4 className="text-sm font-bold text-white">Generate from PDF</h4>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Upload course slides or notes to extract text page-by-page.
            </p>
          </div>
        </div>
      </div>

      {/* Form Fields for Active Source */}
      <div className="p-6 rounded-2xl bg-zinc-950/80 border border-white/10 shadow-xl space-y-4">
        {/* OPTION A: TOPIC FORM */}
        {sourceType === "topic" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                Topic or Subject <span className="text-zinc-400">*</span>
              </label>
              <input
                type="text"
                value={topicForm.topic}
                onChange={(e) => onUpdateTopicForm({ topic: e.target.value })}
                placeholder="e.g., Python Decorators & Generators"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-sm font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 transition-all"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Provide the specific subject or topic for question formulation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Subject Context (Optional)
                </label>
                <input
                  type="text"
                  value={topicForm.subject}
                  onChange={(e) => onUpdateTopicForm({ subject: e.target.value })}
                  placeholder="e.g., Computer Science, Biology"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Exam Context (Optional)
                </label>
                <input
                  type="text"
                  value={topicForm.exam}
                  onChange={(e) => onUpdateTopicForm({ exam: e.target.value })}
                  placeholder="e.g., AP Computer Science A, University Final"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Additional Instructions (Optional)
              </label>
              <textarea
                value={topicForm.additional_instructions}
                onChange={(e) => onUpdateTopicForm({ additional_instructions: e.target.value })}
                rows={2}
                placeholder="e.g., Focus on practical coding scenarios and common misconceptions."
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 resize-none transition-all"
              />
            </div>
          </div>
        )}

        {/* OPTION B: TEXT FORM */}
        {sourceType === "text" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Material Title (Optional)
              </label>
              <input
                type="text"
                value={textForm.title}
                onChange={(e) => onUpdateTextForm({ title: e.target.value })}
                placeholder="e.g., Lecture 4: Neural Network Backpropagation"
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Pasted Study Material <span className="text-zinc-400">*</span>
                </label>
                <div className="text-[11px] text-zinc-400 font-mono">
                  <span>{textWords.toLocaleString()} words</span>
                  <span className="mx-1.5">•</span>
                  <span className={textChars > maxChars ? "text-white font-bold underline" : ""}>
                    {textChars.toLocaleString()} / {maxChars.toLocaleString()} chars
                  </span>
                </div>
              </div>

              <textarea
                value={textForm.text}
                onChange={(e) => onUpdateTextForm({ text: e.target.value })}
                rows={8}
                placeholder="Paste your study notes, textbook chapters, or article summary here..."
                className="w-full px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-950 text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 leading-relaxed resize-y transition-all"
              />

              {textChars > maxChars && (
                <p className="text-xs text-white mt-1 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5 text-zinc-400" />
                  <span>
                    Your text exceeds the maximum character limit. Please shorten your study notes.
                  </span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Additional Instructions (Optional)
              </label>
              <input
                type="text"
                value={textForm.additional_instructions}
                onChange={(e) => onUpdateTextForm({ additional_instructions: e.target.value })}
                placeholder="e.g., Extract definitions and formula application questions."
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 transition-all"
              />
            </div>
          </div>
        )}

        {/* OPTION C: PDF FORM */}
        {sourceType === "pdf" && (
          <div className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileSelect(file);
              }}
              accept="application/pdf"
              className="hidden"
            />

            {!pdfForm.file ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-zinc-400 bg-white/10"
                    : "border-zinc-800 hover:border-zinc-600 bg-zinc-900/30 hover:bg-zinc-900/60"
                }`}
              >
                <UploadCloud className="w-10 h-10 mx-auto text-zinc-300 mb-2.5" />
                <h4 className="text-sm font-bold text-white">
                  Drag and drop your study PDF here
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Upload course slides, syllabus, or lecture reading (up to 15MB)
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="mt-4 px-4 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 text-zinc-950 hover:bg-white transition-colors shadow-xs"
                >
                  Browse Files
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-200 text-zinc-950 flex items-center justify-center font-bold">
                      <FileCheck className="w-5 h-5 text-zinc-950" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white truncate max-w-sm">
                        {pdfForm.filename}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {(pdfForm.fileSize / (1024 * 1024)).toFixed(2)} MB • PDF Document
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-white hover:underline font-semibold"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={onRemovePDF}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="Remove PDF"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Extraction Metadata */}
                {pdfForm.pageCount > 0 && (
                  <div className="p-3 rounded-lg bg-black/50 border border-white/10 flex items-center justify-between text-xs">
                    <span className="text-zinc-300">
                      Extracted: <strong className="text-white">{pdfForm.pageCount} pages</strong> ({pdfForm.wordCount.toLocaleString()} words)
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-zinc-200 font-bold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      PyMuPDF Extraction Ready
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Processing State */}
        {isProcessingSource && (
          <div className="p-3.5 rounded-xl bg-zinc-900 border border-white/20 flex items-center gap-3 text-xs text-white">
            <Loader2 className="w-4 h-4 animate-spin text-white flex-shrink-0" />
            <span>Validating and processing source with backend PyMuPDF parser...</span>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-zinc-900 border border-white/25 flex items-start gap-2.5 text-xs text-white">
            <AlertCircle className="w-4 h-4 text-zinc-300 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Prepared Success Confirmation */}
        {preparedSource && !errorMessage && !isProcessingSource && (
          <div className="p-3 rounded-xl bg-white/5 border border-white/20 flex items-center justify-between text-xs text-white">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>
                Source prepared successfully (ID: <code className="font-mono text-white bg-white/10 px-1.5 py-0.5 rounded">{preparedSource.source_id}</code>)
              </span>
            </div>
            <span className="font-semibold text-zinc-300">
              {preparedSource.word_count.toLocaleString()} words analyzed
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
