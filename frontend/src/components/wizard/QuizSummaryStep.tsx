"use client";

import React, { useState } from "react";
import {
  Sparkles,
  BookOpen,
  FileText,
  UploadCloud,
  Code2,
  Sliders,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { WizardSessionState } from "@/types/wizard";
import { QuizGenerationReadyResponse } from "@/types/api";

interface QuizSummaryStepProps {
  session: WizardSessionState;
  finalTitle: string;
  onGenerateQuiz: () => Promise<void>;
  isGenerating: boolean;
  generationStage: string;
  generationError: string | null;
  onClearGenerationError: () => void;
  onBackToConfig: () => void;
  onValidateAndPrepare?: () => Promise<void>;
  isValidating?: boolean;
  validationError?: string | null;
  generationReadyResult?: QuizGenerationReadyResponse | null;
}

export const QuizSummaryStep: React.FC<QuizSummaryStepProps> = ({
  session,
  finalTitle,
  onGenerateQuiz,
  isGenerating,
  generationStage,
  generationError,
  onClearGenerationError,
  onBackToConfig,
  onValidateAndPrepare,
  isValidating = false,
  validationError = null,
  generationReadyResult = null,
}) => {
  const [showPayloadJson, setShowPayloadJson] = useState(false);

  const { sourceType, config, preparedSource, pdfForm, textForm } = session;

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-6 rounded-2xl bg-zinc-950/80 border border-white/10 shadow-xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-950 bg-zinc-200 px-2.5 py-0.5 rounded-full shadow-xs">
              Ready for AI Generation
            </span>
            <h3 className="text-xl font-bold text-white mt-1.5">{finalTitle}</h3>
          </div>

          <button
            type="button"
            disabled={isGenerating}
            onClick={onBackToConfig}
            className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1 disabled:opacity-50 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Edit Settings</span>
          </button>
        </div>

        {/* 2-Column Summary Spec List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Source Spec */}
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-white font-bold">
              {sourceType === "topic" && <BookOpen className="w-4 h-4 text-white" />}
              {sourceType === "text" && <FileText className="w-4 h-4 text-white" />}
              {sourceType === "pdf" && <UploadCloud className="w-4 h-4 text-white" />}
              <span>Source: {sourceType.toUpperCase()}</span>
            </div>

            <div className="text-zinc-400 space-y-1 pt-1">
              {sourceType === "topic" && (
                <p>
                  <strong className="text-zinc-200">Topic:</strong> {session.topicForm.topic}
                </p>
              )}
              {sourceType === "text" && (
                <p>
                  <strong className="text-zinc-200">Study Notes:</strong>{" "}
                  {textForm.text.trim().split(/\s+/).length.toLocaleString()} words (
                  {textForm.text.length.toLocaleString()} characters)
                </p>
              )}
              {sourceType === "pdf" && (
                <div>
                  <p>
                    <strong className="text-zinc-200">PDF File:</strong> {pdfForm.filename}
                  </p>
                  <p>
                    <strong className="text-zinc-200">Extracted:</strong> {pdfForm.pageCount} pages (
                    {pdfForm.wordCount.toLocaleString()} words)
                  </p>
                </div>
              )}
              {preparedSource && (
                <p className="text-[11px] text-zinc-500 font-mono">
                  Validated Source ID: {preparedSource.source_id}
                </p>
              )}
            </div>
          </div>

          {/* Quiz Parameter Spec */}
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/10 space-y-2">
            <div className="text-white font-bold flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-white" />
              <span>Generation Parameters</span>
            </div>

            <div className="text-zinc-400 space-y-1 pt-1">
              <p>
                <strong className="text-zinc-200">Questions:</strong> {config.question_count} questions
              </p>
              <p>
                <strong className="text-zinc-200">Difficulty:</strong>{" "}
                <span className="capitalize">{config.difficulty}</span>
              </p>
              <p>
                <strong className="text-zinc-200">Types:</strong>{" "}
                {config.question_types
                  .map((t) =>
                    t === "multiple_choice"
                      ? "MCQ"
                      : t === "true_false"
                      ? "True/False"
                      : "Short Answer"
                  )
                  .join(", ")}
              </p>
              <p>
                <strong className="text-zinc-200">Time Limit:</strong>{" "}
                {config.time_limit_enabled ? `${config.time_limit_seconds}s per question` : "None"}
              </p>
              {(config.subject || config.exam || config.academic_year) && (
                <p>
                  <strong className="text-zinc-200">Context:</strong>{" "}
                  {[config.subject, config.exam, config.academic_year].filter(Boolean).join(" • ")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* AI Engine Model Badge */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/70 border border-white/15 text-xs">
          <div className="flex items-center gap-2 text-white font-medium">
            <Sparkles className="w-4 h-4 text-white" />
            <span>AI Generation Engine:</span>
            <code className="font-mono font-bold text-white bg-white/10 px-1.5 py-0.5 rounded">nemotron-3-nano:30b-cloud</code>
          </div>
          <span className="text-[11px] text-zinc-300 bg-white/10 px-2 py-0.5 rounded-md border border-white/10 font-medium">
            Ollama Cloud
          </span>
        </div>

        {/* Validation Errors */}
        {validationError && (
          <div className="p-3.5 rounded-xl bg-zinc-900 border border-white/20 flex items-start gap-2.5 text-xs text-white">
            <AlertCircle className="w-4 h-4 text-zinc-300 flex-shrink-0 mt-0.5" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Generation Failure Error with Retry */}
        {generationError && (
          <div className="p-4 rounded-xl bg-zinc-900 border border-white/20 space-y-3">
            <div className="flex items-start gap-2.5 text-xs text-white">
              <AlertCircle className="w-4 h-4 text-zinc-300 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">Quiz Generation Failed</p>
                <p className="mt-1 leading-relaxed text-zinc-300">{generationError}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onGenerateQuiz}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-all shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 text-zinc-950" />
                <span>Retry Generation</span>
              </button>

              <button
                type="button"
                onClick={onClearGenerationError}
                className="text-xs font-semibold text-zinc-400 hover:text-white hover:underline transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Active Generation Loading State */}
        {isGenerating && (
          <div className="p-5 rounded-xl bg-zinc-900/80 border border-white/20 space-y-3 text-center">
            <div className="flex items-center justify-center gap-2.5 text-white">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-bold">Generating your quiz...</span>
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-black text-xs font-semibold text-white border border-white/20">
              {generationStage || "Contacting Nemotron 3 Nano..."}
            </div>

            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Please wait while Nemotron processes your study material and creates validated,
              source-grounded questions.
            </p>
          </div>
        )}

        {/* Pre-validation Ready Result if previously checked */}
        {generationReadyResult && !isGenerating && (
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-white font-medium">
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Specification validated on backend. Ready for Nemotron!</span>
            </div>
            <button
              type="button"
              onClick={() => setShowPayloadJson(!showPayloadJson)}
              className="text-zinc-300 hover:text-white hover:underline font-semibold flex items-center gap-1"
            >
              <Code2 className="w-3 h-3" />
              <span>{showPayloadJson ? "Hide" : "Inspect Payload"}</span>
            </button>
          </div>
        )}

        {showPayloadJson && generationReadyResult && (
          <div className="p-3 rounded-lg bg-black text-zinc-300 font-mono text-[11px] overflow-x-auto border border-white/10">
            <pre>{JSON.stringify(generationReadyResult.generation_payload, null, 2)}</pre>
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
          {onValidateAndPrepare && !generationReadyResult && (
            <button
              type="button"
              disabled={isValidating || isGenerating}
              onClick={onValidateAndPrepare}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-white/20 text-zinc-300 hover:bg-white/10 hover:text-white text-xs font-semibold transition-all disabled:opacity-50"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Validating...</span>
                </>
              ) : (
                <span>Validate Request Payload</span>
              )}
            </button>
          )}

          <button
            type="button"
            disabled={isGenerating || isValidating}
            onClick={onGenerateQuiz}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-all shadow-xs active:scale-[0.98] disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-950" />
                <span>Generating Quiz with Nemotron 3...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-zinc-950" />
                <span>Generate Quiz with Nemotron AI</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
