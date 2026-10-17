export type DifficultyLevel = "easy" | "medium" | "hard";

export type QuestionType = "multiple_choice" | "true_false" | "short_answer";

export type QuizSourceType = "topic" | "study_notes" | "document";

export interface QuizGeneratePayload {
  source_type: QuizSourceType;
  topic?: string;
  study_material?: string;
  difficulty: DifficultyLevel;
  question_count: number;
  question_types: QuestionType[];
}

export interface QuizSummary {
  id: string;
  title: string;
  source_type: QuizSourceType;
  difficulty: DifficultyLevel;
  question_count: number;
  created_at: string;
}
