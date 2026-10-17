from enum import Enum
from typing import Any, List, Optional
from pydantic import BaseModel, Field, model_validator


class QuestionType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    SHORT_ANSWER = "short_answer"


class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    MIXED = "mixed"


class QuizGenerationRequest(BaseModel):
    """
    Strongly typed contract for the prepared quiz generation request.
    Validates parameters before handing off to the AI pipeline.
    """
    source_id: str = Field(..., description="ID of a validated source (Topic, Text, or PDF)")
    title: str = Field(..., min_length=1, max_length=200, description="Quiz title")
    question_count: int = Field(default=10, ge=1, le=100, description="Requested number of questions")
    difficulty: DifficultyLevel = Field(default=DifficultyLevel.MEDIUM, description="Target difficulty level")
    question_types: List[QuestionType] = Field(
        default=[QuestionType.MULTIPLE_CHOICE],
        min_length=1,
        description="Allowed question types (at least one required)",
    )
    subject: Optional[str] = Field(default=None, max_length=100)
    exam: Optional[str] = Field(default=None, max_length=100)
    academic_year: Optional[str] = Field(default=None, max_length=50)
    time_limit_enabled: bool = Field(default=False, description="Whether per-question timer is active")
    time_limit_seconds: Optional[int] = Field(
        default=None,
        ge=5,
        le=5400,
        description="Per-question time limit in seconds (5s to 90m)",
    )
    additional_instructions: Optional[str] = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def validate_timer_consistency(self) -> "QuizGenerationRequest":
        if self.time_limit_enabled and (self.time_limit_seconds is None or self.time_limit_seconds < 5):
            raise ValueError("When time_limit_enabled is true, time_limit_seconds must be at least 5 seconds.")
        return self


# Backward-compatible alias
QuizGenerateRequest = QuizGenerationRequest


class QuizQuestion(BaseModel):
    id: str
    question_text: str
    question_type: QuestionType
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: str


class QuizResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    difficulty: DifficultyLevel
    questions: List[QuizQuestion]
    total_questions: int
    created_at: str


class QuizGenerationReadyResponse(BaseModel):
    """Returned when a generation request payload is validated and ready for LLM processing."""
    valid: bool = True
    status: str = "generation_ready"
    message: str
    generation_payload: QuizGenerationRequest
    source_title: str
    source_type: str


class QuizQuestionOption(BaseModel):
    id: str = Field(..., description="Option identifier (e.g. 'a', 'b', 'c', 'd')")
    text: str = Field(..., min_length=1, description="Option text content")


class SourceReference(BaseModel):
    source_id: str = Field(..., description="ID of the validated source")
    page: Optional[int] = Field(default=None, description="Page number where content is found")


class GeneratedQuestion(BaseModel):
    question_id: str = Field(..., description="Unique question identifier within the quiz")
    type: QuestionType = Field(default=QuestionType.MULTIPLE_CHOICE, description="Question type")
    question_text: str = Field(..., min_length=1, description="Question stem text")
    options: List[QuizQuestionOption] = Field(
        default_factory=list,
        description="List of options for MCQ or True/False questions",
    )
    correct_option_id: Optional[str] = Field(
        default=None,
        description="Option ID of the correct answer (for MCQ or True/False)",
    )
    expected_answer: Optional[str] = Field(
        default=None,
        description="Expected answer text (for short_answer questions)",
    )
    explanation: str = Field(..., min_length=1, description="Explanation or rationale")
    difficulty: DifficultyLevel = Field(default=DifficultyLevel.MEDIUM, description="Question difficulty")
    topic: Optional[str] = Field(default=None, description="Optional topic category")
    sources: List[SourceReference] = Field(
        default_factory=list,
        description="Grounding source citations",
    )

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Normalize type
            q_type = data.get("type")
            if isinstance(q_type, str):
                clean = q_type.lower().strip()
                if clean in ("mcq", "multiple choice", "multiple_choice"):
                    data["type"] = QuestionType.MULTIPLE_CHOICE
                elif clean in ("tf", "true/false", "true_false", "true false", "boolean"):
                    data["type"] = QuestionType.TRUE_FALSE
                elif clean in ("short", "short answer", "short_answer"):
                    data["type"] = QuestionType.SHORT_ANSWER

            # Normalize difficulty
            diff = data.get("difficulty")
            if isinstance(diff, str):
                data["difficulty"] = diff.lower().strip()

            # Normalize correct option ID casing/whitespace
            if "correct_option_id" in data and isinstance(data["correct_option_id"], str):
                data["correct_option_id"] = data["correct_option_id"].strip().lower()

            # Ensure option IDs are normalized
            opts = data.get("options")
            if isinstance(opts, list):
                norm_opts = []
                for idx, opt in enumerate(opts):
                    if isinstance(opt, dict):
                        opt_id = str(opt.get("id", chr(97 + idx))).strip().lower()
                        opt_text = str(opt.get("text", "")).strip()
                        norm_opts.append({"id": opt_id, "text": opt_text})
                    elif isinstance(opt, str):
                        norm_opts.append({"id": chr(97 + idx), "text": opt.strip()})
                    elif hasattr(opt, "id") and hasattr(opt, "text"):
                        norm_opts.append({"id": str(opt.id).strip().lower(), "text": str(opt.text).strip()})
                data["options"] = norm_opts
        return data


class GeneratedQuizPayload(BaseModel):
    """Raw structure expected from LLM output."""
    title: Optional[str] = Field(default=None, description="Quiz title")
    source_type: Optional[str] = Field(default=None, description="Source type")
    difficulty: Optional[DifficultyLevel] = Field(default=DifficultyLevel.MEDIUM)
    questions: List[GeneratedQuestion] = Field(default_factory=list)


class GeneratedQuizSettings(BaseModel):
    difficulty: str
    question_types: List[str]
    time_limit_enabled: bool
    time_limit_seconds: Optional[int] = None
    subject: Optional[str] = None
    exam: Optional[str] = None
    academic_year: Optional[str] = None


class GeneratedQuizSourceMeta(BaseModel):
    source_id: str
    source_type: str
    title: str
    filename: Optional[str] = None
    page_count: Optional[int] = None
    word_count: Optional[int] = None


class GeneratedQuizResponse(BaseModel):
    quiz_id: str
    title: str
    status: str = "generated"
    question_count: int
    questions: List[GeneratedQuestion]
    settings: GeneratedQuizSettings
    source_metadata: GeneratedQuizSourceMeta
    created_at: str

