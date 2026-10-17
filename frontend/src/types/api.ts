export interface HealthResponse {
  status: string;
  app_name: string;
  version: string;
  environment: string;
  ai_service_configured: boolean;
  model_target: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: boolean;
  error: {
    message: string;
    type: string;
    details?: unknown;
  };
}

export interface PDFPageMetadata {
  page_number: number;
  char_count: number;
  word_count: number;
  preview_snippet: string;
}

export interface SourceResponse {
  source_id: string;
  source_type: "topic" | "text" | "pdf";
  title: string;
  status: "ready" | "processing" | "error";
  filename?: string;
  file_size_bytes?: number;
  page_count?: number;
  word_count: number;
  char_count: number;
  pages?: PDFPageMetadata[];
  created_at: string;
  error_message?: string;
}

export interface QuizGenerationRequestPayload {
  source_id: string;
  title: string;
  question_count: number;
  difficulty: "easy" | "medium" | "hard" | "mixed";
  question_types: string[];
  subject?: string | null;
  exam?: string | null;
  academic_year?: string | null;
  time_limit_enabled: boolean;
  time_limit_seconds?: number | null;
  additional_instructions?: string | null;
}

export interface QuizGenerationReadyResponse {
  valid: boolean;
  status: string;
  message: string;
  generation_payload: QuizGenerationRequestPayload;
  source_title: string;
  source_type: string;
}

export interface QuizOptionItem {
  id: string;
  text: string;
}

export interface SourceReference {
  source_id: string;
  page?: number;
}

export interface GeneratedQuestion {
  question_id: string;
  type: "multiple_choice" | "true_false" | "short_answer";
  question_text: string;
  options: QuizOptionItem[];
  correct_option_id?: string | null;
  expected_answer?: string | null;
  explanation: string;
  difficulty: "easy" | "medium" | "hard" | "mixed";
  topic?: string | null;
  sources: SourceReference[];
}

export interface GeneratedQuizResponse {
  quiz_id: string;
  title: string;
  status: string;
  question_count: number;
  questions: GeneratedQuestion[];
  settings: {
    difficulty: string;
    question_types: string[];
    time_limit_enabled: boolean;
    time_limit_seconds?: number | null;
    subject?: string | null;
    exam?: string | null;
    academic_year?: string | null;
  };
  source_metadata: {
    source_id: string;
    source_type: string;
    title: string;
    filename?: string | null;
    page_count?: number | null;
    word_count?: number | null;
  };
  created_at: string;
}

