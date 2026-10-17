import uuid
from datetime import datetime, timezone
from typing import List, Optional

from app.core.errors import (
    QuizNotFoundError,
    AttemptNotFoundError,
    AttemptAlreadySubmittedError,
    AttemptNotSubmittedError,
    InvalidAttemptStateError,
)
from app.schemas.quiz import (
    QuestionType,
    DifficultyLevel,
    GeneratedQuizResponse,
    GeneratedQuizSettings,
    GeneratedQuizSourceMeta,
    GeneratedQuestion,
    QuizQuestionOption,
    SourceReference,
)
from app.schemas.attempt import (
    QuizTakingOption,
    QuizTakingQuestion,
    StartAttemptResponse,
    SubmitAttemptRequest,
    QuestionResultItem,
    AttemptResultResponse,
    QuizSaveRequest,
)
from app.services.quiz_store import quiz_store, QuizStore
from app.services.short_answer_eval_service import (
    short_answer_eval_service,
    ShortAnswerEvalService,
)


class AttemptService:
    """
    Manages quiz taking lifecycle: starting attempts, answer key protection,
    grading responses, and generating detailed results.
    """

    def __init__(
        self,
        store: QuizStore = quiz_store,
        eval_service: ShortAnswerEvalService = short_answer_eval_service,
    ) -> None:
        self.store = store
        self.eval_service = eval_service

    def start_attempt(
        self, quiz_id: str, participant_name: Optional[str] = None
    ) -> StartAttemptResponse:
        """
        Initiate a new quiz attempt.
        CRITICAL: Scrubs all correct options, expected answers, and explanations.
        """
        quiz = self.store.get_quiz(quiz_id)
        if not quiz:
            raise QuizNotFoundError(
                f"Quiz with ID '{quiz_id}' does not exist or has expired.",
                details={"quiz_id": quiz_id},
            )

        if not quiz.questions:
            raise InvalidAttemptStateError(
                "Cannot start an attempt for a quiz with no questions.",
                details={"quiz_id": quiz_id},
            )

        attempt = self.store.create_attempt(
            quiz_id=quiz_id, participant_name=participant_name
        )

        # Build sanitized questions with ABSOLUTELY NO answers or explanations leaked
        taking_questions: List[QuizTakingQuestion] = []
        for idx, q in enumerate(quiz.questions):
            sanitized_options = [
                QuizTakingOption(id=opt.id, text=opt.text) for opt in q.options
            ]

            taking_questions.append(
                QuizTakingQuestion(
                    question_id=q.question_id,
                    number=idx + 1,
                    type=q.type,
                    question_text=q.question_text,
                    options=sanitized_options,
                    difficulty=q.difficulty,
                    topic=q.topic,
                    max_score=1.0,
                )
            )

        return StartAttemptResponse(
            attempt_id=attempt.attempt_id,
            quiz_id=quiz.quiz_id,
            title=quiz.title,
            time_limit_enabled=quiz.settings.time_limit_enabled,
            time_limit_seconds=quiz.settings.time_limit_seconds,
            total_questions=len(taking_questions),
            questions=taking_questions,
            started_at=attempt.started_at,
        )

    async def submit_attempt(
        self, quiz_id: str, attempt_id: str, payload: SubmitAttemptRequest
    ) -> AttemptResultResponse:
        """
        Submit and grade all student answers.
        Returns final score, breakdown, and question-level review.
        Prevents resubmission/tampering once finalized.
        """
        attempt = self.store.get_attempt(attempt_id)
        if not attempt or attempt.quiz_id != quiz_id:
            raise AttemptNotFoundError(
                f"Attempt with ID '{attempt_id}' was not found for quiz '{quiz_id}'.",
                details={"quiz_id": quiz_id, "attempt_id": attempt_id},
            )

        # Idempotent lock: return existing results if already submitted
        if attempt.is_submitted and attempt.result is not None:
            return attempt.result

        quiz = self.store.get_quiz(quiz_id)
        if not quiz and not attempt.quiz_snapshot:
            raise QuizNotFoundError(
                f"Quiz with ID '{quiz_id}' was not found.",
                details={"quiz_id": quiz_id},
            )

        # Retrieve questions from immutable attempt snapshot if available, or current quiz questions
        questions_to_grade: List[GeneratedQuestion] = []
        if attempt.quiz_snapshot:
            for q_data in attempt.quiz_snapshot:
                q_type = QuestionType.MULTIPLE_CHOICE
                for qt in QuestionType:
                    if qt.value == q_data.get("type"):
                        q_type = qt
                        break
                diff = DifficultyLevel.MEDIUM
                for d in DifficultyLevel:
                    if d.value == q_data.get("difficulty"):
                        diff = d
                        break
                opts = [
                    QuizQuestionOption(id=o.get("id", ""), text=o.get("text", ""))
                    for o in q_data.get("options", [])
                ]
                srcs = [
                    SourceReference(source_id=s.get("source_id", ""), page=s.get("page"))
                    for s in q_data.get("sources", [])
                ]
                questions_to_grade.append(
                    GeneratedQuestion(
                        question_id=q_data["question_id"],
                        type=q_type,
                        question_text=q_data.get("question_text", ""),
                        options=opts,
                        correct_option_id=q_data.get("correct_option_id"),
                        expected_answer=q_data.get("expected_answer"),
                        explanation=q_data.get("explanation", ""),
                        difficulty=diff,
                        topic=q_data.get("topic"),
                        sources=srcs,
                    )
                )
        elif quiz:
            questions_to_grade = quiz.questions

        # Map student answers by question ID
        answers_map = {ans.question_id: ans for ans in payload.answers}

        question_results: List[QuestionResultItem] = []
        total_score: float = 0.0
        max_possible_score: float = 0.0
        answered_count: int = 0
        unanswered_count: int = 0
        correct_count: int = 0
        incorrect_count: int = 0

        for idx, q in enumerate(questions_to_grade):
            max_possible_score += 1.0
            sub = answers_map.get(q.question_id)

            # Determine whether question was answered
            has_answered = False
            if sub:
                if q.type == QuestionType.SHORT_ANSWER:
                    has_answered = bool(sub.text_answer and sub.text_answer.strip())
                else:
                    has_answered = bool(sub.selected_option_id and sub.selected_option_id.strip())

            if not has_answered:
                unanswered_count += 1
                incorrect_count += 1

                # Determine correct answer display text
                correct_text = ""
                if q.type == QuestionType.SHORT_ANSWER:
                    correct_text = q.expected_answer or "Expected answer omitted."
                else:
                    opt = next((o for o in q.options if o.id.lower() == (q.correct_option_id or "").lower()), None)
                    correct_text = opt.text if opt else (q.correct_option_id or "")

                question_results.append(
                    QuestionResultItem(
                        question_id=q.question_id,
                        number=idx + 1,
                        type=q.type,
                        question_text=q.question_text,
                        selected_option_id=None,
                        user_answer_text=None,
                        correct_answer_text=correct_text,
                        correct_option_id=q.correct_option_id,
                        is_correct=False,
                        is_unanswered=True,
                        score=0.0,
                        max_score=1.0,
                        explanation=q.explanation,
                        feedback="Question was left unanswered.",
                        sources=q.sources,
                    )
                )
                continue

            # Question was answered
            answered_count += 1

            if q.type in (QuestionType.MULTIPLE_CHOICE, QuestionType.TRUE_FALSE):
                sel_id = sub.selected_option_id.strip().lower() if sub.selected_option_id else ""
                corr_id = (q.correct_option_id or "").strip().lower()

                sel_opt = next((o for o in q.options if o.id.lower() == sel_id), None)
                corr_opt = next((o for o in q.options if o.id.lower() == corr_id), None)

                user_ans_text = sel_opt.text if sel_opt else sel_id
                corr_ans_text = corr_opt.text if corr_opt else corr_id

                is_correct = (sel_id == corr_id)
                q_score = 1.0 if is_correct else 0.0

                if is_correct:
                    correct_count += 1
                    total_score += 1.0
                    feedback = "Correct answer!"
                else:
                    incorrect_count += 1
                    feedback = f"Incorrect. The correct answer is: {corr_ans_text}."

                question_results.append(
                    QuestionResultItem(
                        question_id=q.question_id,
                        number=idx + 1,
                        type=q.type,
                        question_text=q.question_text,
                        selected_option_id=sub.selected_option_id,
                        user_answer_text=user_ans_text,
                        correct_answer_text=corr_ans_text,
                        correct_option_id=q.correct_option_id,
                        is_correct=is_correct,
                        is_unanswered=False,
                        score=q_score,
                        max_score=1.0,
                        explanation=q.explanation,
                        feedback=feedback,
                        sources=q.sources,
                    )
                )

            elif q.type == QuestionType.SHORT_ANSWER:
                user_text = sub.text_answer.strip() if sub.text_answer else ""
                expected_text = q.expected_answer or ""

                score, feedback, rationale = await self.eval_service.evaluate(
                    question_text=q.question_text,
                    expected_answer=expected_text,
                    explanation=q.explanation,
                    student_answer=user_text,
                    max_score=1.0,
                )

                total_score += score
                is_correct = score >= 0.7
                if is_correct:
                    correct_count += 1
                else:
                    incorrect_count += 1

                combined_feedback = f"{feedback} {rationale}".strip()

                question_results.append(
                    QuestionResultItem(
                        question_id=q.question_id,
                        number=idx + 1,
                        type=q.type,
                        question_text=q.question_text,
                        selected_option_id=None,
                        user_answer_text=user_text,
                        correct_answer_text=expected_text,
                        correct_option_id=None,
                        is_correct=is_correct,
                        is_unanswered=False,
                        score=score,
                        max_score=1.0,
                        explanation=q.explanation,
                        feedback=combined_feedback,
                        sources=q.sources,
                    )
                )

        percentage = round((total_score / max_possible_score) * 100.0, 1) if max_possible_score > 0 else 0.0

        now_str = datetime.now(timezone.utc).isoformat()
        result_payload = AttemptResultResponse(
            attempt_id=attempt.attempt_id,
            quiz_id=quiz.quiz_id if quiz else quiz_id,
            title=quiz.title if quiz else "Quiz Attempt",
            total_questions=len(questions_to_grade),
            answered_count=answered_count,
            unanswered_count=unanswered_count,
            correct_count=correct_count,
            incorrect_count=incorrect_count,
            total_score=round(total_score, 2),
            max_score=max_possible_score,
            percentage=percentage,
            time_spent_seconds=payload.time_spent_seconds,
            is_submitted=True,
            started_at=attempt.started_at,
            submitted_at=now_str,
            questions=question_results,
        )

        # Finalize attempt in store
        attempt.is_submitted = True
        attempt.submitted_at = now_str
        attempt.submitted_answers = payload.answers
        attempt.time_spent_seconds = payload.time_spent_seconds
        attempt.result = result_payload
        self.store.finalize_attempt(
            attempt_id=attempt.attempt_id,
            result=result_payload,
            answers=payload.answers,
            time_spent_seconds=payload.time_spent_seconds,
        )

        return result_payload

    def get_attempt_results(
        self, quiz_id: str, attempt_id: str
    ) -> AttemptResultResponse:
        """Retrieve results for an already finalized quiz attempt."""
        attempt = self.store.get_attempt(attempt_id)
        if not attempt or attempt.quiz_id != quiz_id:
            raise AttemptNotFoundError(
                f"Attempt with ID '{attempt_id}' was not found for quiz '{quiz_id}'.",
                details={"quiz_id": quiz_id, "attempt_id": attempt_id},
            )

        if not attempt.is_submitted or attempt.result is None:
            raise AttemptNotSubmittedError(
                f"Attempt '{attempt_id}' has not been submitted yet.",
                details={"attempt_id": attempt_id},
            )

        return attempt.result

    def save_quiz_draft(self, request: QuizSaveRequest) -> GeneratedQuizResponse:
        """Save a quiz from the creator into the registry so it can be taken."""
        quiz_id = request.quiz_id or f"quiz_{uuid.uuid4().hex[:12]}"

        diff = request.difficulty or (request.settings.difficulty if request.settings else "medium")
        time_enabled = request.time_limit_enabled if request.time_limit_enabled is not None else (
            request.settings.time_limit_enabled if request.settings else False
        )
        time_secs = request.time_limit_seconds if request.time_limit_seconds is not None else (
            request.settings.time_limit_seconds if request.settings else None
        )
        subj = request.subject or (request.settings.subject if request.settings else None)
        exam = request.exam or (request.settings.exam if request.settings else None)
        ayear = request.academic_year or (request.settings.academic_year if request.settings else None)
        q_types = (
            request.settings.question_types if request.settings and request.settings.question_types
            else list({q.type.value if hasattr(q.type, "value") else str(q.type) for q in request.questions}) or ["multiple_choice"]
        )

        settings = GeneratedQuizSettings(
            difficulty=diff,
            question_types=q_types,
            time_limit_enabled=time_enabled,
            time_limit_seconds=time_secs,
            subject=subj,
            exam=exam,
            academic_year=ayear,
        )

        stype = request.source_type or (request.source_metadata.source_type if request.source_metadata else "topic")
        sid = (request.source_metadata.source_id if request.source_metadata else "manual")

        source_meta = GeneratedQuizSourceMeta(
            source_id=sid,
            source_type=stype,
            title=request.title,
            filename=request.source_metadata.filename if request.source_metadata else None,
            page_count=request.source_metadata.page_count if request.source_metadata else None,
            word_count=request.source_metadata.word_count if request.source_metadata else None,
        )

        quiz = GeneratedQuizResponse(
            quiz_id=quiz_id,
            title=request.title,
            status="saved",
            question_count=len(request.questions),
            questions=request.questions,
            settings=settings,
            source_metadata=source_meta,
            created_at=datetime.now(timezone.utc).isoformat(),
        )

        self.store.register_quiz(quiz)
        return quiz


attempt_service = AttemptService()
