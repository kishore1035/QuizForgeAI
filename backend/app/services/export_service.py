"""
Export service for generating readable Markdown and Plain-Text exports of
quizzes, separate answer keys, and graded attempt performance reports.
"""

from typing import Optional
from app.schemas.quiz import GeneratedQuizResponse, QuestionType
from app.schemas.attempt import AttemptResultResponse


class ExportService:
    """Produces human-readable Markdown and Plain-Text exports."""

    # -------------------------------------------------------------------------
    # 1. QUIZ QUESTIONS EXPORT (STUDENT-FACING: NO ANSWERS OR EXPLANATIONS)
    # -------------------------------------------------------------------------
    def export_quiz_questions(
        self,
        quiz: GeneratedQuizResponse,
        format: str = "markdown",
    ) -> str:
        """
        Generate a clean student-facing quiz export.
        CRITICAL: All correct answers, keys, and explanations are excluded.
        """
        is_md = format.lower() == "markdown"
        lines = []

        # Title & Metadata
        if is_md:
            lines.append(f"# {quiz.title}\n")
            meta_parts = []
            if quiz.settings.subject:
                meta_parts.append(f"**Subject:** {quiz.settings.subject}")
            if quiz.settings.exam:
                meta_parts.append(f"**Exam:** {quiz.settings.exam}")
            if quiz.settings.academic_year:
                meta_parts.append(f"**Year:** {quiz.settings.academic_year}")
            meta_parts.append(f"**Difficulty:** {quiz.settings.difficulty.capitalize()}")
            meta_parts.append(f"**Questions:** {len(quiz.questions)}")
            if quiz.settings.time_limit_enabled and quiz.settings.time_limit_seconds:
                meta_parts.append(f"**Time Limit:** {quiz.settings.time_limit_seconds}s per question")
            lines.append(" | ".join(meta_parts))
            lines.append("\n---\n")
            lines.append("### Instructions\nAnswer all questions below. For multiple-choice questions, choose the single best option.\n")
        else:
            sep = "=" * 60
            lines.append(sep)
            lines.append(f"QUIZ: {quiz.title.upper()}")
            lines.append(sep)
            if quiz.settings.subject:
                lines.append(f"Subject: {quiz.settings.subject}")
            if quiz.settings.exam:
                lines.append(f"Exam: {quiz.settings.exam}")
            if quiz.settings.academic_year:
                lines.append(f"Year: {quiz.settings.academic_year}")
            lines.append(f"Difficulty: {quiz.settings.difficulty.capitalize()}")
            lines.append(f"Total Questions: {len(quiz.questions)}")
            if quiz.settings.time_limit_enabled and quiz.settings.time_limit_seconds:
                lines.append(f"Time Limit: {quiz.settings.time_limit_seconds}s per question")
            lines.append("-" * 60)
            lines.append("INSTRUCTIONS: Answer all questions below.\n")

        # Questions
        for idx, q in enumerate(quiz.questions, start=1):
            if is_md:
                lines.append(f"#### Question {idx}")
                lines.append(f"{q.question_text}\n")
            else:
                lines.append(f"Question {idx}. {q.question_text}\n")

            if q.type == QuestionType.SHORT_ANSWER:
                if is_md:
                    lines.append("*Your Answer:*\n\n_________________________________________________\n")
                else:
                    lines.append("Your Answer:\n_________________________________________________\n")
            else:
                for opt_idx, opt in enumerate(q.options):
                    label = opt.id.upper() if len(opt.id) <= 2 else chr(65 + opt_idx)
                    if is_md:
                        lines.append(f"- **{label}.** {opt.text}")
                    else:
                        lines.append(f"   {label}. {opt.text}")
                lines.append("")

            # Optional source reference (no answers leaked)
            if q.sources:
                src_citations = []
                for s in q.sources:
                    if s.page:
                        src_citations.append(f"Source: {s.source_id} (Page {s.page})")
                    else:
                        src_citations.append(f"Source: {s.source_id}")
                citation_str = ", ".join(src_citations)
                if is_md:
                    lines.append(f"\n> *Reference:* {citation_str}\n")
                else:
                    lines.append(f"   [Reference: {citation_str}]\n")

            if is_md:
                lines.append("")

        return "\n".join(lines).strip() + "\n"

    # -------------------------------------------------------------------------
    # 2. SEPARATE ANSWER KEY EXPORT
    # -------------------------------------------------------------------------
    def export_quiz_answer_key(
        self,
        quiz: GeneratedQuizResponse,
        format: str = "markdown",
    ) -> str:
        """
        Generate a dedicated Answer Key document.
        Contains correct answers, full explanations, and source references.
        """
        is_md = format.lower() == "markdown"
        lines = []

        if is_md:
            lines.append(f"# Answer Key: {quiz.title}\n")
            meta_parts = []
            if quiz.settings.subject:
                meta_parts.append(f"**Subject:** {quiz.settings.subject}")
            if quiz.settings.exam:
                meta_parts.append(f"**Exam:** {quiz.settings.exam}")
            meta_parts.append(f"**Questions:** {len(quiz.questions)}")
            lines.append(" | ".join(meta_parts))
            lines.append("\n---\n")
            lines.append("### Official Solutions & Explanations\n")
        else:
            sep = "=" * 60
            lines.append(sep)
            lines.append(f"ANSWER KEY: {quiz.title.upper()}")
            lines.append(sep)
            if quiz.settings.subject:
                lines.append(f"Subject: {quiz.settings.subject}")
            if quiz.settings.exam:
                lines.append(f"Exam: {quiz.settings.exam}")
            lines.append(f"Total Questions: {len(quiz.questions)}")
            lines.append("-" * 60)
            lines.append("OFFICIAL SOLUTIONS & EXPLANATIONS\n")

        for idx, q in enumerate(quiz.questions, start=1):
            if is_md:
                lines.append(f"#### Question {idx}. {q.question_text}")
            else:
                lines.append(f"Question {idx}. {q.question_text}")

            # Identify correct answer text
            if q.type == QuestionType.SHORT_ANSWER:
                correct_text = q.expected_answer or "(Answer not specified)"
                if is_md:
                    lines.append(f"- **Expected Answer:** {correct_text}")
                else:
                    lines.append(f"   Expected Answer: {correct_text}")
            else:
                corr_id = (q.correct_option_id or "").strip().lower()
                matching_opt = next((o for o in q.options if o.id.lower() == corr_id), None)
                if matching_opt:
                    label = matching_opt.id.upper()
                    text = matching_opt.text
                    ans_str = f"Option {label}: {text}"
                else:
                    ans_str = f"Option {corr_id.upper()}"
                if is_md:
                    lines.append(f"- **Correct Answer:** {ans_str}")
                else:
                    lines.append(f"   Correct Answer: {ans_str}")

            # Explanation
            expl = q.explanation or "No explanation provided."
            if is_md:
                lines.append(f"- **Explanation:** {expl}")
            else:
                lines.append(f"   Explanation: {expl}")

            # Source Reference
            if q.sources:
                src_citations = []
                for s in q.sources:
                    if s.page:
                        src_citations.append(f"{s.source_id} (Page {s.page})")
                    else:
                        src_citations.append(s.source_id)
                citation_str = ", ".join(src_citations)
                if is_md:
                    lines.append(f"- **Source Reference:** {citation_str}")
                else:
                    lines.append(f"   Source Reference: {citation_str}")

            lines.append("\n" if is_md else "")

        return "\n".join(lines).strip() + "\n"

    # -------------------------------------------------------------------------
    # 3. COMPLETED ATTEMPT REPORT EXPORT
    # -------------------------------------------------------------------------
    def export_attempt_results(
        self,
        result: AttemptResultResponse,
        format: str = "markdown",
    ) -> str:
        """
        Generate a comprehensive, verified student attempt report.
        Includes marks earned, percentage, answer breakdown, and grading feedback.
        """
        is_md = format.lower() == "markdown"
        lines = []

        sub_date = result.submitted_at or result.started_at
        time_taken = f"{result.time_spent_seconds} seconds" if result.time_spent_seconds is not None else "Not recorded"

        if is_md:
            lines.append(f"# Quiz Attempt Report: {result.title}\n")
            lines.append(f"**Attempt ID:** `{result.attempt_id}` | **Date:** {sub_date}\n")
            lines.append("### Performance Summary\n")
            lines.append(f"- **Score Earned:** **{result.total_score}** / {result.max_score} ({result.percentage}%)")
            lines.append(f"- **Total Questions:** {result.total_questions}")
            lines.append(f"- **Answered:** {result.answered_count} | **Unanswered:** {result.unanswered_count}")
            lines.append(f"- **Correct:** {result.correct_count} | **Incorrect:** {result.incorrect_count}")
            lines.append(f"- **Time Spent:** {time_taken}")
            lines.append("\n---\n")
            lines.append("### Question-by-Question Breakdown\n")
        else:
            sep = "=" * 60
            lines.append(sep)
            lines.append(f"QUIZ ATTEMPT REPORT: {result.title.upper()}")
            lines.append(sep)
            lines.append(f"Attempt ID: {result.attempt_id}")
            lines.append(f"Date: {sub_date}")
            lines.append(f"Score Earned: {result.total_score} / {result.max_score} ({result.percentage}%)")
            lines.append(f"Total Questions: {result.total_questions}")
            lines.append(f"Answered: {result.answered_count} | Unanswered: {result.unanswered_count}")
            lines.append(f"Correct: {result.correct_count} | Incorrect: {result.incorrect_count}")
            lines.append(f"Time Spent: {time_taken}")
            lines.append("-" * 60)
            lines.append("QUESTION-BY-QUESTION BREAKDOWN\n")

        for idx, q_res in enumerate(result.questions, start=1):
            status_icon = "CORRECT" if q_res.is_correct else ("UNANSWERED" if q_res.is_unanswered else "INCORRECT")
            score_badge = f"{q_res.score}/{q_res.max_score} pts"

            if is_md:
                status_md = f"`[{status_icon}]`"
                lines.append(f"#### Question {idx} {status_md} ({score_badge})")
                lines.append(f"{q_res.question_text}\n")
                user_ans = q_res.user_answer_text or "(No answer provided)"
                lines.append(f"- **Your Answer:** {user_ans}")
                lines.append(f"- **Correct Answer:** {q_res.correct_answer_text}")
                if q_res.feedback:
                    lines.append(f"- **Grading Feedback:** {q_res.feedback}")
                if q_res.explanation:
                    lines.append(f"- **Explanation:** {q_res.explanation}")
                if q_res.sources:
                    srcs = [f"{s.source_id} (p. {s.page})" if s.page else s.source_id for s in q_res.sources]
                    lines.append(f"- **Source Reference:** {', '.join(srcs)}")
                lines.append("")
            else:
                lines.append(f"Question {idx} [{status_icon}] ({score_badge})")
                lines.append(f"{q_res.question_text}")
                user_ans = q_res.user_answer_text or "(No answer provided)"
                lines.append(f"   Your Answer: {user_ans}")
                lines.append(f"   Correct Answer: {q_res.correct_answer_text}")
                if q_res.feedback:
                    lines.append(f"   Grading Feedback: {q_res.feedback}")
                if q_res.explanation:
                    lines.append(f"   Explanation: {q_res.explanation}")
                if q_res.sources:
                    srcs = [f"{s.source_id} (p. {s.page})" if s.page else s.source_id for s in q_res.sources]
                    lines.append(f"   Source Reference: {', '.join(srcs)}")
                lines.append("")

        return "\n".join(lines).strip() + "\n"


export_service = ExportService()
