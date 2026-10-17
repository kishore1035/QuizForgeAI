import { SourceResponse, PDFPageMetadata, QuizGenerationReadyResponse } from "./api";

export type WizardStep = 1 | 2 | 3;

export type WizardSourceType = "topic" | "text" | "pdf";

export interface TopicFormState {
  topic: string;
  additional_instructions: string;
  subject: string;
  exam: string;
}

export interface TextFormState {
  title: string;
  text: string;
  additional_instructions: string;
}

export interface PDFFormState {
  file: File | null;
  filename: string;
  fileSize: number;
  pageCount: number;
  wordCount: number;
  pages: PDFPageMetadata[];
}

export interface QuizConfigFormState {
  title: string;
  question_count: number;
  difficulty: "easy" | "medium" | "hard" | "mixed";
  question_types: string[];
  subject: string;
  exam: string;
  academic_year: string;
  time_limit_enabled: boolean;
  time_limit_seconds: number;
  additional_instructions: string;
}

export interface WizardSessionState {
  step: WizardStep;
  sourceType: WizardSourceType;
  topicForm: TopicFormState;
  textForm: TextFormState;
  pdfForm: PDFFormState;
  preparedSource: SourceResponse | null;
  isProcessingSource: boolean;
  sourceError: string | null;
  config: QuizConfigFormState;
  validationError: string | null;
  generationReadyResult: QuizGenerationReadyResponse | null;
}
