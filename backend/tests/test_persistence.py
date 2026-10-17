import io
import pytest
from starlette.testclient import TestClient

from app.main import app
from app.db.session import init_db, SessionLocal
from app.db.models import QuizModel, QuestionModel, QuizAttemptModel, SourceModel
from app.schemas.quiz import QuestionType, DifficultyLevel

client = TestClient(app)


@pytest.fixture(autouse=True)
def ensure_db():
    init_db()


def test_source_persistence_and_deletion():
    # 1. Create a Topic source
    res = client.post("/api/sources/topic", json={"topic": "Quantum Computing Basics"})
    assert res.status_code in (200, 201)
    source_id = res.json()["source_id"]

    # Retrieve source from API
    get_res = client.get(f"/api/sources/{source_id}")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["source_id"] == source_id
    assert data["source_type"] == "topic"
    assert "Quantum Computing" in data["title"]

    # Verify directly in DB
    db = SessionLocal()
    try:
        db_source = db.query(SourceModel).filter(SourceModel.id == source_id).first()
        assert db_source is not None
        assert db_source.source_type == "topic"
    finally:
        db.close()

    # Delete source
    del_res = client.delete(f"/api/sources/{source_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Verify source is gone
    get_after = client.get(f"/api/sources/{source_id}")
    assert get_after.status_code == 404


def test_quiz_crud_and_filtering():
    # Create a quiz with multiple questions
    payload = {
        "title": "Machine Learning Foundations",
        "difficulty": "hard",
        "source_type": "text",
        "subject": "Computer Science",
        "exam": "GRE CS",
        "academic_year": "2026",
        "time_limit_enabled": True,
        "time_limit_seconds": 60,
        "questions": [
            {
                "question_id": "ml-q1",
                "type": "multiple_choice",
                "question_text": "What is the primary purpose of regularization?",
                "options": [
                    {"id": "a", "text": "Prevent overfitting"},
                    {"id": "b", "text": "Speed up training"},
                    {"id": "c", "text": "Increase model parameters"},
                    {"id": "d", "text": "Eliminate loss"},
                ],
                "correct_option_id": "a",
                "explanation": "Regularization penalizes large weights to prevent overfitting.",
                "difficulty": "hard",
            },
            {
                "question_id": "ml-q2",
                "type": "true_false",
                "question_text": "Decision trees are sensitive to outlier features.",
                "options": [
                    {"id": "true", "text": "True"},
                    {"id": "false", "text": "False"},
                ],
                "correct_option_id": "false",
                "explanation": "Standard tree splits are based on rank order and generally robust to monotonic outliers.",
                "difficulty": "medium",
            },
        ],
    }

    create_res = client.post("/api/quizzes", json=payload)
    assert create_res.status_code in (200, 201)
    quiz_data = create_res.json()
    quiz_id = quiz_data["quiz_id"]
    assert quiz_data["title"] == "Machine Learning Foundations"
    assert len(quiz_data["questions"]) == 2

    # GET /api/quizzes (List quizzes)
    list_res = client.get("/api/quizzes")
    assert list_res.status_code == 200
    items = list_res.json()["quizzes"]
    found = [q for q in items if q["quiz_id"] == quiz_id]
    assert len(found) == 1
    assert found[0]["difficulty"] == "hard"
    assert found[0]["question_count"] == 2

    # Filter by difficulty
    filtered_res = client.get("/api/quizzes?difficulty=hard")
    assert filtered_res.status_code == 200
    assert any(q["quiz_id"] == quiz_id for q in filtered_res.json()["quizzes"])

    filtered_easy = client.get("/api/quizzes?difficulty=easy")
    assert filtered_easy.status_code == 200
    assert not any(q["quiz_id"] == quiz_id for q in filtered_easy.json()["quizzes"])

    # Search by keyword
    search_res = client.get("/api/quizzes?search=Machine")
    assert search_res.status_code == 200
    assert any(q["quiz_id"] == quiz_id for q in search_res.json()["quizzes"])

    # GET single quiz
    get_res = client.get(f"/api/quizzes/{quiz_id}")
    assert get_res.status_code == 200
    assert get_res.json()["quiz_id"] == quiz_id
    assert len(get_res.json()["questions"]) == 2

    # PATCH /api/quizzes/{id}
    patch_payload = {
        "title": "Advanced Machine Learning",
        "difficulty": "easy",
    }
    patch_res = client.patch(f"/api/quizzes/{quiz_id}", json=patch_payload)
    assert patch_res.status_code == 200
    assert patch_res.json()["title"] == "Advanced Machine Learning"
    assert patch_res.json()["settings"]["difficulty"] == "easy"

    # DELETE /api/quizzes/{id}
    del_res = client.delete(f"/api/quizzes/{quiz_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Verify deleted
    get_after_del = client.get(f"/api/quizzes/{quiz_id}")
    assert get_after_del.status_code == 404


def test_attempt_persistence_and_history():
    # Create quiz
    payload = {
        "title": "Data Structures Quiz",
        "difficulty": "medium",
        "source_type": "topic",
        "questions": [
            {
                "question_id": "ds-1",
                "type": "multiple_choice",
                "question_text": "What is the average time complexity of hash table lookup?",
                "options": [
                    {"id": "a", "text": "O(1)"},
                    {"id": "b", "text": "O(n)"},
                    {"id": "c", "text": "O(log n)"},
                ],
                "correct_option_id": "a",
                "explanation": "Hash tables offer O(1) average lookup.",
            }
        ],
    }
    quiz_res = client.post("/api/quizzes", json=payload)
    assert quiz_res.status_code in (200, 201)
    quiz_id = quiz_res.json()["quiz_id"]

    # Start attempt
    att_res = client.post(f"/api/quizzes/{quiz_id}/attempts", json={"participant_name": "Bob"})
    assert att_res.status_code == 200
    att_data = att_res.json()
    attempt_id = att_data["attempt_id"]

    # Verify answer key scrubbed on taking endpoint
    assert att_data["questions"][0]["question_id"] == "ds-1"
    assert "correct_option_id" not in att_data["questions"][0]
    assert "explanation" not in att_data["questions"][0]

    # Submit attempt
    sub_res = client.post(
        f"/api/quizzes/{quiz_id}/attempts/{attempt_id}/submit",
        json={
            "answers": [{"question_id": "ds-1", "selected_option_id": "a"}],
            "time_spent_seconds": 15,
        },
    )
    assert sub_res.status_code == 200
    sub_data = sub_res.json()
    assert sub_data["total_score"] == 1.0
    assert sub_data["percentage"] == 100.0

    # Retrieve history
    hist_res = client.get(f"/api/quizzes/{quiz_id}/attempts")
    assert hist_res.status_code == 200
    hist = hist_res.json()
    assert hist["total_attempts"] == 1
    assert hist["attempts"][0]["attempt_id"] == attempt_id
    assert hist["attempts"][0]["percentage"] == 100.0
    assert hist["attempts"][0]["participant_name"] == "Bob"

    # Verify quiz list reflects attempt count and score
    list_res = client.get("/api/quizzes")
    items = list_res.json()["quizzes"]
    target = next((q for q in items if q["quiz_id"] == quiz_id), None)
    assert target is not None
    assert target["attempt_count"] == 1
    assert target["latest_score"] == 1.0
    assert target["best_percentage"] == 100.0


def test_question_snapshot_stability():
    """
    Ensure that if a quiz's questions are modified after an attempt was started,
    the attempt's grading and result review maintain the original question snapshot!
    """
    # Create quiz with Version 1 questions
    payload = {
        "title": "History of Computing",
        "difficulty": "medium",
        "questions": [
            {
                "question_id": "hist-1",
                "type": "multiple_choice",
                "question_text": "ORIGINAL: Who proposed the Turing Machine?",
                "options": [
                    {"id": "a", "text": "Alan Turing"},
                    {"id": "b", "text": "Ada Lovelace"},
                ],
                "correct_option_id": "a",
                "explanation": "Alan Turing published his landmark paper in 1936.",
            }
        ],
    }
    quiz_res = client.post("/api/quizzes", json=payload)
    assert quiz_res.status_code in (200, 201)
    quiz_id = quiz_res.json()["quiz_id"]

    # Start attempt with Version 1
    att_res = client.post(f"/api/quizzes/{quiz_id}/attempts")
    attempt_id = att_res.json()["attempt_id"]

    # Now edit the quiz (Version 2 with completely different text)
    patch_payload = {
        "title": "History of Computing - Revised",
        "questions": [
            {
                "question_id": "hist-1",
                "type": "multiple_choice",
                "question_text": "REVISED: What machine did Ada Lovelace write programs for?",
                "options": [
                    {"id": "a", "text": "Analytical Engine"},
                    {"id": "b", "text": "ENIAC"},
                ],
                "correct_option_id": "a",
                "explanation": "Charles Babbage designed the Analytical Engine.",
            }
        ],
    }
    client.patch(f"/api/quizzes/{quiz_id}", json=patch_payload)

    # Submit the earlier attempt with Version 1 answers
    sub_res = client.post(
        f"/api/quizzes/{quiz_id}/attempts/{attempt_id}/submit",
        json={"answers": [{"question_id": "hist-1", "selected_option_id": "a"}]},
    )
    assert sub_res.status_code == 200
    res_data = sub_res.json()
    assert res_data["total_score"] == 1.0

    # Review results: MUST retain ORIGINAL question text and explanation from snapshot!
    review_res = client.get(f"/api/quizzes/{quiz_id}/attempts/{attempt_id}/results")
    assert review_res.status_code == 200
    q_rev = review_res.json()["questions"][0]
    assert "ORIGINAL: Who proposed the Turing Machine?" in q_rev["question_text"]
    assert "Alan Turing published" in q_rev["explanation"]
