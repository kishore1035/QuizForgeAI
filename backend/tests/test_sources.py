import pymupdf as fitz
import pytest
from starlette.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)


def create_sample_pdf_bytes(page_texts: list[str]) -> bytes:
    """Helper to generate a real PDF in memory with PyMuPDF."""
    doc = fitz.open()
    for text in page_texts:
        page = doc.new_page()
        if text:
            page.insert_text((50, 72), text, fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


# 1. Topic Source Tests
def test_valid_topic_submission():
    payload = {
        "topic": "Python Decorators and Generators",
        "additional_instructions": "Focus on real-world practical use cases",
        "subject": "Computer Science",
    }
    response = client.post("/api/sources/topic", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["source_id"].startswith("src_")
    assert data["source_type"] == "topic"
    assert data["title"] == "Python Decorators and Generators"
    assert data["status"] == "ready"
    assert data["word_count"] == 4


def test_empty_topic_rejection():
    # Blank string
    response = client.post("/api/sources/topic", json={"topic": ""})
    assert response.status_code == 422

    # Whitespace only
    response2 = client.post("/api/sources/topic", json={"topic": "    "})
    assert response2.status_code == 422


# 2. Text Source Tests
def test_valid_text_submission():
    text_content = (
        "Cellular respiration is a set of metabolic reactions and processes "
        "that take place in the cells of organisms to convert biochemical energy from nutrients into ATP."
    )
    payload = {
        "text": text_content,
        "title": "Cellular Respiration Summary",
    }
    response = client.post("/api/sources/text", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["source_id"].startswith("src_")
    assert data["source_type"] == "text"
    assert data["title"] == "Cellular Respiration Summary"
    assert data["status"] == "ready"
    assert data["word_count"] > 10
    assert data["char_count"] == len(text_content)


def test_empty_text_rejection():
    response = client.post("/api/sources/text", json={"text": "   \n\t  "})
    assert response.status_code == 422


def test_text_length_limit():
    excessive_text = "a" * (settings.MAX_TEXT_CHAR_COUNT + 100)
    response = client.post("/api/sources/text", json={"text": excessive_text})
    assert response.status_code == 400
    assert "exceeds maximum length" in response.json()["error"]["message"]


# 3. PDF Upload Tests
def test_valid_pdf_upload():
    page1 = "Chapter 1: Foundations of Microeconomics and Supply-Demand Theory."
    page2 = "Chapter 2: Market Elasticity and Consumer Equilibrium Principles."
    pdf_bytes = create_sample_pdf_bytes([page1, page2])

    response = client.post(
        "/api/sources/upload",
        files={"file": ("microeconomics_notes.pdf", pdf_bytes, "application/pdf")},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["source_id"].startswith("src_")
    assert data["source_type"] == "pdf"
    assert data["filename"] == "microeconomics_notes.pdf"
    assert data["page_count"] == 2
    assert data["word_count"] > 10
    assert len(data["pages"]) == 2
    assert data["pages"][0]["page_number"] == 1
    assert data["pages"][1]["page_number"] == 2


def test_invalid_file_rejection_extension():
    response = client.post(
        "/api/sources/upload",
        files={"file": ("malicious.exe", b"fake binary data", "application/octet-stream")},
    )
    assert response.status_code == 400
    assert "Only .pdf documents are accepted" in response.json()["error"]["message"]


def test_invalid_file_rejection_magic_bytes():
    response = client.post(
        "/api/sources/upload",
        files={"file": ("fake_doc.pdf", b"NOT A PDF HEADER DATA", "application/pdf")},
    )
    assert response.status_code == 400
    assert "not a valid PDF document" in response.json()["error"]["message"]


def test_empty_or_scanned_pdf_rejection():
    # PDF with blank pages (simulating scanned image without text layer)
    pdf_bytes = create_sample_pdf_bytes(["", ""])
    response = client.post(
        "/api/sources/upload",
        files={"file": ("scanned_document.pdf", pdf_bytes, "application/pdf")},
    )
    assert response.status_code == 400
    assert "No extractable text found" in response.json()["error"]["message"]
    assert "OCR" in response.json()["error"]["message"]


# 4. Source Retrieval Tests
def test_get_source_metadata():
    # Create topic source
    create_resp = client.post("/api/sources/topic", json={"topic": "Quantum Computing Basics"})
    source_id = create_resp.json()["source_id"]

    # Retrieve source
    get_resp = client.get(f"/api/sources/{source_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["source_id"] == source_id
    assert get_resp.json()["title"] == "Quantum Computing Basics"


def test_get_nonexistent_source():
    response = client.get("/api/sources/src_nonexistent_999")
    assert response.status_code == 404


# 5. Quiz Generation Request Validation Tests
def test_valid_generation_request():
    # 1. Create a source
    src_resp = client.post("/api/sources/topic", json={"topic": "Data Structures & Algorithms"})
    source_id = src_resp.json()["source_id"]

    # 2. Submit valid generation request
    request_payload = {
        "source_id": source_id,
        "title": "DSA Midterm Prep",
        "question_count": 15,
        "difficulty": "medium",
        "question_types": ["multiple_choice", "true_false"],
        "subject": "Computer Science",
        "time_limit_enabled": True,
        "time_limit_seconds": 45,
        "additional_instructions": "Include algorithm complexity questions",
    }
    response = client.post("/api/quiz/validate-request", json=request_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["status"] == "generation_ready"
    assert data["generation_payload"]["question_count"] == 15
    assert data["source_title"] == "Data Structures & Algorithms"


def test_generation_request_difficulty_mixed():
    src_resp = client.post("/api/sources/topic", json={"topic": "Organic Chemistry"})
    source_id = src_resp.json()["source_id"]

    request_payload = {
        "source_id": source_id,
        "title": "Chemistry Quiz",
        "question_count": 10,
        "difficulty": "mixed",
        "question_types": ["multiple_choice"],
    }
    response = client.post("/api/quiz/validate-request", json=request_payload)
    assert response.status_code == 200
    assert response.json()["generation_payload"]["difficulty"] == "mixed"


def test_generation_request_invalid_timer():
    src_resp = client.post("/api/sources/topic", json={"topic": "World History"})
    source_id = src_resp.json()["source_id"]

    # Timer enabled but seconds missing or below 5
    invalid_timer_payload = {
        "source_id": source_id,
        "title": "History Quiz",
        "question_count": 10,
        "difficulty": "easy",
        "question_types": ["multiple_choice"],
        "time_limit_enabled": True,
        "time_limit_seconds": 2,  # Too small, min is 5s
    }
    response = client.post("/api/quiz/validate-request", json=invalid_timer_payload)
    assert response.status_code == 422


def test_generation_request_nonexistent_source():
    invalid_payload = {
        "source_id": "src_does_not_exist_xyz",
        "title": "Phantom Quiz",
        "question_count": 10,
        "difficulty": "easy",
        "question_types": ["multiple_choice"],
    }
    response = client.post("/api/quiz/validate-request", json=invalid_payload)
    assert response.status_code == 404
