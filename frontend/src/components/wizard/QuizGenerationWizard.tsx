"use client";

import React, { useState, useMemo } from "react";
import { ArrowLeft, ArrowRight, X, Sparkles, Loader2 } from "lucide-react";
import { WizardStepper } from "./WizardStepper";
import { SourceSelector } from "./SourceSelector";
import { QuizConfigurationStep } from "./QuizConfigurationStep";
import { QuizSummaryStep } from "./QuizSummaryStep";
import { ApiClient } from "@/lib/api";
import {
  WizardStep,
  WizardSourceType,
  TopicFormState,
  TextFormState,
  PDFFormState,
  QuizConfigFormState,
  WizardSessionState,
} from "@/types/wizard";
import {
  QuizGenerationReadyResponse,
  QuizGenerationRequestPayload,
  GeneratedQuizResponse,
} from "@/types/api";

interface QuizGenerationWizardProps {
  onCancel: () => void;
  onOpenInCreatorWithGeneratedQuiz?: (generatedQuiz: GeneratedQuizResponse) => void;
  onOpenInCreatorWithConfig?: (config: {
    title: string;
    subject: string;
    exam: string;
    year: string;
    timeLimitEnabled: boolean;
    secondsPerQuestion: number;
  }) => void;
  initialSourceType?: WizardSourceType;
}

export const QuizGenerationWizard: React.FC<QuizGenerationWizardProps> = ({
  onCancel,
  onOpenInCreatorWithGeneratedQuiz,
  onOpenInCreatorWithConfig,
  initialSourceType = "topic",
}) => {
  const [step, setStep] = useState<WizardStep>(1);
  const [sourceType, setSourceType] = useState<WizardSourceType>(initialSourceType);

  const [topicForm, setTopicForm] = useState<TopicFormState>({
    topic: "",
    additional_instructions: "",
    subject: "",
    exam: "",
  });

  const [textForm, setTextForm] = useState<TextFormState>({
    title: "",
    text: "",
    additional_instructions: "",
  });

  const [pdfForm, setPdfForm] = useState<PDFFormState>({
    file: null,
    filename: "",
    fileSize: 0,
    pageCount: 0,
    wordCount: 0,
    pages: [],
  });

  const [config, setConfig] = useState<QuizConfigFormState>({
    title: "",
    question_count: 10,
    difficulty: "medium",
    question_types: ["multiple_choice"],
    subject: "",
    exam: "",
    academic_year: "2026",
    time_limit_enabled: true,
    time_limit_seconds: 30,
    additional_instructions: "",
  });

  const [preparedSource, setPreparedSource] = useState<WizardSessionState["preparedSource"]>(null);
  const [isProcessingSource, setIsProcessingSource] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);

  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [generationReadyResult, setGenerationReadyResult] =
    useState<QuizGenerationReadyResponse | null>(null);

  // AI Quiz Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState("");
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Auto-derive default quiz title from source
  const derivedTitle = useMemo(() => {
    if (config.title.trim()) return config.title.trim();
    if (sourceType === "topic" && topicForm.topic.trim()) {
      return `${topicForm.topic.trim()} Quiz`;
    }
    if (sourceType === "text" && textForm.title.trim()) {
      return textForm.title.trim();
    }
    if (sourceType === "pdf" && pdfForm.filename) {
      return pdfForm.filename.replace(/\.pdf$/i, "").replace(/[-_]/g, " ") + " Quiz";
    }
    return "Untitled Practice Quiz";
  }, [config.title, sourceType, topicForm.topic, textForm.title, pdfForm.filename]);

  // Handle PDF file selection & direct background extraction
  const handleFileSelect = async (file: File) => {
    setSourceError(null);
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setSourceError("Only PDF (.pdf) documents are accepted.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setSourceError("File size exceeds 15MB limit.");
      return;
    }

    setPdfForm((prev) => ({
      ...prev,
      file,
      filename: file.name,
      fileSize: file.size,
    }));

    setIsProcessingSource(true);
    try {
      const resp = await ApiClient.uploadPDFSource(file);
      setPreparedSource(resp);
      setPdfForm((prev) => ({
        ...prev,
        pageCount: resp.page_count || 0,
        wordCount: resp.word_count,
        pages: resp.pages || [],
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to extract text from PDF";
      setSourceError(msg);
      setPreparedSource(null);
    } finally {
      setIsProcessingSource(false);
    }
  };

  const handleRemovePDF = () => {
    setPdfForm({
      file: null,
      filename: "",
      fileSize: 0,
      pageCount: 0,
      wordCount: 0,
      pages: [],
    });
    setPreparedSource(null);
    setSourceError(null);
  };

  // Step 1 -> Step 2 validation & backend submission
  const handleProceedToConfig = async () => {
    setSourceError(null);

    if (sourceType === "topic") {
      if (!topicForm.topic.trim()) {
        setSourceError("Please enter a topic name before continuing.");
        return;
      }
      setIsProcessingSource(true);
      try {
        const resp = await ApiClient.createTopicSource({
          topic: topicForm.topic.trim(),
          additional_instructions: topicForm.additional_instructions.trim() || undefined,
          subject: topicForm.subject.trim() || undefined,
          exam: topicForm.exam.trim() || undefined,
        });
        setPreparedSource(resp);
        if (topicForm.subject.trim() && !config.subject) {
          setConfig((prev) => ({ ...prev, subject: topicForm.subject.trim() }));
        }
        if (topicForm.exam.trim() && !config.exam) {
          setConfig((prev) => ({ ...prev, exam: topicForm.exam.trim() }));
        }
        setStep(2);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to register topic source";
        setSourceError(msg);
      } finally {
        setIsProcessingSource(false);
      }
    } else if (sourceType === "text") {
      if (!textForm.text.trim()) {
        setSourceError("Please paste your study material before continuing.");
        return;
      }
      setIsProcessingSource(true);
      try {
        const resp = await ApiClient.createTextSource({
          text: textForm.text.trim(),
          title: textForm.title.trim() || undefined,
          additional_instructions: textForm.additional_instructions.trim() || undefined,
        });
        setPreparedSource(resp);
        setStep(2);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to register text source";
        setSourceError(msg);
      } finally {
        setIsProcessingSource(false);
      }
    } else if (sourceType === "pdf") {
      if (!pdfForm.file) {
        setSourceError("Please select or drop a PDF document.");
        return;
      }
      if (!preparedSource || preparedSource.status !== "ready") {
        setSourceError("Please wait for the PDF extraction to complete successfully.");
        return;
      }
      setStep(2);
    }
  };

  // Step 2 -> Step 3 validation
  const handleProceedToSummary = () => {
    setValidationError(null);
    if (config.question_count < 1 || config.question_count > 100) {
      setValidationError("Question count must be between 1 and 100.");
      return;
    }
    if (config.question_types.length === 0) {
      setValidationError("Please select at least one question type.");
      return;
    }
    setStep(3);
  };

  // Step 3: Optional Pre-validation inspect
  const handleValidateAndPrepare = async () => {
    if (!preparedSource) {
      setValidationError("Source is not registered. Please go back to Step 1.");
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      const payload: QuizGenerationRequestPayload = {
        source_id: preparedSource.source_id,
        title: derivedTitle,
        question_count: config.question_count,
        difficulty: config.difficulty,
        question_types: config.question_types,
        subject: config.subject.trim() || null,
        exam: config.exam.trim() || null,
        academic_year: config.academic_year.trim() || null,
        time_limit_enabled: config.time_limit_enabled,
        time_limit_seconds: config.time_limit_enabled ? config.time_limit_seconds : null,
        additional_instructions: config.additional_instructions.trim() || null,
      };

      const result = await ApiClient.validateQuizGenerationRequest(payload);
      setGenerationReadyResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Validation failed on server";
      setValidationError(msg);
    } finally {
      setIsValidating(false);
    }
  };

  // Step 3: Primary Action — Generate Quiz with Nemotron AI
  const handleGenerateQuiz = async () => {
    if (!preparedSource) {
      setGenerationError("Source is not registered. Please go back to Step 1.");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStage("Preparing source material...");

    try {
      const payload: QuizGenerationRequestPayload = {
        source_id: preparedSource.source_id,
        title: derivedTitle,
        question_count: config.question_count,
        difficulty: config.difficulty,
        question_types: config.question_types,
        subject: config.subject.trim() || null,
        exam: config.exam.trim() || null,
        academic_year: config.academic_year.trim() || null,
        time_limit_enabled: config.time_limit_enabled,
        time_limit_seconds: config.time_limit_enabled ? config.time_limit_seconds : null,
        additional_instructions: config.additional_instructions.trim() || null,
      };

      setGenerationStage("Generating questions with Nemotron 3 Nano Cloud...");
      const result = await ApiClient.generateQuiz(payload);

      setGenerationStage("Validating answer keys and structure...");
      if (!result.questions || result.questions.length === 0) {
        throw new Error("No questions were generated by the AI model.");
      }

      setGenerationStage("Preparing quiz editor...");
      if (onOpenInCreatorWithGeneratedQuiz) {
        onOpenInCreatorWithGeneratedQuiz(result);
      } else if (onOpenInCreatorWithConfig) {
        onOpenInCreatorWithConfig({
          title: result.title,
          subject: result.settings.subject || "",
          exam: result.settings.exam || "",
          year: result.settings.academic_year || "",
          timeLimitEnabled: result.settings.time_limit_enabled,
          secondsPerQuestion: result.settings.time_limit_seconds || 30,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "AI quiz generation failed on server.";
      setGenerationError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const canNavigateToStep = (targetStep: WizardStep): boolean => {
    if (isGenerating) return false;
    if (targetStep === 1) return true;
    if (targetStep === 2) return !!preparedSource;
    if (targetStep === 3) return !!preparedSource && config.question_types.length > 0;
    return false;
  };

  const sessionState: WizardSessionState = {
    step,
    sourceType,
    topicForm,
    textForm,
    pdfForm,
    preparedSource,
    isProcessingSource,
    sourceError,
    config,
    validationError,
    generationReadyResult,
  };

  return (
    <div className="min-h-full flex flex-col justify-center p-3 sm:p-6 lg:p-8 font-sans bg-forge-mesh">
      <div
        className="w-full max-w-4xl mx-auto rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            background: "var(--bg-surface)",
          }}
        >
          <div>
            <h2 className="text-lg font-bold text-white">Create New Quiz</h2>
            <p className="text-xs text-zinc-400">
              Set up your study material and generate questions with Nemotron 3 AI
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isGenerating}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
            title="Close setup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress */}
        <WizardStepper
          currentStep={step}
          onStepClick={(s) => setStep(s)}
          canNavigateToStep={canNavigateToStep}
        />

        {/* Step Body */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1">
          {step === 1 && (
            <SourceSelector
              sourceType={sourceType}
              onSelectSourceType={(t) => {
                setSourceType(t);
                setSourceError(null);
              }}
              topicForm={topicForm}
              onUpdateTopicForm={(up) => setTopicForm((prev) => ({ ...prev, ...up }))}
              textForm={textForm}
              onUpdateTextForm={(up) => setTextForm((prev) => ({ ...prev, ...up }))}
              pdfForm={pdfForm}
              onUpdatePDFForm={(up) => setPdfForm((prev) => ({ ...prev, ...up }))}
              onFileSelect={handleFileSelect}
              onRemovePDF={handleRemovePDF}
              isProcessingSource={isProcessingSource}
              preparedSource={preparedSource}
              errorMessage={sourceError}
            />
          )}

          {step === 2 && (
            <QuizConfigurationStep
              config={config}
              onUpdateConfig={(up) => setConfig((prev) => ({ ...prev, ...up }))}
              defaultDerivedTitle={derivedTitle}
            />
          )}

          {step === 3 && (
            <QuizSummaryStep
              session={sessionState}
              finalTitle={derivedTitle}
              onGenerateQuiz={handleGenerateQuiz}
              isGenerating={isGenerating}
              generationStage={generationStage}
              generationError={generationError}
              onClearGenerationError={() => setGenerationError(null)}
              onBackToConfig={() => setStep(2)}
              onValidateAndPrepare={handleValidateAndPrepare}
              isValidating={isValidating}
              validationError={validationError}
              generationReadyResult={generationReadyResult}
            />
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            background: "var(--bg-elevated)",
          }}
        >
          <div>
            {step > 1 ? (
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => setStep((s) => (s - 1) as WizardStep)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 text-xs font-semibold text-zinc-300 hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
            )}
          </div>

          <div>
            {step === 1 && (
              <button
                type="button"
                disabled={isProcessingSource}
                onClick={handleProceedToConfig}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-all shadow-xs active:scale-[0.98] disabled:opacity-50"
              >
                <span>Continue to Configuration</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={handleProceedToSummary}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-all shadow-xs active:scale-[0.98]"
              >
                <span>Review & Generate</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerateQuiz}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-all shadow-xs active:scale-[0.98] disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-950" />
                    <span>Generating Quiz...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-zinc-950" />
                    <span>Generate Quiz with AI</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
