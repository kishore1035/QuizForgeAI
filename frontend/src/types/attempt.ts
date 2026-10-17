export interface QuizTakingOption {
  id: string;
  text: string;
}

export interface QuizTakingQuestion {
  question_id: string;
  number: number;
  type: "multiple_choice" | "true_false" | "short_answer";
  question_text: string;
  options: QuizTakingOption[];
  difficulty?: string;
  topic?: string | null;
  max_score: number;
}

export interface StartAttemptResponse {
  attempt_id: string;
  quiz_id: string;
  title: string;
  time_limit_enabled: boolean;
  time_limit_seconds?: number | null;
  total_questions: number;
  questions: QuizTakingQuestion[];
  started_at: string;
}

export interface SubmittedAnswer {
  question_id: string;
  selected_option_id?: string;
  text_answer?: string;
}

export interface SubmitAttemptRequest {
  answers: SubmittedAnswer[];
  time_spent_seconds?: number;
}

export interface QuestionResultItem {
  question_id: string;
  number: number;
  type: "multiple_choice" | "true_false" | "short_answer" | string;
  question_text: string;
  selected_option_id?: string | null;
  user_answer_text?: string | null;
  correct_answer_text: string;
  correct_option_id?: string | null;
  is_correct: boolean;
  is_unanswered: boolean;
  score: number;
  max_score: number;
  explanation: string;
  feedback?: string | null;
  sources?: Array<{ source_id: string; page?: number }>;
}

export interface AttemptResultResponse {
  attempt_id: string;
  quiz_id: string;
  title: string;
  total_questions: number;
  answered_count: number;
  unanswered_count: number;
  correct_count: number;
  incorrect_count: number;
  total_score: number;
  max_score: number;
  percentage: number;
  time_spent_seconds?: number | null;
  is_submitted: boolean;
  started_at: string;
  submitted_at: string;
  questions: QuestionResultItem[];
}

export interface QuizListItem {
  quiz_id: string;
  title: string;
  source_id?: string | null;
  source_type: string;
  subject?: string | null;
  exam?: string | null;
  academic_year?: string | null;
  difficulty: string;
  question_count: number;
  time_limit_enabled: boolean;
  time_limit_seconds?: number | null;
  status: string;
  attempt_count: number;
  latest_score?: number | null;
  latest_percentage?: number | null;
  best_percentage?: number | null;
  created_at: string;
  updated_at: string;
}

export interface QuizListResponse {
  quizzes: QuizListItem[];
  total: number;
}

export interface AttemptHistoryItem {
  attempt_id: string;
  quiz_id: string;
  participant_name?: string | null;
  status: string;
  started_at: string;
  submitted_at?: string | null;
  time_taken_seconds?: number | null;
  total_questions: number;
  answered_count: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  total_score: number;
  max_score: number;
  percentage: number;
}

export interface AttemptHistoryResponse {
  quiz_id: string;
  title: string;
  attempts: AttemptHistoryItem[];
  total_attempts: number;
}

export interface QuizUpdateRequest {
  title?: string;
  difficulty?: string;
  subject?: string;
  exam?: string;
  academic_year?: string;
  time_limit_enabled?: boolean;
  time_limit_seconds?: number;
  questions?: any[];
}

