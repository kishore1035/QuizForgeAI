from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class SourceType(str, Enum):
    TOPIC = "topic"
    TEXT = "text"
    PDF = "pdf"


class SourceStatus(str, Enum):
    READY = "ready"
    PROCESSING = "processing"
    ERROR = "error"


class TopicSourceCreate(BaseModel):
    """Payload for submitting a topic source."""
    topic: str = Field(..., min_length=1, max_length=500, description="Target topic or concept name")
    additional_instructions: Optional[str] = Field(default=None, max_length=1000)
    subject: Optional[str] = Field(default=None, max_length=100)
    exam: Optional[str] = Field(default=None, max_length=100)

    @field_validator("topic")
    @classmethod
    def validate_topic_not_whitespace(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Topic cannot be empty or solely whitespace.")
        return stripped


class TextSourceCreate(BaseModel):
    """Payload for submitting pasted study material."""
    text: str = Field(..., min_length=1, description="Raw study notes, textbook excerpt, or notes")
    title: Optional[str] = Field(default=None, max_length=200, description="Optional title for the notes")
    additional_instructions: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("text")
    @classmethod
    def validate_text_not_whitespace(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Study material cannot be empty or solely whitespace.")
        return stripped


class PDFPageMetadata(BaseModel):
    """Extracted text statistics for a single PDF page."""
    page_number: int
    char_count: int
    word_count: int
    preview_snippet: str


class SourceResponse(BaseModel):
    """Standardized metadata returned after processing any quiz source."""
    source_id: str
    source_type: SourceType
    title: str
    status: SourceStatus
    filename: Optional[str] = None
    file_size_bytes: Optional[int] = None
    page_count: Optional[int] = None
    word_count: int
    char_count: int
    pages: Optional[List[PDFPageMetadata]] = None
    created_at: str
    error_message: Optional[str] = None
