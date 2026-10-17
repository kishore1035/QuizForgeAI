import re
from typing import Optional
from fastapi import APIRouter, Path, Query, Body, status, Response

from app.schemas.attempt import (
    StartAttemptRequest,
    StartAttemptResponse,
    SubmitAttemptRequest,
    AttemptResultResponse,
    QuizSaveRequest,
    QuizUpdateRequest,
    QuizListResponse,
    AttemptHistoryResponse,
)
from app.schemas.quiz import GeneratedQuizResponse
from app.services.attempt_service import attempt_service
from app.services.quiz_store import quiz_store
from app.services.export_service import export_service
from app.core.errors import QuizNotFoundError

router = APIRouter(tags=["Quizzes, Library & Attempts"])


@router.get(
    "",
    response_model=QuizListResponse,
    summary="List saved quizzes in the Quiz Library",
)
async def list_quizzes(
    search: Optional[str] = Query(default=None, description="Search query matching title, subject, or exam"),
    difficulty: Optional[str] = Query(default=None, description="Filter by difficulty"),
    source_type: Optional[str] = Query(default=None, description="Filter by source type (topic, text, pdf)"),
    limit: int = Query(default=50, ge=1, le=100),
    skip: int = Query(default=0, ge=0),
) -> QuizListResponse:
    """Retrieve saved quizzes with search, filtering, and attempt metrics."""
    quizzes, total = quiz_store.list_quizzes(
        search=search,
        difficulty=difficulty,
        source_type=source_type,
        limit=limit,
        skip=skip,
    )
    return QuizListResponse(quizzes=quizzes, total=total)


@router.post(
    "",
    response_model=GeneratedQuizResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save a new quiz or draft to the database",
)
async def create_or_save_quiz(payload: QuizSaveRequest) -> GeneratedQuizResponse:
    """Persist an edited or newly generated quiz in the database."""
    return attempt_service.save_quiz_draft(payload)


@router.post(
    "/save",
    response_model=GeneratedQuizResponse,
    summary="Save or register a quiz draft (alias)",
)
async def save_quiz_draft(payload: QuizSaveRequest) -> GeneratedQuizResponse:
    """Backward-compatible endpoint for saving quiz drafts."""
    return attempt_service.save_quiz_draft(payload)


@router.get(
    "/{quiz_id}",
    response_model=GeneratedQuizResponse,
    summary="Get a saved or generated quiz by ID",
)
async def get_quiz(
    quiz_id: str = Path(..., description="ID of the quiz to fetch")
) -> GeneratedQuizResponse:
    """Retrieve full quiz definition with ordered questions and configuration."""
    quiz = quiz_store.get_quiz(quiz_id)
    if not quiz:
        raise QuizNotFoundError(f"Quiz '{quiz_id}' was not found.")
    return quiz


@router.patch(
    "/{quiz_id}",
    response_model=GeneratedQuizResponse,
    summary="Update a saved quiz and its questions",
)
async def update_quiz(
    quiz_id: str = Path(..., description="ID of the quiz to update"),
    payload: QuizUpdateRequest = Body(...),
) -> GeneratedQuizResponse:
    """Transactionally update quiz metadata, configuration, or ordered questions."""
    updated = quiz_store.update_quiz(quiz_id, payload)
    if not updated:
        raise QuizNotFoundError(f"Quiz '{quiz_id}' was not found.")
    return updated


@router.delete(
    "/{quiz_id}",
    summary="Delete a saved quiz and its associated data",
)
async def delete_quiz(
    quiz_id: str = Path(..., description="ID of the quiz to delete")
):
    """Delete a quiz, its questions, and attempt records."""
    success = quiz_store.delete_quiz(quiz_id)
    if not success:
        raise QuizNotFoundError(f"Quiz '{quiz_id}' was not found.")
    return {"success": True, "message": f"Quiz '{quiz_id}' was deleted successfully.", "quiz_id": quiz_id}


@router.get(
    "/{quiz_id}/attempts",
    response_model=AttemptHistoryResponse,
    summary="Get attempt history for a specific quiz",
)
async def get_quiz_attempt_history(
    quiz_id: str = Path(..., description="ID of the quiz"),
) -> AttemptHistoryResponse:
    """Retrieve all historical attempts and scores for this quiz."""
    quiz = quiz_store.get_quiz(quiz_id)
    if not quiz:
        raise QuizNotFoundError(f"Quiz '{quiz_id}' was not found.")

    attempts = quiz_store.list_quiz_attempts(quiz_id)
    return AttemptHistoryResponse(
        quiz_id=quiz_id,
        title=quiz.title,
        attempts=attempts,
        total_attempts=len(attempts),
    )


@router.post(
    "/{quiz_id}/attempts",
    response_model=StartAttemptResponse,
    summary="Start a new interactive attempt on a quiz",
)
async def start_quiz_attempt(
    quiz_id: str = Path(..., description="ID of the quiz to attempt"),
    payload: Optional[StartAttemptRequest] = Body(default=None),
) -> StartAttemptResponse:
    """
    Start a new quiz attempt and snapshot questions.
    The returned question payload has correct answers, keys, and explanations scrubbed.
    """
    participant = payload.participant_name if payload else None
    return attempt_service.start_attempt(quiz_id=quiz_id, participant_name=participant)


@router.post(
    "/{quiz_id}/attempts/{attempt_id}/submit",
    response_model=AttemptResultResponse,
    summary="Submit answers for grading",
)
async def submit_quiz_attempt(
    quiz_id: str = Path(..., description="ID of the quiz"),
    attempt_id: str = Path(..., description="ID of the attempt session"),
    payload: SubmitAttemptRequest = Body(...),
) -> AttemptResultResponse:
    """
    Submit and grade quiz answers.
    Returns calculated score, performance metrics, and question review.
    """
    return await attempt_service.submit_attempt(
        quiz_id=quiz_id, attempt_id=attempt_id, payload=payload
    )


@router.get(
    "/{quiz_id}/attempts/{attempt_id}/results",
    response_model=AttemptResultResponse,
    summary="Retrieve results of an already submitted quiz attempt",
)
async def get_quiz_attempt_results(
    quiz_id: str = Path(..., description="ID of the quiz"),
    attempt_id: str = Path(..., description="ID of the attempt session"),
) -> AttemptResultResponse:
    """Retrieve post-submission results, scores, and review."""
    return attempt_service.get_attempt_results(quiz_id=quiz_id, attempt_id=attempt_id)


def _safe_filename(title: str, default: str = "quiz") -> str:
    cleaned = re.sub(r"[^\w\s-]", "", title).strip().lower()
    slug = re.sub(r"[-\s]+", "-", cleaned)
    return slug[:40] if slug else default


@router.get(
    "/{quiz_id}/export",
    summary="Export quiz questions or answer key in Markdown or Plain-Text",
)
async def export_quiz(
    quiz_id: str = Path(..., description="ID of the quiz to export"),
    type: str = Query(default="questions", description="Export type: 'questions' or 'answer_key'"),
    format: str = Query(default="markdown", description="File format: 'markdown' or 'txt'"),
):
    """
    Downloadable export of a saved quiz.
    - 'questions': Student-facing questions without correct answers or explanations.
    - 'answer_key': Full solution document with correct options, expected answers, and rationales.
    """
    quiz = quiz_store.get_quiz(quiz_id)
    if not quiz:
        raise QuizNotFoundError(f"Quiz '{quiz_id}' was not found.")

    export_type = type.lower().strip()
    export_fmt = format.lower().strip()
    if export_fmt not in ("markdown", "txt"):
        export_fmt = "markdown"

    ext = "md" if export_fmt == "markdown" else "txt"
    media_type = "text/markdown; charset=utf-8" if export_fmt == "markdown" else "text/plain; charset=utf-8"

    slug = _safe_filename(quiz.title, "quiz")
    if export_type == "answer_key":
        content = export_service.export_quiz_answer_key(quiz, format=export_fmt)
        filename = f"{slug}-answer-key.{ext}"
    else:
        content = export_service.export_quiz_questions(quiz, format=export_fmt)
        filename = f"{slug}-questions.{ext}"

    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
    }
    return Response(content=content, media_type=media_type, headers=headers)


@router.get(
    "/{quiz_id}/attempts/{attempt_id}/export",
    summary="Export verified attempt results in Markdown or Plain-Text",
)
async def export_attempt_results(
    quiz_id: str = Path(..., description="ID of the quiz"),
    attempt_id: str = Path(..., description="ID of the attempt session"),
    format: str = Query(default="markdown", description="File format: 'markdown' or 'txt'"),
):
    """Downloadable performance report for a completed attempt session."""
    result = attempt_service.get_attempt_results(quiz_id=quiz_id, attempt_id=attempt_id)
    export_fmt = format.lower().strip()
    if export_fmt not in ("markdown", "txt"):
        export_fmt = "markdown"

    ext = "md" if export_fmt == "markdown" else "txt"
    media_type = "text/markdown; charset=utf-8" if export_fmt == "markdown" else "text/plain; charset=utf-8"

    content = export_service.export_attempt_results(result, format=export_fmt)
    slug = _safe_filename(result.title, "quiz")
    filename = f"{slug}-attempt-{attempt_id[:8]}-report.{ext}"

    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
    }
    return Response(content=content, media_type=media_type, headers=headers)

