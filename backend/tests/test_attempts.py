import pytest
from starlette.testclient import TestClient

from app.main import app
from app.services.quiz_store import quiz_store
from app.services.ollama_service import OllamaService
from app.services.short_answer_eval_service import ShortAnswerEvalService
from app.services.attempt_service import AttemptService
from app.schemas.quiz import (
    GeneratedQuizResponse,
    GeneratedQuestion,
    QuizQuestionOption,
    QuestionType,
    DifficultyLevel,
    GeneratedQuizSettings,
    GeneratedQuizSourceMeta,
    SourceReference,
)

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_store():
    quiz_store.clear()
    yield
    quiz_store.clear()


def make_mock_quiz(quiz_id: str = "test-quiz-1", time_limit_enabled: bool = True, time_limit_seconds: int = 30) -> GeneratedQuizResponse:
    q1 = GeneratedQuestion(
        question_id="q1",
        type=QuestionType.MULTIPLE_CHOICE,
        question_text="What does CSS stand for?",
        options=[
            QuizQuestionOption(id="a", text="Cascading Style Sheets"),
            QuizQuestionOption(id="b", text="Computer Style Sheets"),
            QuizQuestionOption(id="c", text="Creative Style System"),
        ],
        correct_option_id="a",
        explanation="CSS stands for Cascading Style Sheets.",
        difficulty=DifficultyLevel.EASY,
        sources=[SourceReference(source_id="src-1", page=2)],
    )

    q2 = GeneratedQuestion(
        question_id="q2",
        type=QuestionType.TRUE_FALSE,
        question_text="Python is a compiled language only.",
        options=[
            QuizQuestionOption(id="a", text="True"),
            QuizQuestionOption(id="b", text="False"),
        ],
        correct_option_id="b",
        explanation="Python is an interpreted language that compiles to bytecode.",
        difficulty=DifficultyLevel.EASY,
    )

    q3 = GeneratedQuestion(
        question_id="q3",
        type=QuestionType.SHORT_ANSWER,
        question_text="Explain the concept of encapsulation in Object Oriented Programming.",
        options=[],
        expected_answer="Encapsulation is the bundling of data and methods that operate on that data within a single unit or class, restricting direct access to some of an object's components.",
        explanation="Encapsulation bundles data and restricts access via access specifiers.",
        difficulty=DifficultyLevel.MEDIUM,
    )

    quiz = GeneratedQuizResponse(
        quiz_id=quiz_id,
        title="Web & Programming Fundamentals",
        status="generated",
        question_count=3,
        questions=[q1, q2, q3],
        settings=GeneratedQuizSettings(
            difficulty="mixed",
            question_types=["multiple_choice", "true_false", "short_answer"],
            time_limit_enabled=time_limit_enabled,
            time_limit_seconds=time_limit_seconds,
            subject="Computer Science",
        ),
        source_metadata=GeneratedQuizSourceMeta(
            source_id="src-1",
            source_type="pdf",
            title="CS101 Slides",
            page_count=5,
        ),
        created_at="2026-10-09T10:00:00Z",
    )
    quiz_store.register_quiz(quiz)
    return quiz


# -----------------------------------------------------------------------------
# 1. Start Attempt & Answer Key Scrubbing (Security)
# -----------------------------------------------------------------------------
def test_start_attempt_success_and_answer_key_protection():
    make_mock_quiz("quiz-sec-1")

    res = client.post("/api/quizzes/quiz-sec-1/attempts", json={"participant_name": "Alice"})
    assert res.status_code == 200
    data = res.json()

    assert data["quiz_id"] == "quiz-sec-1"
    assert data["attempt_id"].startswith("att_")
    assert data["total_questions"] == 3
    assert data["time_limit_enabled"] is True
    assert data["time_limit_seconds"] == 30

    questions = data["questions"]
    assert len(questions) == 3

    # CRITICAL SECURITY CHECK:
    # Verify no correct_option_id, expected_answer, or explanation in any question!
    for q in questions:
        assert "correct_option_id" not in q or q.get("correct_option_id") is None
        assert "expected_answer" not in q or q.get("expected_answer") is None
        assert "explanation" not in q or q.get("explanation") is None
        # Options must only have id and text
        for opt in q.get("options", []):
            assert "id" in opt and "text" in opt
            assert "is_correct" not in opt


def test_start_attempt_nonexistent_quiz():
    res = client.post("/api/quizzes/nonexistent-quiz-xyz/attempts")
    assert res.status_code == 404
    data = res.json()
    assert data["success"] is False
    assert "QuizNotFoundError" in data["error"]["type"]


def test_start_attempt_empty_quiz():
    empty_quiz = GeneratedQuizResponse(
        quiz_id="empty-q",
        title="Empty",
        status="generated",
        question_count=0,
        questions=[],
        settings=GeneratedQuizSettings(
            difficulty="easy",
            question_types=["multiple_choice"],
            time_limit_enabled=False,
        ),
        source_metadata=GeneratedQuizSourceMeta(
            source_id="s1", source_type="topic", title="Empty"
        ),
        created_at="2026-10-09T10:00:00Z",
    )
    quiz_store.register_quiz(empty_quiz)

    res = client.post("/api/quizzes/empty-q/attempts")
    assert res.status_code == 400
    assert "InvalidAttemptStateError" in res.json()["error"]["type"]


# -----------------------------------------------------------------------------
# 2. MCQ Deterministic Scoring
# -----------------------------------------------------------------------------
def test_mcq_deterministic_scoring():
    make_mock_quiz("quiz-mcq-1")
    start_res = client.post("/api/quizzes/quiz-mcq-1/attempts")
    attempt_id = start_res.json()["attempt_id"]

    # Submit correct answer for q1 ('a') and leave others unanswered
    submit_res = client.post(
        f"/api/quizzes/quiz-mcq-1/attempts/{attempt_id}/submit",
        json={
            "answers": [
                {"question_id": "q1", "selected_option_id": "a"},
            ],
            "time_spent_seconds": 25,
        },
    )
    assert submit_res.status_code == 200
    result = submit_res.json()

    assert result["total_questions"] == 3
    assert result["answered_count"] == 1
    assert result["unanswered_count"] == 2
    assert result["correct_count"] == 1
    assert result["incorrect_count"] == 2

    # Check q1 result details
    q1_res = next(q for q in result["questions"] if q["question_id"] == "q1")
    assert q1_res["is_correct"] is True
    assert q1_res["score"] == 1.0
    assert q1_res["is_unanswered"] is False
    assert "Cascading Style Sheets" in q1_res["correct_answer_text"]
    assert "CSS stands for" in q1_res["explanation"]
    assert len(q1_res["sources"]) == 1
    assert q1_res["sources"][0]["page"] == 2


def test_mcq_scoring_incorrect():
    make_mock_quiz("quiz-mcq-2")
    start_res = client.post("/api/quizzes/quiz-mcq-2/attempts")
    attempt_id = start_res.json()["attempt_id"]

    # Submit wrong option for q1 ('b')
    submit_res = client.post(
        f"/api/quizzes/quiz-mcq-2/attempts/{attempt_id}/submit",
        json={"answers": [{"question_id": "q1", "selected_option_id": "b"}]},
    )
    assert submit_res.status_code == 200
    result = submit_res.json()

    q1_res = next(q for q in result["questions"] if q["question_id"] == "q1")
    assert q1_res["is_correct"] is False
    assert q1_res["score"] == 0.0


# -----------------------------------------------------------------------------
# 3. True/False Scoring
# -----------------------------------------------------------------------------
def test_true_false_scoring():
    make_mock_quiz("quiz-tf-1")
    start_res = client.post("/api/quizzes/quiz-tf-1/attempts")
    attempt_id = start_res.json()["attempt_id"]

    # q2 correct answer is 'b' (False)
    submit_res = client.post(
        f"/api/quizzes/quiz-tf-1/attempts/{attempt_id}/submit",
        json={"answers": [{"question_id": "q2", "selected_option_id": "b"}]},
    )
    assert submit_res.status_code == 200
    result = submit_res.json()

    q2_res = next(q for q in result["questions"] if q["question_id"] == "q2")
    assert q2_res["is_correct"] is True
    assert q2_res["score"] == 1.0


# -----------------------------------------------------------------------------
# 4. Short Answer Evaluation (Empty, Fallback & Mocked LLM)
# -----------------------------------------------------------------------------
def test_short_answer_eval_empty_answer():
    make_mock_quiz("quiz-sa-empty")
    start_res = client.post("/api/quizzes/quiz-sa-empty/attempts")
    attempt_id = start_res.json()["attempt_id"]

    # Submit with empty string for short answer
    submit_res = client.post(
        f"/api/quizzes/quiz-sa-empty/attempts/{attempt_id}/submit",
        json={"answers": [{"question_id": "q3", "text_answer": "   "}]},
    )
    assert submit_res.status_code == 200
    result = submit_res.json()

    q3_res = next(q for q in result["questions"] if q["question_id"] == "q3")
    assert q3_res["is_unanswered"] is True
    assert q3_res["score"] == 0.0


@pytest.mark.asyncio
async def test_short_answer_eval_service_heuristic_fallback():
    eval_svc = ShortAnswerEvalService()
    # Force fallback by testing the heuristic directly
    score, feedback, rationale = eval_svc._heuristic_fallback(
        student_text="Encapsulation is bundling data and methods inside a class and restricting direct access.",
        expected_text="Encapsulation is the bundling of data and methods that operate on that data within a single unit or class, restricting direct access.",
        max_score=1.0,
    )
    assert score >= 0.6
    assert "keywords" in feedback.lower() or "strong" in feedback.lower()


@pytest.mark.asyncio
async def test_short_answer_eval_service_llm_mock(monkeypatch):
    eval_svc = ShortAnswerEvalService()

    async def mock_chat(*args, **kwargs):
        return '{"score": 0.85, "feedback": "Accurate explanation of class boundaries.", "rationale": "Demonstrates clear understanding."}'

    monkeypatch.setattr(eval_svc.ollama, "chat_completion", mock_chat)

    score, feedback, rationale = await eval_svc.evaluate(
        question_text="What is encapsulation?",
        expected_answer="Bundling data and methods into a class.",
        explanation="Encapsulation hides implementation details.",
        student_answer="It bundles methods and data into a class and hides details.",
        max_score=1.0,
    )
    assert score == 0.85
    assert "Accurate explanation" in feedback
    assert "clear understanding" in rationale


# -----------------------------------------------------------------------------
# 5. Full Submission with All Question Types & Percentage
# -----------------------------------------------------------------------------
def test_full_attempt_scoring_percentage():
    make_mock_quiz("quiz-full-1")
    start_res = client.post("/api/quizzes/quiz-full-1/attempts")
    attempt_id = start_res.json()["attempt_id"]

    submit_res = client.post(
        f"/api/quizzes/quiz-full-1/attempts/{attempt_id}/submit",
        json={
            "answers": [
                {"question_id": "q1", "selected_option_id": "a"},  # Correct (+1.0)
                {"question_id": "q2", "selected_option_id": "b"},  # Correct (+1.0)
                {
                    "question_id": "q3",
                    "text_answer": "Encapsulation bundles data and methods in a class restricting access.",
                },  # Short answer heuristic fallback
            ],
            "time_spent_seconds": 65,
        },
    )
    assert submit_res.status_code == 200
    res = submit_res.json()

    assert res["total_questions"] == 3
    assert res["answered_count"] == 3
    assert res["unanswered_count"] == 0
    assert res["max_score"] == 3.0
    assert res["total_score"] >= 2.0
    assert res["percentage"] >= 66.0
    assert res["time_spent_seconds"] == 65
    assert res["is_submitted"] is True


# -----------------------------------------------------------------------------
# 6. Idempotence & Resubmission Lock
# -----------------------------------------------------------------------------
def test_duplicate_submission_prevention():
    make_mock_quiz("quiz-dup-1")
    start_res = client.post("/api/quizzes/quiz-dup-1/attempts")
    attempt_id = start_res.json()["attempt_id"]

    # First submission
    sub1 = client.post(
        f"/api/quizzes/quiz-dup-1/attempts/{attempt_id}/submit",
        json={"answers": [{"question_id": "q1", "selected_option_id": "a"}]},
    )
    assert sub1.status_code == 200
    res1 = sub1.json()

    # Second submission (attempting to alter answer)
    sub2 = client.post(
        f"/api/quizzes/quiz-dup-1/attempts/{attempt_id}/submit",
        json={"answers": [{"question_id": "q1", "selected_option_id": "c"}]},
    )
    assert sub2.status_code == 200
    res2 = sub2.json()

    # Must return original finalized score
    assert res2["total_score"] == res1["total_score"]
    assert res2["submitted_at"] == res1["submitted_at"]


# -----------------------------------------------------------------------------
# 7. Get Results Endpoint
# -----------------------------------------------------------------------------
def test_get_results_endpoint_success_and_error():
    make_mock_quiz("quiz-res-1")
    start_res = client.post("/api/quizzes/quiz-res-1/attempts")
    attempt_id = start_res.json()["attempt_id"]

    # Attempt to fetch results before submitting -> 400 AttemptNotSubmittedError
    pre_res = client.get(f"/api/quizzes/quiz-res-1/attempts/{attempt_id}/results")
    assert pre_res.status_code == 400
    assert "AttemptNotSubmittedError" in pre_res.json()["error"]["type"]

    # Submit
    client.post(
        f"/api/quizzes/quiz-res-1/attempts/{attempt_id}/submit",
        json={"answers": [{"question_id": "q1", "selected_option_id": "a"}]},
    )

    # Fetch results after submission -> 200
    post_res = client.get(f"/api/quizzes/quiz-res-1/attempts/{attempt_id}/results")
    assert post_res.status_code == 200
    data = post_res.json()
    assert data["attempt_id"] == attempt_id
    assert len(data["questions"]) == 3


def test_submit_or_results_nonexistent_attempt():
    res1 = client.post(
        "/api/quizzes/quiz-res-1/attempts/att-nonexistent/submit",
        json={"answers": []},
    )
    assert res1.status_code == 404

    res2 = client.get("/api/quizzes/quiz-res-1/attempts/att-nonexistent/results")
    assert res2.status_code == 404


# -----------------------------------------------------------------------------
# 8. Retake Quiz Workflow
# -----------------------------------------------------------------------------
def test_retake_quiz_workflow():
    make_mock_quiz("quiz-retake-1")

    # Attempt 1
    res1 = client.post("/api/quizzes/quiz-retake-1/attempts")
    att1 = res1.json()["attempt_id"]
    client.post(
        f"/api/quizzes/quiz-retake-1/attempts/{att1}/submit",
        json={"answers": [{"question_id": "q1", "selected_option_id": "b"}]},  # Wrong answer
    )
    res_att1 = client.get(f"/api/quizzes/quiz-retake-1/attempts/{att1}/results").json()
    assert res_att1["total_score"] == 0.0

    # Retake: Start Attempt 2 on same quiz
    res2 = client.post("/api/quizzes/quiz-retake-1/attempts")
    att2 = res2.json()["attempt_id"]
    assert att2 != att1  # Brand new attempt session

    # Submit correct answer in Attempt 2
    client.post(
        f"/api/quizzes/quiz-retake-1/attempts/{att2}/submit",
        json={"answers": [{"question_id": "q1", "selected_option_id": "a"}]},
    )
    res_att2 = client.get(f"/api/quizzes/quiz-retake-1/attempts/{att2}/results").json()
    assert res_att2["total_score"] == 1.0


# -----------------------------------------------------------------------------
# 9. Save Quiz Draft from Creator & Attempt
# -----------------------------------------------------------------------------
def test_save_quiz_draft_and_take():
    q = GeneratedQuestion(
        question_id="q1",
        type=QuestionType.MULTIPLE_CHOICE,
        question_text="What color is the sky on a clear day?",
        options=[
            QuizQuestionOption(id="a", text="Blue"),
            QuizQuestionOption(id="b", text="Green"),
        ],
        correct_option_id="a",
        explanation="The sky is blue due to Rayleigh scattering.",
    )

    save_res = client.post(
        "/api/quizzes/save",
        json={
            "title": "Atmospheric Science Quiz",
            "questions": [q.model_dump()],
        },
    )
    assert save_res.status_code == 200
    saved_quiz = save_res.json()
    saved_id = saved_quiz["quiz_id"]

    # Start attempt on saved quiz
    start_res = client.post(f"/api/quizzes/{saved_id}/attempts")
    assert start_res.status_code == 200
    att_id = start_res.json()["attempt_id"]

    # Submit and score
    sub_res = client.post(
        f"/api/quizzes/{saved_id}/attempts/{att_id}/submit",
        json={"answers": [{"question_id": "q1", "selected_option_id": "a"}]},
    )
    assert sub_res.status_code == 200
    assert sub_res.json()["total_score"] == 1.0
    assert sub_res.json()["percentage"] == 100.0
