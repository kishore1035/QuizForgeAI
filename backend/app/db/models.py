from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
    desc,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class SourceModel(Base):
    """Persistent storage for prepared study sources (Topic, Pasted Text, and PDF)."""
    __tablename__ = "sources"

    id = Column(String(64), primary_key=True)
    source_type = Column(String(32), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=True)
    additional_instructions = Column(Text, nullable=True)
    subject = Column(String(128), nullable=True)
    exam = Column(String(128), nullable=True)
    filename = Column(String(255), nullable=True)
    file_path = Column(String(512), nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    page_count = Column(Integer, nullable=True)
    word_count = Column(Integer, nullable=True)
    character_count = Column(Integer, nullable=True)
    status = Column(String(32), default="ready", nullable=False)
    pages_data = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    quizzes = relationship("QuizModel", back_populates="source", passive_deletes=True)


class QuizModel(Base):
    """Persistent storage for generated and draft quizzes."""
    __tablename__ = "quizzes"

    id = Column(String(64), primary_key=True)
    title = Column(String(255), nullable=False, index=True)
    source_id = Column(String(64), ForeignKey("sources.id", ondelete="SET NULL"), nullable=True, index=True)
    source_type = Column(String(32), nullable=False, default="topic")
    subject = Column(String(128), nullable=True)
    exam = Column(String(128), nullable=True)
    academic_year = Column(String(64), nullable=True)
    difficulty = Column(String(32), default="medium", nullable=False)
    question_count = Column(Integer, default=0, nullable=False)
    question_types = Column(JSON, default=list, nullable=False)
    time_limit_enabled = Column(Boolean, default=False, nullable=False)
    time_limit_seconds = Column(Integer, nullable=True)
    status = Column(String(32), default="draft", nullable=False)
    source_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False, index=True)

    # Relationships
    source = relationship("SourceModel", back_populates="quizzes")
    questions = relationship(
        "QuestionModel",
        back_populates="quiz",
        cascade="all, delete-orphan",
        order_by="QuestionModel.position",
        lazy="selectin",
    )
    attempts = relationship(
        "QuizAttemptModel",
        back_populates="quiz",
        cascade="all, delete-orphan",
        order_by=lambda: desc(QuizAttemptModel.started_at),
        lazy="selectin",
    )


class QuestionModel(Base):
    """Persistent question entities belonging to a quiz."""
    __tablename__ = "questions"

    quiz_id = Column(String(64), ForeignKey("quizzes.id", ondelete="CASCADE"), primary_key=True, index=True)
    id = Column(String(64), primary_key=True, index=True)
    position = Column(Integer, nullable=False, index=True)
    question_type = Column(String(32), nullable=False)
    question_text = Column(Text, nullable=False)
    options = Column(JSON, default=list, nullable=False)  # List of {"id": "...", "text": "..."}
    correct_option_id = Column(String(32), nullable=True)
    expected_answer = Column(Text, nullable=True)
    explanation = Column(Text, nullable=False)
    difficulty = Column(String(32), default="medium", nullable=False)
    topic = Column(String(128), nullable=True)
    sources = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    quiz = relationship("QuizModel", back_populates="questions")


class QuizAttemptModel(Base):
    """Persistent user attempts and test sessions."""
    __tablename__ = "quiz_attempts"

    id = Column(String(64), primary_key=True)
    quiz_id = Column(String(64), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    participant_name = Column(String(128), nullable=True)
    status = Column(String(32), default="in_progress", nullable=False)  # in_progress, submitted, evaluation_failed
    started_at = Column(DateTime(timezone=True), default=func.now(), nullable=False, index=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    time_taken_seconds = Column(Integer, nullable=True)
    question_count = Column(Integer, default=0, nullable=False)
    answered_count = Column(Integer, default=0, nullable=False)
    correct_count = Column(Integer, default=0, nullable=False)
    incorrect_count = Column(Integer, default=0, nullable=False)
    unanswered_count = Column(Integer, default=0, nullable=False)
    marks_earned = Column(Float, default=0.0, nullable=False)
    maximum_marks = Column(Float, default=0.0, nullable=False)
    percentage = Column(Float, default=0.0, nullable=False)
    quiz_snapshot = Column(JSON, nullable=True)  # Immutable snapshot preserving quiz version as taken

    # Relationships
    quiz = relationship("QuizModel", back_populates="attempts")
    answers = relationship(
        "AttemptAnswerModel",
        back_populates="attempt",
        cascade="all, delete-orphan",
        order_by="AttemptAnswerModel.position",
        lazy="selectin",
    )


class AttemptAnswerModel(Base):
    """Persistent individual student answers and grading rationales per question."""
    __tablename__ = "attempt_answers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    attempt_id = Column(String(64), ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(String(64), nullable=False, index=True)
    position = Column(Integer, default=1, nullable=False)
    question_type = Column(String(32), nullable=True)
    selected_option_id = Column(String(32), nullable=True)
    text_answer = Column(Text, nullable=True)
    user_answer_text = Column(Text, nullable=True)
    correct_answer_text = Column(Text, nullable=True)
    correct_option_id = Column(String(32), nullable=True)
    is_correct = Column(Boolean, default=False, nullable=False)
    is_unanswered = Column(Boolean, default=False, nullable=False)
    score = Column(Float, default=0.0, nullable=False)
    max_score = Column(Float, default=1.0, nullable=False)
    explanation = Column(Text, nullable=True)
    feedback = Column(Text, nullable=True)
    sources = Column(JSON, default=list, nullable=False)

    # Relationships
    attempt = relationship("QuizAttemptModel", back_populates="answers")
