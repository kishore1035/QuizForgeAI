from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.quiz import (
    QuestionType,
    DifficultyLevel,
    SourceReference,
    GeneratedQuestion,
    GeneratedQuizSettings,
    GeneratedQuizSourceMeta,
    GeneratedQuizResponse,
)


class QuizTakingOption(BaseModel):
    """Sanitized option returned during an active taking attempt. Excludes correctness tags."""
    id: str = Field(..., description="Option identifier (e.g. 'a', 'b')")
    text: str = Field(..., description="Option label text")


class QuizTakingQuestion(BaseModel):
    """
    Sanitized question for an active quiz attempt.
    CRITICAL: Never exposes correct_option_id, expected_answer, or explanation!
    """
    question_id: str = Field(..., description="Question ID")
    number: int = Field(..., description="Question sequence number (1-based)")
    type: QuestionType = Field(..., description="Question type (multiple_choice, true_false, short_answer)")
    question_text: str = Field(..., description="Question stem text")
    options: List[QuizTakingOption] = Field(
        default_factory=list,
        description="List of options for MCQ or True/False questions",
    )
    difficulty: DifficultyLevel = Field(default=DifficultyLevel.MEDIUM)
    topic: Optional[str] = Field(default=None)
    max_score: float = Field(default=1.0, description="Maximum points for this question")


class StartAttemptRequest(BaseModel):
    """Optional payload when initiating a quiz attempt."""
    participant_name: Optional[str] = Field(default=None, max_length=100)


class StartAttemptResponse(BaseModel):
    """Response returned when an attempt begins, containing scrubbed questions and attempt ID."""
    attempt_id: str = Field(..., description="Unique attempt session identifier")
    quiz_id: str = Field(..., description="ID of the quiz being taken")
    title: str = Field(..., description="Quiz title")
    time_limit_enabled: bool = Field(..., description="Whether a per-question timer applies")
    time_limit_seconds: Optional[int] = Field(
        default=None,
        description="Duration per question in seconds (if enabled)",
    )
    total_questions: int = Field(..., description="Total number of questions")
    questions: List[QuizTakingQuestion] = Field(..., description="Sanitized question list")
    started_at: str = Field(..., description="ISO 8601 timestamp of when attempt started")


class SubmittedAnswer(BaseModel):
    """A student's answer to a single question."""
    question_id: str = Field(..., description="Question ID being answered")
    selected_option_id: Optional[str] = Field(
        default=None,
        description="Option ID chosen for MCQ or True/False",
    )
    text_answer: Optional[str] = Field(
        default=None,
        description="Student's typed response for short answer questions",
    )


class SubmitAttemptRequest(BaseModel):
    """Full submission payload for a quiz attempt."""
    answers: List[SubmittedAnswer] = Field(
        default_factory=list,
        description="List of submitted question answers",
    )
    time_spent_seconds: Optional[int] = Field(
        default=None,
        ge=0,
        description="Total elapsed time in seconds",
    )


class QuestionResultItem(BaseModel):
    """Evaluated result for a single question post-submission."""
    question_id: str
    number: int
    type: QuestionType
    question_text: str
    selected_option_id: Optional[str] = None
    user_answer_text: Optional[str] = None
    correct_answer_text: str
    correct_option_id: Optional[str] = None
    is_correct: bool
    is_unanswered: bool
    score: float = Field(..., description="Score awarded (supports partial credit)")
    max_score: float = Field(default=1.0)
    explanation: str
    feedback: Optional[str] = Field(
        default=None,
        description="Qualitative AI feedback or rationale for the score",
    )
    sources: List[SourceReference] = Field(default_factory=list)


class AttemptResultResponse(BaseModel):
    """Comprehensive post-submission result report with score, breakdown, and question reviews."""
    attempt_id: str
    quiz_id: str
    title: str
    total_questions: int
    answered_count: int
    unanswered_count: int
    correct_count: int
    incorrect_count: int
    total_score: float
    max_score: float
    percentage: float
    time_spent_seconds: Optional[int] = None
    is_submitted: bool = True
    started_at: str
    submitted_at: str
    questions: List[QuestionResultItem]


class QuizSaveRequest(BaseModel):
    """Request model for saving/updating a quiz draft from the creator."""
    quiz_id: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=200)
    questions: List[GeneratedQuestion]
    settings: Optional[GeneratedQuizSettings] = None
    source_metadata: Optional[GeneratedQuizSourceMeta] = None
    difficulty: Optional[str] = None
    source_type: Optional[str] = None
    subject: Optional[str] = None
    exam: Optional[str] = None
    academic_year: Optional[str] = None
    time_limit_enabled: Optional[bool] = None
    time_limit_seconds: Optional[int] = None


class QuizUpdateRequest(BaseModel):
    """Request model for editing a saved quiz."""
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    difficulty: Optional[str] = None
    subject: Optional[str] = None
    exam: Optional[str] = None
    academic_year: Optional[str] = None
    time_limit_enabled: Optional[bool] = None
    time_limit_seconds: Optional[int] = None
    questions: Optional[List[GeneratedQuestion]] = None


class QuizListItem(BaseModel):
    """Lightweight summary of a saved quiz for the Quiz Library."""
    quiz_id: str
    title: str
    source_id: Optional[str] = None
    source_type: str
    subject: Optional[str] = None
    exam: Optional[str] = None
    academic_year: Optional[str] = None
    difficulty: str
    question_count: int
    time_limit_enabled: bool
    time_limit_seconds: Optional[int] = None
    status: str
    attempt_count: int = 0
    latest_score: Optional[float] = None
    latest_percentage: Optional[float] = None
    best_percentage: Optional[float] = None
    created_at: str
    updated_at: str


class QuizListResponse(BaseModel):
    """Response returned when querying the Quiz Library."""
    quizzes: List[QuizListItem]
    total: int


class AttemptHistoryItem(BaseModel):
    """Summary of a past quiz attempt."""
    attempt_id: str
    quiz_id: str
    participant_name: Optional[str] = None
    status: str
    started_at: str
    submitted_at: Optional[str] = None
    time_taken_seconds: Optional[int] = None
    total_questions: int
    answered_count: int
    correct_count: int
    incorrect_count: int
    unanswered_count: int
    total_score: float
    max_score: float
    percentage: float


class AttemptHistoryResponse(BaseModel):
    """List of all attempts for a specific quiz."""
    quiz_id: str
    title: str
    attempts: List[AttemptHistoryItem]
    total_attempts: int

