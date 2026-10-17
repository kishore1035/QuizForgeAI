import os
import re
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from app.core.config import settings
from app.core.errors import AppError, InvalidSourceError
from app.schemas.source import (
    SourceType,
    SourceStatus,
    SourceResponse,
    PDFPageMetadata,
    TopicSourceCreate,
    TextSourceCreate,
)
from app.services.pdf_service import pdf_service
from app.db.session import SessionLocal
from app.db.models import SourceModel, QuizModel


def sanitize_filename(filename: str) -> str:
    """Sanitize user-provided filename to prevent path traversal or filesystem issues."""
    base = os.path.basename(filename)
    clean = re.sub(r"[^\w\.\-\_ ]", "_", base)
    return clean or "uploaded_document.pdf"


class SourceProcessingService:
    """Central service managing preparation, validation, and persistent storage of quiz sources."""

    def __init__(self):
        # In-memory cache for hot sources
        self._sources: Dict[str, Dict[str, Any]] = {}

    def create_topic_source(self, data: TopicSourceCreate) -> SourceResponse:
        """Prepare, persist, and register a validated Topic source."""
        source_id = f"src_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        created_at = now.isoformat()

        words = data.topic.split()
        word_count = len(words)
        char_count = len(data.topic)

        # 1. Save to Database
        db = SessionLocal()
        try:
            db_source = SourceModel(
                id=source_id,
                source_type="topic",
                title=data.topic,
                content=data.topic,
                additional_instructions=data.additional_instructions,
                subject=data.subject,
                exam=data.exam,
                word_count=word_count,
                character_count=char_count,
                status="ready",
                created_at=now,
                updated_at=now,
            )
            db.add(db_source)
            db.commit()
        finally:
            db.close()

        # 2. Cache in memory
        record = {
            "source_id": source_id,
            "source_type": SourceType.TOPIC,
            "title": data.topic,
            "status": SourceStatus.READY,
            "content": data.topic,
            "additional_instructions": data.additional_instructions,
            "subject": data.subject,
            "exam": data.exam,
            "filename": None,
            "file_size_bytes": None,
            "page_count": None,
            "word_count": word_count,
            "char_count": char_count,
            "pages": None,
            "created_at": created_at,
            "error_message": None,
        }
        self._sources[source_id] = record

        return SourceResponse(
            source_id=source_id,
            source_type=SourceType.TOPIC,
            title=data.topic,
            status=SourceStatus.READY,
            filename=None,
            file_size_bytes=None,
            page_count=None,
            word_count=word_count,
            char_count=char_count,
            pages=None,
            created_at=created_at,
        )

    def create_text_source(self, data: TextSourceCreate) -> SourceResponse:
        """Prepare, persist, and register a validated Text/Notes source."""
        if len(data.text) > settings.MAX_TEXT_CHAR_COUNT:
            raise AppError(
                message=(
                    f"Pasted text exceeds maximum length of {settings.MAX_TEXT_CHAR_COUNT:,} characters "
                    f"(received {len(data.text):,} characters). Please shorten your study material."
                ),
                status_code=400,
                details={
                    "char_count": len(data.text),
                    "max_allowed": settings.MAX_TEXT_CHAR_COUNT,
                },
            )

        source_id = f"src_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        created_at = now.isoformat()

        # Normalize whitespace without altering technical words
        normalized = re.sub(r"\r\n", "\n", data.text)
        normalized = re.sub(r"[ \t]+", " ", normalized)
        normalized = re.sub(r"\n{3,}", "\n\n", normalized).strip()

        words = normalized.split()
        word_count = len(words)
        char_count = len(normalized)

        derived_title = (
            data.title.strip()
            if data.title and data.title.strip()
            else (words[:6] and " ".join(words[:6]) + "..." if words else "Study Notes")
        )

        # 1. Save to Database
        db = SessionLocal()
        try:
            db_source = SourceModel(
                id=source_id,
                source_type="text",
                title=derived_title,
                content=normalized,
                additional_instructions=data.additional_instructions,
                word_count=word_count,
                character_count=char_count,
                status="ready",
                created_at=now,
                updated_at=now,
            )
            db.add(db_source)
            db.commit()
        finally:
            db.close()

        # 2. Cache in memory
        record = {
            "source_id": source_id,
            "source_type": SourceType.TEXT,
            "title": derived_title,
            "status": SourceStatus.READY,
            "content": normalized,
            "additional_instructions": data.additional_instructions,
            "subject": None,
            "exam": None,
            "filename": None,
            "file_size_bytes": None,
            "page_count": None,
            "word_count": word_count,
            "char_count": char_count,
            "pages": None,
            "created_at": created_at,
            "error_message": None,
        }
        self._sources[source_id] = record

        return SourceResponse(
            source_id=source_id,
            source_type=SourceType.TEXT,
            title=derived_title,
            status=SourceStatus.READY,
            filename=None,
            file_size_bytes=None,
            page_count=None,
            word_count=word_count,
            char_count=char_count,
            pages=None,
            created_at=created_at,
        )

    def create_pdf_source(self, file_bytes: bytes, original_filename: str) -> SourceResponse:
        """Extract, persist file & metadata, and register a validated PDF document source."""
        safe_name = sanitize_filename(original_filename)
        file_size = len(file_bytes)

        if file_size > settings.MAX_UPLOAD_SIZE_BYTES:
            max_mb = settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)
            raise AppError(
                message=f"Uploaded file '{safe_name}' exceeds maximum limit of {max_mb}MB.",
                status_code=400,
                details={"file_size": file_size, "max_bytes": settings.MAX_UPLOAD_SIZE_BYTES},
            )

        extracted = pdf_service.extract_text(file_bytes, safe_name)

        source_id = f"src_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        created_at = now.isoformat()

        # Save uploaded file into persistent upload storage directory
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        disk_filename = f"{source_id}_{safe_name}"
        saved_file_path = os.path.join(settings.UPLOAD_DIR, disk_filename)
        with open(saved_file_path, "wb") as f:
            f.write(file_bytes)

        # Format page metadata objects
        pages_meta = [
            PDFPageMetadata(
                page_number=p["page_number"],
                char_count=p["char_count"],
                word_count=p["word_count"],
                preview_snippet=p["preview_snippet"],
            )
            for p in extracted["pages"]
        ]

        title = safe_name.rsplit(".", 1)[0].replace("_", " ").title()

        # 1. Save to Database
        db = SessionLocal()
        try:
            db_source = SourceModel(
                id=source_id,
                source_type="pdf",
                title=title,
                content=extracted["full_text"],
                filename=safe_name,
                file_path=saved_file_path,
                file_size_bytes=file_size,
                page_count=extracted["page_count"],
                word_count=extracted["total_words"],
                character_count=extracted["total_chars"],
                pages_data=extracted["pages"],
                status="ready",
                created_at=now,
                updated_at=now,
            )
            db.add(db_source)
            db.commit()
        finally:
            db.close()

        # 2. Cache in memory
        record = {
            "source_id": source_id,
            "source_type": SourceType.PDF,
            "title": title,
            "status": SourceStatus.READY,
            "content": extracted["full_text"],
            "filename": safe_name,
            "file_size_bytes": file_size,
            "page_count": extracted["page_count"],
            "word_count": extracted["total_words"],
            "char_count": extracted["total_chars"],
            "pages": pages_meta,
            "raw_pages": extracted["pages"],
            "created_at": created_at,
            "error_message": None,
        }
        self._sources[source_id] = record

        return SourceResponse(
            source_id=source_id,
            source_type=SourceType.PDF,
            title=title,
            status=SourceStatus.READY,
            filename=safe_name,
            file_size_bytes=file_size,
            page_count=extracted["page_count"],
            word_count=extracted["total_words"],
            char_count=extracted["total_chars"],
            pages=pages_meta,
            created_at=created_at,
        )

    def get_source(self, source_id: str) -> SourceResponse:
        """Fetch registered source metadata by source ID from memory or database."""
        if source_id in self._sources:
            data = self._sources[source_id]
            return SourceResponse(
                source_id=data["source_id"],
                source_type=data["source_type"],
                title=data["title"],
                status=data["status"],
                filename=data.get("filename"),
                file_size_bytes=data.get("file_size_bytes"),
                page_count=data.get("page_count"),
                word_count=data["word_count"],
                char_count=data["char_count"],
                pages=data.get("pages"),
                created_at=data["created_at"],
                error_message=data.get("error_message"),
            )

        # Check database
        db = SessionLocal()
        try:
            db_source = db.query(SourceModel).filter(SourceModel.id == source_id).first()
            if not db_source:
                raise InvalidSourceError(
                    message=f"Source with ID '{source_id}' was not found or has expired.",
                    details={"source_id": source_id},
                )

            # Reconstruct metadata
            pages_meta = None
            if db_source.pages_data:
                pages_meta = [
                    PDFPageMetadata(
                        page_number=p["page_number"],
                        char_count=p["char_count"],
                        word_count=p["word_count"],
                        preview_snippet=p.get("preview_snippet", ""),
                    )
                    for p in db_source.pages_data
                ]

            created_str = db_source.created_at.isoformat() if db_source.created_at else ""
            resp = SourceResponse(
                source_id=db_source.id,
                source_type=SourceType(db_source.source_type),
                title=db_source.title,
                status=SourceStatus(db_source.status),
                filename=db_source.filename,
                file_size_bytes=db_source.file_size_bytes,
                page_count=db_source.page_count,
                word_count=db_source.word_count or 0,
                char_count=db_source.character_count or 0,
                pages=pages_meta,
                created_at=created_str,
            )

            # Warm cache
            self._sources[source_id] = {
                "source_id": db_source.id,
                "source_type": SourceType(db_source.source_type),
                "title": db_source.title,
                "status": SourceStatus(db_source.status),
                "content": db_source.content,
                "additional_instructions": db_source.additional_instructions,
                "subject": db_source.subject,
                "exam": db_source.exam,
                "filename": db_source.filename,
                "file_size_bytes": db_source.file_size_bytes,
                "page_count": db_source.page_count,
                "word_count": db_source.word_count or 0,
                "char_count": db_source.character_count or 0,
                "pages": pages_meta,
                "raw_pages": db_source.pages_data,
                "created_at": created_str,
                "error_message": None,
            }

            return resp
        finally:
            db.close()

    def get_source_raw(self, source_id: str) -> Dict[str, Any]:
        """Fetch internal source dictionary for generator pipeline."""
        if source_id in self._sources:
            return self._sources[source_id]

        # Call get_source to warm cache from database
        self.get_source(source_id)
        if source_id in self._sources:
            return self._sources[source_id]

        raise InvalidSourceError(
            message=f"Source with ID '{source_id}' was not found.",
            details={"source_id": source_id},
        )

    def delete_source(self, source_id: str) -> bool:
        """Safely delete a source and its file if not currently in use by a quiz."""
        db = SessionLocal()
        try:
            # Check if source is actively referenced by any quiz
            referencing_quiz = db.query(QuizModel).filter(QuizModel.source_id == source_id).first()
            if referencing_quiz:
                raise AppError(
                    message=f"Cannot delete source '{source_id}' because it is in use by quiz '{referencing_quiz.title}'.",
                    status_code=400,
                    details={"source_id": source_id, "quiz_id": referencing_quiz.id},
                )

            db_source = db.query(SourceModel).filter(SourceModel.id == source_id).first()
            if not db_source:
                raise InvalidSourceError(f"Source with ID '{source_id}' was not found.")

            # Remove disk file if it exists
            if db_source.file_path and os.path.exists(db_source.file_path):
                try:
                    os.remove(db_source.file_path)
                except OSError:
                    pass

            db.delete(db_source)
            db.commit()

            # Evict from memory
            self._sources.pop(source_id, None)
            return True
        finally:
            db.close()


source_service = SourceProcessingService()
