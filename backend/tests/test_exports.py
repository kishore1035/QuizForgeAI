import pytest
from starlette.testclient import TestClient

from app.main import app
from app.db.session import init_db
from app.schemas.quiz import (
    GeneratedQuizResponse,
    GeneratedQuizSettings,
    GeneratedQuizSourceMeta,
    GeneratedQuestion,
    QuizQuestionOption,
    QuestionType,
    SourceReference,
)
from app.services.quiz_store import quiz_store
from app.services.export_service import export_service

client = TestClient(app)


@pytest.fixture(autouse=True)
def ensure_db():
    init_db()


def create_sample_quiz(quiz_id: str = "export-quiz-1") -> GeneratedQuizResponse:
    quiz = GeneratedQuizResponse(
        quiz_id=quiz_id,
        title="Python Fundamentals & Architecture",
        status="saved",
        question_count=2,
        settings=GeneratedQuizSettings(
            difficulty="medium",
            question_types=["multiple_choice", "short_answer"],
            time_limit_enabled=True,
            time_limit_seconds=45,
            subject="Computer Science",
            exam="Python PCEP",
            academic_year="2026",
        ),
        source_metadata=GeneratedQuizSourceMeta(
            source_id="src_py_doc",
            source_type="pdf",
            title="Python Specs",
        ),
        questions=[
            GeneratedQuestion(
                question_id="q1",
                type=QuestionType.MULTIPLE_CHOICE,
                question_text="What does a Python decorator do?",
                options=[
                    QuizQuestionOption(id="a", text="Extends or modifies callable behavior"),
                    QuizQuestionOption(id="b", text="Deletes a function from memory"),
                    QuizQuestionOption(id="c", text="Compiles bytecode directly to C"),
                ],
                correct_option_id="a",
                explanation="Decorators wrap a function, modifying its behavior transparently.",
                sources=[SourceReference(source_id="src_py_doc", page=12)],
            ),
            GeneratedQuestion(
                question_id="q2",
                type=QuestionType.SHORT_ANSWER,
                question_text="Name the built-in function used to get the length of an iterable in Python.",
                options=[],
                expected_answer="len",
                explanation="The len() built-in function returns the number of items in a container.",
                sources=[SourceReference(source_id="src_py_doc", page=5)],
            ),
        ],
        created_at="2026-10-09T10:00:00Z",
    )
    quiz_store.register_quiz(quiz)
    return quiz


def test_quiz_questions_export_scrubs_answers():
    quiz = create_sample_quiz("test-scrub-1")

    # 1. Markdown Export
    md = export_service.export_quiz_questions(quiz, format="markdown")
    assert "# Python Fundamentals & Architecture" in md
    assert "**Subject:** Computer Science" in md
    assert "**Time Limit:** 45s per question" in md
    assert "What does a Python decorator do?" in md
    assert "Extends or modifies callable behavior" in md
    assert "Name the built-in function" in md

    # CRITICAL: Verify NO correct answer keys or explanations leak
    assert "Decorators wrap a function" not in md
    assert "The len() built-in function returns" not in md
    assert "Expected Answer" not in md
    assert "Correct Answer" not in md

    # 2. Text Export
    txt = export_service.export_quiz_questions(quiz, format="txt")
    assert "QUIZ: PYTHON FUNDAMENTALS & ARCHITECTURE" in txt
    assert "Subject: Computer Science" in txt
    assert "Question 1. What does a Python decorator do?" in txt
    assert "Decorators wrap a function" not in txt
    assert "The len() built-in function returns" not in txt


def test_quiz_answer_key_export():
    quiz = create_sample_quiz("test-ans-1")

    # 1. Markdown Answer Key
    md = export_service.export_quiz_answer_key(quiz, format="markdown")
    assert "# Answer Key: Python Fundamentals & Architecture" in md
    assert "Official Solutions & Explanations" in md
    assert "Option A: Extends or modifies callable behavior" in md
    assert "Decorators wrap a function, modifying its behavior transparently." in md
    assert "Expected Answer:** len" in md
    assert "Source Reference:** src_py_doc (Page 12)" in md

    # 2. Text Answer Key
    txt = export_service.export_quiz_answer_key(quiz, format="txt")
    assert "ANSWER KEY: PYTHON FUNDAMENTALS & ARCHITECTURE" in txt
    assert "Correct Answer: Option A: Extends or modifies callable behavior" in txt
    assert "Explanation: Decorators wrap a function" in txt
    assert "Expected Answer: len" in txt


def test_attempt_results_export():
    quiz = create_sample_quiz("test-att-exp-1")

    # Start attempt
    start_res = client.post(f"/api/quizzes/{quiz.quiz_id}/attempts", json={"participant_name": "Devin"})
    assert start_res.status_code == 200
    att_id = start_res.json()["attempt_id"]

    # Submit answers
    sub_res = client.post(
        f"/api/quizzes/{quiz.quiz_id}/attempts/{att_id}/submit",
        json={
            "answers": [
                {"question_id": "q1", "selected_option_id": "a"},
                {"question_id": "q2", "text_answer": "len()"},
            ],
            "time_spent_seconds": 32,
        },
    )
    assert sub_res.status_code == 200

    # Retrieve report via Export Service
    result_data = client.get(f"/api/quizzes/{quiz.quiz_id}/attempts/{att_id}/results").json()
    from app.schemas.attempt import AttemptResultResponse
    res_obj = AttemptResultResponse(**result_data)

    md_report = export_service.export_attempt_results(res_obj, format="markdown")
    assert "# Quiz Attempt Report: Python Fundamentals & Architecture" in md_report
    assert f"**Attempt ID:** `{att_id}`" in md_report
    assert "Performance Summary" in md_report
    assert "**Time Spent:** 32 seconds" in md_report
    assert "Your Answer:" in md_report
    assert "Correct Answer:" in md_report

    txt_report = export_service.export_attempt_results(res_obj, format="txt")
    assert "QUIZ ATTEMPT REPORT: PYTHON FUNDAMENTALS & ARCHITECTURE" in txt_report
    assert f"Attempt ID: {att_id}" in txt_report
    assert "Time Spent: 32 seconds" in txt_report


def test_export_endpoints_http():
    quiz = create_sample_quiz("test-http-exp-1")

    # Questions Markdown
    res_q_md = client.get(f"/api/quizzes/{quiz.quiz_id}/export?type=questions&format=markdown")
    assert res_q_md.status_code == 200
    assert "attachment; filename=" in res_q_md.headers["content-disposition"]
    assert "text/markdown" in res_q_md.headers["content-type"]
    assert "What does a Python decorator do?" in res_q_md.text
    assert "Decorators wrap a function" not in res_q_md.text

    # Answer Key Text
    res_ak_txt = client.get(f"/api/quizzes/{quiz.quiz_id}/export?type=answer_key&format=txt")
    assert res_ak_txt.status_code == 200
    assert ".txt" in res_ak_txt.headers["content-disposition"]
    assert "ANSWER KEY" in res_ak_txt.text
    assert "Decorators wrap a function" in res_ak_txt.text

    # Non-existent quiz
    res_404 = client.get("/api/quizzes/nonexistent-id/export")
    assert res_404.status_code == 404


def test_export_with_minimal_metadata():
    """Ensure quizzes without subject, exam, or timer export cleanly without crashing."""
    minimal_quiz = GeneratedQuizResponse(
        quiz_id="min-quiz-1",
        title="Minimal Quiz",
        status="saved",
        question_count=1,
        settings=GeneratedQuizSettings(
            difficulty="easy",
            question_types=["multiple_choice"],
            time_limit_enabled=False,
            time_limit_seconds=None,
            subject=None,
            exam=None,
            academic_year=None,
        ),
        source_metadata=GeneratedQuizSourceMeta(
            source_id="manual",
            source_type="topic",
            title="Minimal",
        ),
        questions=[
            GeneratedQuestion(
                question_id="mq1",
                type=QuestionType.MULTIPLE_CHOICE,
                question_text="Is this minimal?",
                options=[
                    QuizQuestionOption(id="a", text="Yes"),
                    QuizQuestionOption(id="b", text="No"),
                ],
                correct_option_id="a",
                explanation="It has no optional metadata.",
            )
        ],
        created_at="2026-10-09T10:00:00Z",
    )
    quiz_store.register_quiz(minimal_quiz)

    md = export_service.export_quiz_questions(minimal_quiz, format="markdown")
    assert "# Minimal Quiz" in md
    assert "Subject" not in md
    assert "Time Limit" not in md
    assert "Is this minimal?" in md
