import uuid
from datetime import datetime, timezone
from typing import Dict, Optional, List, Tuple, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_

from app.db.session import SessionLocal
from app.db.models import (
    QuizModel,
    QuestionModel,
    QuizAttemptModel,
    AttemptAnswerModel,
    SourceModel,
)
from app.schemas.quiz import (
    GeneratedQuizResponse,
    GeneratedQuizSettings,
    GeneratedQuizSourceMeta,
    GeneratedQuestion,
    QuizQuestionOption,
    QuestionType,
    DifficultyLevel,
    SourceReference,
)
from app.schemas.attempt import (
    SubmittedAnswer,
    AttemptResultResponse,
    QuestionResultItem,
    QuizListItem,
    QuizUpdateRequest,
    AttemptHistoryItem,
)
from pydantic import BaseModel, Field


def _to_iso(dt: Optional[datetime]) -> Optional[str]:
    """Return ISO 8601 string ensuring UTC timezone indicator is preserved."""
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


class AttemptRecord(BaseModel):
    attempt_id: str
    quiz_id: str
    participant_name: Optional[str] = None
    started_at: str
    submitted_at: Optional[str] = None
    is_submitted: bool = False
    submitted_answers: List[SubmittedAnswer] = Field(default_factory=list)
    time_spent_seconds: Optional[int] = None
    result: Optional[AttemptResultResponse] = None
    quiz_snapshot: Optional[List[Dict[str, Any]]] = None


class QuizStore:
    """
    Persistent SQLAlchemy-backed storage for quizzes, questions, and attempt sessions.
    Operates in full SQLite/PostgreSQL transactional mode across server restarts.
    """

    # -------------------------------------------------------------------------
    # QUIZ REGISTRATION & RETRIEVAL
    # -------------------------------------------------------------------------

    def register_quiz(self, quiz: GeneratedQuizResponse) -> str:
        """Persist or update a generated quiz and its ordered questions in a transaction."""
        db: Session = SessionLocal()
        try:
            # Check if quiz already exists
            db_quiz = db.query(QuizModel).filter(QuizModel.id == quiz.quiz_id).first()
            now = datetime.now(timezone.utc)

            q_types = [qt for qt in quiz.settings.question_types]
            source_meta_dict = quiz.source_metadata.model_dump() if quiz.source_metadata else None

            # Validate source_id against foreign key table
            real_source_id = None
            candidate_sid = quiz.source_metadata.source_id if quiz.source_metadata else None
            if candidate_sid:
                src_row = db.query(SourceModel).filter(SourceModel.id == candidate_sid).first()
                if src_row:
                    real_source_id = candidate_sid

            if db_quiz:
                # Update existing quiz
                db_quiz.title = quiz.title
                db_quiz.source_id = real_source_id
                db_quiz.source_type = quiz.source_metadata.source_type if quiz.source_metadata else "topic"
                db_quiz.subject = quiz.settings.subject
                db_quiz.exam = quiz.settings.exam
                db_quiz.academic_year = quiz.settings.academic_year
                db_quiz.difficulty = quiz.settings.difficulty
                db_quiz.question_count = len(quiz.questions)
                db_quiz.question_types = q_types
                db_quiz.time_limit_enabled = quiz.settings.time_limit_enabled
                db_quiz.time_limit_seconds = quiz.settings.time_limit_seconds
                db_quiz.status = quiz.status or "draft"
                db_quiz.source_metadata = source_meta_dict
                db_quiz.updated_at = now
            else:
                # Insert new quiz
                db_quiz = QuizModel(
                    id=quiz.quiz_id,
                    title=quiz.title,
                    source_id=real_source_id,
                    source_type=quiz.source_metadata.source_type if quiz.source_metadata else "topic",
                    subject=quiz.settings.subject,
                    exam=quiz.settings.exam,
                    academic_year=quiz.settings.academic_year,
                    difficulty=quiz.settings.difficulty,
                    question_count=len(quiz.questions),
                    question_types=q_types,
                    time_limit_enabled=quiz.settings.time_limit_enabled,
                    time_limit_seconds=quiz.settings.time_limit_seconds,
                    status=quiz.status or "draft",
                    source_metadata=source_meta_dict,
                    created_at=now,
                    updated_at=now,
                )
                db.add(db_quiz)

            db.flush()

            # Remove previous questions if any and re-insert in order
            db.query(QuestionModel).filter(QuestionModel.quiz_id == quiz.quiz_id).delete()

            for idx, q in enumerate(quiz.questions):
                opts = [o.model_dump() if hasattr(o, "model_dump") else o for o in q.options]
                srcs = [s.model_dump() if hasattr(s, "model_dump") else s for s in q.sources]

                db_q = QuestionModel(
                    id=q.question_id,
                    quiz_id=quiz.quiz_id,
                    position=idx + 1,
                    question_type=q.type.value if hasattr(q.type, "value") else str(q.type),
                    question_text=q.question_text,
                    options=opts,
                    correct_option_id=q.correct_option_id,
                    expected_answer=q.expected_answer,
                    explanation=q.explanation,
                    difficulty=q.difficulty.value if hasattr(q.difficulty, "value") else str(q.difficulty),
                    topic=q.topic,
                    sources=srcs,
                    created_at=now,
                    updated_at=now,
                )
                db.add(db_q)

            db.commit()
            return quiz.quiz_id
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def get_quiz(self, quiz_id: str) -> Optional[GeneratedQuizResponse]:
        """Load a saved quiz with configuration, ordered questions, and source metadata."""
        db: Session = SessionLocal()
        try:
            db_quiz = db.query(QuizModel).filter(QuizModel.id == quiz_id).first()
            if not db_quiz:
                return None

            # Reconstruct questions in position order
            questions: List[GeneratedQuestion] = []
            for db_q in sorted(db_quiz.questions, key=lambda x: x.position):
                opts = [
                    QuizQuestionOption(id=opt["id"], text=opt["text"])
                    for opt in (db_q.options or [])
                ]
                srcs = [
                    SourceReference(source_id=s.get("source_id", ""), page=s.get("page"))
                    for s in (db_q.sources or [])
                ]

                q_type = QuestionType.MULTIPLE_CHOICE
                for qt in QuestionType:
                    if qt.value == db_q.question_type:
                        q_type = qt
                        break

                q_diff = DifficultyLevel.MEDIUM
                for diff in DifficultyLevel:
                    if diff.value == db_q.difficulty:
                        q_diff = diff
                        break

                questions.append(
                    GeneratedQuestion(
                        question_id=db_q.id,
                        type=q_type,
                        question_text=db_q.question_text,
                        options=opts,
                        correct_option_id=db_q.correct_option_id,
                        expected_answer=db_q.expected_answer,
                        explanation=db_q.explanation,
                        difficulty=q_diff,
                        topic=db_q.topic,
                        sources=srcs,
                    )
                )

            settings_meta = GeneratedQuizSettings(
                difficulty=db_quiz.difficulty,
                question_types=db_quiz.question_types or ["multiple_choice"],
                time_limit_enabled=db_quiz.time_limit_enabled,
                time_limit_seconds=db_quiz.time_limit_seconds,
                subject=db_quiz.subject,
                exam=db_quiz.exam,
                academic_year=db_quiz.academic_year,
            )

            raw_source_meta = db_quiz.source_metadata or {}
            source_meta = GeneratedQuizSourceMeta(
                source_id=raw_source_meta.get("source_id") or db_quiz.source_id or "src_manual",
                source_type=raw_source_meta.get("source_type") or db_quiz.source_type or "topic",
                title=raw_source_meta.get("title") or db_quiz.title,
                filename=raw_source_meta.get("filename"),
                page_count=raw_source_meta.get("page_count"),
                word_count=raw_source_meta.get("word_count"),
            )

            created_str = db_quiz.created_at.isoformat() if db_quiz.created_at else datetime.now(timezone.utc).isoformat()

            return GeneratedQuizResponse(
                quiz_id=db_quiz.id,
                title=db_quiz.title,
                status=db_quiz.status,
                question_count=len(questions),
                questions=questions,
                settings=settings_meta,
                source_metadata=source_meta,
                created_at=created_str,
            )
        finally:
            db.close()

    def list_quizzes(
        self,
        search: Optional[str] = None,
        difficulty: Optional[str] = None,
        source_type: Optional[str] = None,
        limit: int = 50,
        skip: int = 0,
    ) -> Tuple[List[QuizListItem], int]:
        """Query Quiz Library with filtering, pagination, and attempt statistics."""
        db: Session = SessionLocal()
        try:
            query = db.query(QuizModel)

            # Apply filters
            if search and search.strip():
                term = f"%{search.strip()}%"
                query = query.filter(
                    or_(
                        QuizModel.title.ilike(term),
                        QuizModel.subject.ilike(term),
                        QuizModel.exam.ilike(term),
                    )
                )

            if difficulty and difficulty.strip() and difficulty.lower() != "all":
                query = query.filter(QuizModel.difficulty == difficulty.strip().lower())

            if source_type and source_type.strip() and source_type.lower() != "all":
                query = query.filter(QuizModel.source_type == source_type.strip().lower())

            total = query.count()
            db_quizzes = query.order_by(desc(QuizModel.updated_at)).offset(skip).limit(limit).all()

            results: List[QuizListItem] = []
            for q in db_quizzes:
                # Compute attempt metrics
                completed_attempts = [
                    att for att in q.attempts if att.status == "submitted"
                ]
                attempt_count = len(completed_attempts)

                latest_score = None
                latest_percentage = None
                best_percentage = None

                if completed_attempts:
                    latest = completed_attempts[0]
                    latest_score = latest.marks_earned
                    latest_percentage = latest.percentage
                    best_percentage = max(att.percentage for att in completed_attempts)

                created_str = _to_iso(q.created_at) or ""
                updated_str = _to_iso(q.updated_at) or ""

                results.append(
                    QuizListItem(
                        quiz_id=q.id,
                        title=q.title,
                        source_id=q.source_id,
                        source_type=q.source_type or "topic",
                        subject=q.subject,
                        exam=q.exam,
                        academic_year=q.academic_year,
                        difficulty=q.difficulty or "medium",
                        question_count=q.question_count,
                        time_limit_enabled=q.time_limit_enabled,
                        time_limit_seconds=q.time_limit_seconds,
                        status=q.status,
                        attempt_count=attempt_count,
                        latest_score=latest_score,
                        latest_percentage=latest_percentage,
                        best_percentage=best_percentage,
                        created_at=created_str,
                        updated_at=updated_str,
                    )
                )

            return results, total
        finally:
            db.close()

    def update_quiz(self, quiz_id: str, payload: QuizUpdateRequest) -> Optional[GeneratedQuizResponse]:
        """Transactionally persist edits to title, specifications, and questions."""
        db: Session = SessionLocal()
        try:
            db_quiz = db.query(QuizModel).filter(QuizModel.id == quiz_id).first()
            if not db_quiz:
                return None

            now = datetime.now(timezone.utc)
            if payload.title is not None:
                db_quiz.title = payload.title
            if payload.difficulty is not None:
                db_quiz.difficulty = payload.difficulty
            if payload.subject is not None:
                db_quiz.subject = payload.subject
            if payload.exam is not None:
                db_quiz.exam = payload.exam
            if payload.academic_year is not None:
                db_quiz.academic_year = payload.academic_year
            if payload.time_limit_enabled is not None:
                db_quiz.time_limit_enabled = payload.time_limit_enabled
            if payload.time_limit_seconds is not None:
                db_quiz.time_limit_seconds = payload.time_limit_seconds

            db_quiz.updated_at = now

            if payload.questions is not None:
                # Replace questions
                db.query(QuestionModel).filter(QuestionModel.quiz_id == quiz_id).delete()
                db_quiz.question_count = len(payload.questions)

                for idx, q in enumerate(payload.questions):
                    opts = [o.model_dump() if hasattr(o, "model_dump") else o for o in q.options]
                    srcs = [s.model_dump() if hasattr(s, "model_dump") else s for s in q.sources]

                    db_q = QuestionModel(
                        id=q.question_id,
                        quiz_id=quiz_id,
                        position=idx + 1,
                        question_type=q.type.value if hasattr(q.type, "value") else str(q.type),
                        question_text=q.question_text,
                        options=opts,
                        correct_option_id=q.correct_option_id,
                        expected_answer=q.expected_answer,
                        explanation=q.explanation,
                        difficulty=q.difficulty.value if hasattr(q.difficulty, "value") else str(q.difficulty),
                        topic=q.topic,
                        sources=srcs,
                        created_at=now,
                        updated_at=now,
                    )
                    db.add(db_q)

            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

        return self.get_quiz(quiz_id)

    def delete_quiz(self, quiz_id: str) -> bool:
        """Delete a saved quiz and cascade delete its questions and attempts."""
        db: Session = SessionLocal()
        try:
            db_quiz = db.query(QuizModel).filter(QuizModel.id == quiz_id).first()
            if not db_quiz:
                return False

            db.delete(db_quiz)
            db.commit()
            return True
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    # -------------------------------------------------------------------------
    # ATTEMPT SESSIONS & IMMUTABLE HISTORICAL REVIEWS
    # -------------------------------------------------------------------------

    def create_attempt(
        self, quiz_id: str, participant_name: Optional[str] = None
    ) -> AttemptRecord:
        """
        Create a new taking attempt and snapshot the quiz questions.
        Snapshotted questions ensure that if the quiz is modified in the future,
        historical attempts remain associated with the exact version taken!
        """
        db: Session = SessionLocal()
        try:
            db_quiz = db.query(QuizModel).filter(QuizModel.id == quiz_id).first()
            if not db_quiz:
                raise ValueError(f"Quiz '{quiz_id}' not found.")

            attempt_id = f"att_{uuid.uuid4().hex[:12]}"
            now = datetime.now(timezone.utc)

            # Create immutable snapshot of questions
            snapshot = [
                {
                    "question_id": q.id,
                    "number": q.position,
                    "type": q.question_type,
                    "question_text": q.question_text,
                    "options": q.options,
                    "correct_option_id": q.correct_option_id,
                    "expected_answer": q.expected_answer,
                    "explanation": q.explanation,
                    "difficulty": q.difficulty,
                    "topic": q.topic,
                    "sources": q.sources,
                }
                for q in sorted(db_quiz.questions, key=lambda x: x.position)
            ]

            attempt_model = QuizAttemptModel(
                id=attempt_id,
                quiz_id=quiz_id,
                participant_name=participant_name,
                status="in_progress",
                started_at=now,
                question_count=len(snapshot),
                marks_earned=0.0,
                maximum_marks=float(len(snapshot)),
                percentage=0.0,
                quiz_snapshot=snapshot,
            )
            db.add(attempt_model)
            db.commit()

            return AttemptRecord(
                attempt_id=attempt_id,
                quiz_id=quiz_id,
                participant_name=participant_name,
                started_at=now.isoformat(),
                is_submitted=False,
                quiz_snapshot=snapshot,
            )
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def get_attempt(self, attempt_id: str) -> Optional[AttemptRecord]:
        """Fetch attempt record and reconstruct its submission state."""
        db: Session = SessionLocal()
        try:
            db_att = db.query(QuizAttemptModel).filter(QuizAttemptModel.id == attempt_id).first()
            if not db_att:
                return None

            submitted_answers: List[SubmittedAnswer] = []
            question_results: List[QuestionResultItem] = []

            for ans in sorted(db_att.answers, key=lambda a: a.position):
                submitted_answers.append(
                    SubmittedAnswer(
                        question_id=ans.question_id,
                        selected_option_id=ans.selected_option_id,
                        text_answer=ans.text_answer,
                    )
                )

                q_type = QuestionType.MULTIPLE_CHOICE
                for qt in QuestionType:
                    if qt.value == ans.question_type:
                        q_type = qt
                        break

                srcs = [
                    SourceReference(source_id=s.get("source_id", ""), page=s.get("page"))
                    for s in (ans.sources or [])
                ]

                question_results.append(
                    QuestionResultItem(
                        question_id=ans.question_id,
                        number=ans.position,
                        type=q_type,
                        question_text=ans.text_answer or "",  # Fallback
                        selected_option_id=ans.selected_option_id,
                        user_answer_text=ans.user_answer_text,
                        correct_answer_text=ans.correct_answer_text or "",
                        correct_option_id=ans.correct_option_id,
                        is_correct=ans.is_correct,
                        is_unanswered=ans.is_unanswered,
                        score=ans.score,
                        max_score=ans.max_score,
                        explanation=ans.explanation or "",
                        feedback=ans.feedback,
                        sources=srcs,
                    )
                )

            # If snapshot exists, enrich question texts in results
            if db_att.quiz_snapshot and question_results:
                snapshot_map = {q["question_id"]: q for q in db_att.quiz_snapshot}
                for qr in question_results:
                    sn = snapshot_map.get(qr.question_id)
                    if sn:
                        qr.question_text = sn.get("question_text", qr.question_text)
                        if not qr.explanation and sn.get("explanation"):
                            qr.explanation = sn["explanation"]

            is_sub = db_att.status == "submitted"
            result_payload = None
            if is_sub:
                result_payload = AttemptResultResponse(
                    attempt_id=db_att.id,
                    quiz_id=db_att.quiz_id,
                    title=db_att.quiz.title if db_att.quiz else "Quiz Attempt",
                    total_questions=db_att.question_count,
                    answered_count=db_att.answered_count,
                    unanswered_count=db_att.unanswered_count,
                    correct_count=db_att.correct_count,
                    incorrect_count=db_att.incorrect_count,
                    total_score=db_att.marks_earned,
                    max_score=db_att.maximum_marks,
                    percentage=db_att.percentage,
                    time_spent_seconds=db_att.time_taken_seconds,
                    is_submitted=True,
                    started_at=_to_iso(db_att.started_at) or "",
                    submitted_at=_to_iso(db_att.submitted_at) or "",
                    questions=question_results,
                )

            return AttemptRecord(
                attempt_id=db_att.id,
                quiz_id=db_att.quiz_id,
                participant_name=db_att.participant_name,
                started_at=_to_iso(db_att.started_at) or "",
                submitted_at=_to_iso(db_att.submitted_at),
                is_submitted=is_sub,
                submitted_answers=submitted_answers,
                time_spent_seconds=db_att.time_taken_seconds,
                result=result_payload,
                quiz_snapshot=db_att.quiz_snapshot,
            )
        finally:
            db.close()

    def finalize_attempt(
        self,
        attempt_id: str,
        result: AttemptResultResponse,
        answers: List[SubmittedAnswer],
        time_spent_seconds: Optional[int],
    ) -> None:
        """Persist submission results and individual question grades transactionally."""
        db: Session = SessionLocal()
        try:
            db_att = db.query(QuizAttemptModel).filter(QuizAttemptModel.id == attempt_id).first()
            if not db_att:
                raise ValueError(f"Attempt '{attempt_id}' was not found.")

            if result.submitted_at:
                try:
                    sub_dt = datetime.fromisoformat(result.submitted_at)
                    if sub_dt.tzinfo is None:
                        sub_dt = sub_dt.replace(tzinfo=timezone.utc)
                except Exception:
                    sub_dt = datetime.now(timezone.utc)
            else:
                sub_dt = datetime.now(timezone.utc)

            db_att.status = "submitted"
            db_att.submitted_at = sub_dt
            db_att.completed_at = sub_dt
            db_att.time_taken_seconds = time_spent_seconds
            db_att.question_count = result.total_questions
            db_att.answered_count = result.answered_count
            db_att.unanswered_count = result.unanswered_count
            db_att.correct_count = result.correct_count
            db_att.incorrect_count = result.incorrect_count
            db_att.marks_earned = result.total_score
            db_att.maximum_marks = result.max_score
            db_att.percentage = result.percentage

            # Clear old answer rows if any and insert graded items
            db.query(AttemptAnswerModel).filter(AttemptAnswerModel.attempt_id == attempt_id).delete()

            answers_by_qid = {a.question_id: a for a in answers}

            for idx, q_res in enumerate(result.questions):
                sub = answers_by_qid.get(q_res.question_id)
                db_ans = AttemptAnswerModel(
                    attempt_id=attempt_id,
                    question_id=q_res.question_id,
                    position=idx + 1,
                    question_type=q_res.type.value if hasattr(q_res.type, "value") else str(q_res.type),
                    selected_option_id=q_res.selected_option_id,
                    text_answer=sub.text_answer if sub else None,
                    user_answer_text=q_res.user_answer_text,
                    correct_answer_text=q_res.correct_answer_text,
                    correct_option_id=q_res.correct_option_id,
                    is_correct=q_res.is_correct,
                    is_unanswered=q_res.is_unanswered,
                    score=q_res.score,
                    max_score=q_res.max_score,
                    explanation=q_res.explanation,
                    feedback=q_res.feedback,
                    sources=[s.model_dump() if hasattr(s, "model_dump") else s for s in q_res.sources],
                )
                db.add(db_ans)

            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def list_quiz_attempts(self, quiz_id: str) -> List[AttemptHistoryItem]:
        """Fetch all submitted attempts for a quiz sorted newest first."""
        db: Session = SessionLocal()
        try:
            attempts = (
                db.query(QuizAttemptModel)
                .filter(QuizAttemptModel.quiz_id == quiz_id)
                .order_by(desc(QuizAttemptModel.started_at))
                .all()
            )

            history: List[AttemptHistoryItem] = []
            for att in attempts:
                history.append(
                    AttemptHistoryItem(
                        attempt_id=att.id,
                        quiz_id=att.quiz_id,
                        participant_name=att.participant_name,
                        status=att.status,
                        started_at=_to_iso(att.started_at) or "",
                        submitted_at=_to_iso(att.submitted_at),
                        time_taken_seconds=att.time_taken_seconds,
                        total_questions=att.question_count,
                        answered_count=att.answered_count,
                        correct_count=att.correct_count,
                        incorrect_count=att.incorrect_count,
                        unanswered_count=att.unanswered_count,
                        total_score=att.marks_earned,
                        max_score=att.maximum_marks,
                        percentage=att.percentage,
                    )
                )

            return history
        finally:
            db.close()

    def clear(self) -> None:
        """Clear all stored data (primarily for automated test suite resets)."""
        db: Session = SessionLocal()
        try:
            db.query(AttemptAnswerModel).delete()
            db.query(QuizAttemptModel).delete()
            db.query(QuestionModel).delete()
            db.query(QuizModel).delete()
            db.query(SourceModel).delete()
            db.commit()
        except Exception:
            db.rollback()
        finally:
            db.close()


quiz_store = QuizStore()
