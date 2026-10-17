export interface OptionItem {
  id: string;
  label: "A" | "B" | "C" | "D" | string;
  text: string;
}

export interface QuestionImage {
  name: string;
  dataUrl: string;
  size: number;
}

export interface CreatorQuestion {
  id: string;
  number: number;
  text: string;
  type?: "multiple_choice" | "true_false" | "short_answer";
  image?: QuestionImage | null;
  options: OptionItem[];
  correctOptionId: string | null;
  expectedAnswer?: string | null;
  explanation: string;
  difficulty?: "easy" | "medium" | "hard" | "mixed";
  topic?: string | null;
  sources?: Array<{ source_id: string; page?: number }>;
  isComplete: boolean;
}

export interface QuizSpecification {
  exam: string;
  subject: string;
  year: string;
}

export interface TimeLimitConfig {
  enabled: boolean;
  selectedLabel: string;
  secondsPerQuestion: number;
}

export interface QuizCreatorState {
  id: string;
  title: string;
  questions: CreatorQuestion[];
  activeQuestionId: string;
  specification: QuizSpecification;
  timeLimit: TimeLimitConfig;
  hasUnsavedChanges: boolean;
  lastSavedAt?: string;
}
