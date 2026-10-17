import json
import os
from typing import Any, Dict, List
import httpx
import pymupdf as fitz
import pytest
from starlette.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.core.errors import (
    MissingOllamaApiKeyError,
    OllamaAuthenticationError,
    OllamaRateLimitError,
    OllamaTimeoutError,
    InvalidModelOutputError,
    InsufficientSourceMaterialError,
)
from app.services.ollama_service import OllamaService, ollama_service
from app.services.quiz_generation_service import QuizGenerationService, quiz_generation_service
from app.services.source_service import source_service
from app.schemas.source import TopicSourceCreate, TextSourceCreate

client = TestClient(app)


def create_sample_pdf_bytes(page_texts: List[str]) -> bytes:
    doc = fitz.open()
    for text in page_texts:
        page = doc.new_page()
        if text:
            page.insert_text((50, 72), text, fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


# -----------------------------------------------------------------------------
# 1. Ollama Endpoint & Model Selection Tests
# -----------------------------------------------------------------------------
def test_ollama_service_endpoint_and_model():
    # Base URL without /api
    srv1 = OllamaService(api_key="test-key", base_url="https://ollama.com", model="nemotron-3-nano:30b-cloud")
    assert srv1.chat_url == "https://ollama.com/api/chat"
    assert srv1.model == "nemotron-3-nano:30b-cloud"

    # Base URL with trailing slash
    srv2 = OllamaService(api_key="test-key", base_url="https://ollama.com/", model="nemotron-3-nano:30b-cloud")
    assert srv2.chat_url == "https://ollama.com/api/chat"

    # Base URL ending with /api normalizes to /api/chat rather than duplicate /api/api/chat
    srv3 = OllamaService(api_key="test-key", base_url="https://ollama.com/api", model="nemotron-3-nano:30b-cloud")
    assert srv3.chat_url == "https://ollama.com/api/chat"


# -----------------------------------------------------------------------------
# 2. Authentication Header Construction
# -----------------------------------------------------------------------------
def test_ollama_service_auth_headers():
    srv = OllamaService(api_key="secret-ollama-key-xyz")
    headers = srv.get_auth_headers()
    assert headers["Authorization"] == "Bearer secret-ollama-key-xyz"
    assert headers["Content-Type"] == "application/json"
    assert headers["Accept"] == "application/json"


# -----------------------------------------------------------------------------
# 3. Missing API Key Rejection
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_missing_api_key_rejection():
    srv = OllamaService(api_key="")
    with pytest.raises(MissingOllamaApiKeyError) as exc_info:
        await srv.chat_completion(messages=[{"role": "user", "content": "hi"}])
    assert "Ollama Cloud API key is not configured" in exc_info.value.message


# -----------------------------------------------------------------------------
# 4. Successful Topic-Based Generation & Schema Compliance
# -----------------------------------------------------------------------------
def test_successful_topic_generation(monkeypatch):
    # Register topic source
    topic_resp = source_service.create_topic_source(
        TopicSourceCreate(topic="Quantum Mechanics Principles", subject="Physics")
    )
    source_id = topic_resp.source_id

    mock_llm_response = {
        "title": "Quantum Mechanics Principles Quiz",
        "source_type": "topic",
        "difficulty": "medium",
        "questions": [
            {
                "question_id": "q1",
                "type": "multiple_choice",
                "question_text": "What is wave-particle duality?",
                "options": [
                    {"id": "a", "text": "Matter exhibits both wave and particle characteristics"},
                    {"id": "b", "text": "Waves travel faster than light"},
                    {"id": "c", "text": "Particles can never be observed"},
                    {"id": "d", "text": "Energy cannot be conserved"},
                ],
                "correct_option_id": "a",
                "expected_answer": None,
                "explanation": "Wave-particle duality posits that all matter can exhibit both wave and particle properties.",
                "difficulty": "medium",
                "topic": "Quantum Mechanics",
                "sources": [],
            },
            {
                "question_id": "q2",
                "type": "multiple_choice",
                "question_text": "Who formulated the uncertainty principle?",
                "options": [
                    {"id": "a", "text": "Isaac Newton"},
                    {"id": "b", "text": "Werner Heisenberg"},
                    {"id": "c", "text": "Albert Einstein"},
                    {"id": "d", "text": "Niels Bohr"},
                ],
                "correct_option_id": "b",
                "expected_answer": None,
                "explanation": "Werner Heisenberg introduced the uncertainty principle in 1927.",
                "difficulty": "easy",
                "topic": "Quantum Mechanics",
                "sources": [],
            },
        ],
    }

    async def mock_chat(*args, **kwargs):
        return json.dumps(mock_llm_response)

    monkeypatch.setattr(ollama_service, "chat_completion", mock_chat)

    req_payload = {
        "source_id": source_id,
        "title": "Quantum Mechanics Principles Quiz",
        "question_count": 2,
        "difficulty": "medium",
        "question_types": ["multiple_choice"],
        "subject": "Physics",
        "time_limit_enabled": True,
        "time_limit_seconds": 45,
    }

    response = client.post("/api/quizzes/generate", json=req_payload)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["quiz_id"].startswith("quiz_")
    assert data["title"] == "Quantum Mechanics Principles Quiz"
    assert data["status"] == "generated"
    assert data["question_count"] == 2
    assert len(data["questions"]) == 2
    assert data["questions"][0]["type"] == "multiple_choice"
    assert data["questions"][0]["correct_option_id"] == "a"
    assert len(data["questions"][0]["options"]) == 4
    # Sources must be empty for topic
    assert data["questions"][0]["sources"] == []


# -----------------------------------------------------------------------------
# 5. Topic Generation Never Fabricates Sources
# -----------------------------------------------------------------------------
def test_topic_generation_strips_hallucinated_sources(monkeypatch):
    topic_resp = source_service.create_topic_source(
        TopicSourceCreate(topic="Macroeconomics Fiscal Policy")
    )

    mock_llm_response = {
        "title": "Fiscal Policy Quiz",
        "source_type": "topic",
        "difficulty": "medium",
        "questions": [
            {
                "question_id": "q1",
                "type": "multiple_choice",
                "question_text": "What is an expansionary fiscal policy?",
                "options": [
                    {"id": "a", "text": "Increasing government spending or lowering taxes"},
                    {"id": "b", "text": "Raising taxes and cutting spending"},
                ],
                "correct_option_id": "a",
                "explanation": "Expansionary policy stimulates aggregate demand.",
                "difficulty": "medium",
                "sources": [{"source_id": "hallucinated_doc", "page": 42}],
            }
        ],
    }

    async def mock_chat(*args, **kwargs):
        return json.dumps(mock_llm_response)

    monkeypatch.setattr(ollama_service, "chat_completion", mock_chat)

    response = client.post(
        "/api/quizzes/generate",
        json={
            "source_id": topic_resp.source_id,
            "title": "Fiscal Policy Quiz",
            "question_count": 1,
            "difficulty": "medium",
            "question_types": ["multiple_choice"],
        },
    )
    assert response.status_code == 200
    data = response.json()
    # Verified stripped
    assert data["questions"][0]["sources"] == []


# -----------------------------------------------------------------------------
# 6. Text-Based Grounding
# -----------------------------------------------------------------------------
def test_text_based_grounding(monkeypatch):
    notes = (
        "Mitochondria are double-membraned cell organelles responsible for generating most of the "
        "chemical energy needed to power the cell's biochemical reactions. Chemical energy produced "
        "by the mitochondria is stored in a small molecule called adenosine triphosphate (ATP). "
        "Mitochondria contain their own small chromosomes generally inherited solely from mothers."
    )
    text_resp = source_service.create_text_source(
        TextSourceCreate(text=notes, title="Cell Biology Notes")
    )

    mock_llm_response = {
        "title": "Mitochondria Biology Quiz",
        "source_type": "text",
        "difficulty": "easy",
        "questions": [
            {
                "question_id": "q1",
                "type": "multiple_choice",
                "question_text": "What molecule stores chemical energy produced by mitochondria?",
                "options": [
                    {"id": "a", "text": "Adenosine triphosphate (ATP)"},
                    {"id": "b", "text": "Glucose"},
                    {"id": "c", "text": "Ribonucleic acid"},
                    {"id": "d", "text": "Hemoglobin"},
                ],
                "correct_option_id": "a",
                "explanation": "ATP stores chemical energy generated by the mitochondria as stated in the notes.",
                "difficulty": "easy",
                "sources": [],
            }
        ],
    }

    async def mock_chat(*args, **kwargs):
        return json.dumps(mock_llm_response)

    monkeypatch.setattr(ollama_service, "chat_completion", mock_chat)

    response = client.post(
        "/api/quizzes/generate",
        json={
            "source_id": text_resp.source_id,
            "title": "Mitochondria Biology Quiz",
            "question_count": 1,
            "difficulty": "easy",
            "question_types": ["multiple_choice"],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["questions"][0]["question_text"] == "What molecule stores chemical energy produced by mitochondria?"
    assert data["questions"][0]["sources"] == []


# -----------------------------------------------------------------------------
# 7. Insufficient Source Material Rejection
# -----------------------------------------------------------------------------
def test_insufficient_text_material_rejection():
    # Only 3 words submitted
    text_resp = source_service.create_text_source(
        TextSourceCreate(text="Photosynthesis produces oxygen.")
    )

    # Requesting 10 questions from 3 words
    response = client.post(
        "/api/quizzes/generate",
        json={
            "source_id": text_resp.source_id,
            "title": "Photosynthesis Quiz",
            "question_count": 10,
            "difficulty": "easy",
            "question_types": ["multiple_choice"],
        },
    )
    assert response.status_code == 400
    data = response.json()
    assert "insufficient" in data["error"]["message"].lower()


# -----------------------------------------------------------------------------
# 8. PDF-Based Grounding & Page Metadata Preservation
# -----------------------------------------------------------------------------
def test_pdf_based_grounding_and_page_metadata(monkeypatch):
    p1 = "Chapter 1: The laws of thermodynamics dictate the direction of physical processes."
    p2 = "Chapter 2: Entropy measures the disorder of an isolated thermodynamic system."
    pdf_bytes = create_sample_pdf_bytes([p1, p2])

    pdf_resp = source_service.create_pdf_source(pdf_bytes, "thermodynamics.pdf")
    source_id = pdf_resp.source_id

    mock_llm_response = {
        "title": "Thermodynamics Quiz",
        "source_type": "pdf",
        "difficulty": "medium",
        "questions": [
            {
                "question_id": "q1",
                "type": "multiple_choice",
                "question_text": "What does entropy measure in an isolated thermodynamic system?",
                "options": [
                    {"id": "a", "text": "Disorder of the system"},
                    {"id": "b", "text": "Total mass"},
                    {"id": "c", "text": "Electric potential"},
                    {"id": "d", "text": "Velocity of particles"},
                ],
                "correct_option_id": "a",
                "explanation": "Chapter 2 specifies that entropy measures the disorder of an isolated system.",
                "difficulty": "medium",
                "sources": [{"source_id": source_id, "page": 2}],
            }
        ],
    }

    async def mock_chat(*args, **kwargs):
        return json.dumps(mock_llm_response)

    monkeypatch.setattr(ollama_service, "chat_completion", mock_chat)

    response = client.post(
        "/api/quizzes/generate",
        json={
            "source_id": source_id,
            "title": "Thermodynamics Quiz",
            "question_count": 1,
            "difficulty": "medium",
            "question_types": ["multiple_choice"],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["questions"]) == 1
    assert data["questions"][0]["sources"] == [{"source_id": source_id, "page": 2}]


# -----------------------------------------------------------------------------
# 9. PDF Invalid Page Citations Filtered Out
# -----------------------------------------------------------------------------
def test_pdf_invalid_page_citation_filtered(monkeypatch):
    # 2 pages only
    pdf_bytes = create_sample_pdf_bytes(["Page 1 content about geology", "Page 2 content about minerals"])
    pdf_resp = source_service.create_pdf_source(pdf_bytes, "geology.pdf")
    source_id = pdf_resp.source_id

    mock_llm_response = {
        "title": "Geology Quiz",
        "source_type": "pdf",
        "difficulty": "medium",
        "questions": [
            {
                "question_id": "q1",
                "type": "multiple_choice",
                "question_text": "What is geology?",
                "options": [
                    {"id": "a", "text": "Study of Earth"},
                    {"id": "b", "text": "Study of stars"},
                ],
                "correct_option_id": "a",
                "explanation": "Geology is the study of the Earth.",
                "difficulty": "medium",
                # Page 99 does not exist (doc has 2 pages)
                "sources": [
                    {"source_id": source_id, "page": 99},
                    {"source_id": source_id, "page": 1},
                ],
            }
        ],
    }

    async def mock_chat(*args, **kwargs):
        return json.dumps(mock_llm_response)

    monkeypatch.setattr(ollama_service, "chat_completion", mock_chat)

    response = client.post(
        "/api/quizzes/generate",
        json={
            "source_id": source_id,
            "title": "Geology Quiz",
            "question_count": 1,
            "difficulty": "medium",
            "question_types": ["multiple_choice"],
        },
    )
    assert response.status_code == 200
    data = response.json()
    # Only page 1 remains
    assert data["questions"][0]["sources"] == [{"source_id": source_id, "page": 1}]


# -----------------------------------------------------------------------------
# 10. True/False Questions Handling
# -----------------------------------------------------------------------------
def test_true_false_questions(monkeypatch):
    topic_resp = source_service.create_topic_source(TopicSourceCreate(topic="Solar System Planets"))

    mock_llm_response = {
        "title": "Solar System True/False Quiz",
        "source_type": "topic",
        "difficulty": "easy",
        "questions": [
            {
                "question_id": "q1",
                "type": "true_false",
                "question_text": "Jupiter is the largest planet in our solar system.",
                "options": [
                    {"id": "a", "text": "True"},
                    {"id": "b", "text": "False"},
                ],
                "correct_option_id": "a",
                "expected_answer": None,
                "explanation": "Jupiter is indeed the largest planet in the solar system.",
                "difficulty": "easy",
                "sources": [],
            }
        ],
    }

    async def mock_chat(*args, **kwargs):
        return json.dumps(mock_llm_response)

    monkeypatch.setattr(ollama_service, "chat_completion", mock_chat)

    response = client.post(
        "/api/quizzes/generate",
        json={
            "source_id": topic_resp.source_id,
            "title": "Solar System True/False Quiz",
            "question_count": 1,
            "difficulty": "easy",
            "question_types": ["true_false"],
        },
    )
    assert response.status_code == 200
    data = response.json()
    q = data["questions"][0]
    assert q["type"] == "true_false"
    assert len(q["options"]) == 2
    assert q["correct_option_id"] == "a"


# -----------------------------------------------------------------------------
# 11. Short Answer Questions Handling
# -----------------------------------------------------------------------------
def test_short_answer_questions(monkeypatch):
    topic_resp = source_service.create_topic_source(TopicSourceCreate(topic="World Geography"))

    mock_llm_response = {
        "title": "World Geography Short Answer Quiz",
        "source_type": "topic",
        "difficulty": "medium",
        "questions": [
            {
                "question_id": "q1",
                "type": "short_answer",
                "question_text": "What is the capital city of Australia?",
                "options": [],
                "correct_option_id": None,
                "expected_answer": "Canberra",
                "explanation": "Canberra was selected as the compromise capital of Australia in 1908.",
                "difficulty": "medium",
                "sources": [],
            }
        ],
    }

    async def mock_chat(*args, **kwargs):
        return json.dumps(mock_llm_response)

    monkeypatch.setattr(ollama_service, "chat_completion", mock_chat)

    response = client.post(
        "/api/quizzes/generate",
        json={
            "source_id": topic_resp.source_id,
            "title": "World Geography Short Answer Quiz",
            "question_count": 1,
            "difficulty": "medium",
            "question_types": ["short_answer"],
        },
    )
    assert response.status_code == 200
    data = response.json()
    q = data["questions"][0]
    assert q["type"] == "short_answer"
    assert q["expected_answer"] == "Canberra"
    assert q["options"] == []


# -----------------------------------------------------------------------------
# 12. Question Count Truncation & Duplicate Detection
# -----------------------------------------------------------------------------
def test_duplicate_question_detection_and_count_limit(monkeypatch):
    topic_resp = source_service.create_topic_source(TopicSourceCreate(topic="Chemistry Atoms"))

    mock_llm_response = {
        "title": "Atoms Quiz",
        "source_type": "topic",
        "difficulty": "easy",
        "questions": [
            {
                "question_id": "q1",
                "type": "multiple_choice",
                "question_text": "What particle has a positive electric charge?",
                "options": [
                    {"id": "a", "text": "Proton"},
                    {"id": "b", "text": "Electron"},
                ],
                "correct_option_id": "a",
                "explanation": "Protons have positive charge.",
                "difficulty": "easy",
            },
            # Exact duplicate question text
            {
                "question_id": "q2",
                "type": "multiple_choice",
                "question_text": "What particle has a positive electric charge?",
                "options": [
                    {"id": "a", "text": "Proton"},
                    {"id": "b", "text": "Neutron"},
                ],
                "correct_option_id": "a",
                "explanation": "Protons have positive charge.",
                "difficulty": "easy",
            },
            {
                "question_id": "q3",
                "type": "multiple_choice",
                "question_text": "What particle has no electric charge?",
                "options": [
                    {"id": "a", "text": "Neutron"},
                    {"id": "b", "text": "Proton"},
                ],
                "correct_option_id": "a",
                "explanation": "Neutrons are electrically neutral.",
                "difficulty": "easy",
            },
        ],
    }

    async def mock_chat(*args, **kwargs):
        return json.dumps(mock_llm_response)

    monkeypatch.setattr(ollama_service, "chat_completion", mock_chat)

    # Request count 2
    response = client.post(
        "/api/quizzes/generate",
        json={
            "source_id": topic_resp.source_id,
            "title": "Atoms Quiz",
            "question_count": 2,
            "difficulty": "easy",
            "question_types": ["multiple_choice"],
        },
    )
    assert response.status_code == 200
    data = response.json()
    # The duplicate q2 was skipped, leaving q1 and q3, exactly count 2
    assert len(data["questions"]) == 2
    assert data["questions"][0]["question_id"] == "q1"
    assert data["questions"][1]["question_id"] == "q2"
    assert data["questions"][0]["question_text"] != data["questions"][1]["question_text"]


# -----------------------------------------------------------------------------
# 13. Malformed JSON Retry & Recovery
# -----------------------------------------------------------------------------
def test_malformed_json_retry_recovery(monkeypatch):
    topic_resp = source_service.create_topic_source(TopicSourceCreate(topic="Software Testing"))

    call_count = 0

    valid_response = {
        "title": "Software Testing Quiz",
        "source_type": "topic",
        "difficulty": "medium",
        "questions": [
            {
                "question_id": "q1",
                "type": "multiple_choice",
                "question_text": "What is unit testing?",
                "options": [
                    {"id": "a", "text": "Testing individual software components in isolation"},
                    {"id": "b", "text": "Testing the entire system end-to-end"},
                ],
                "correct_option_id": "a",
                "explanation": "Unit tests isolate individual functions or classes.",
                "difficulty": "medium",
            }
        ],
    }

    async def mock_chat(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            # First attempt: invalid truncated JSON
            return "Here is your quiz: { \"title\": \"Software Testing Quiz\", \"questions\": ["
        # Second attempt (after correction prompt): valid JSON
        return json.dumps(valid_response)

    monkeypatch.setattr(ollama_service, "chat_completion", mock_chat)

    response = client.post(
        "/api/quizzes/generate",
        json={
            "source_id": topic_resp.source_id,
            "title": "Software Testing Quiz",
            "question_count": 1,
            "difficulty": "medium",
            "question_types": ["multiple_choice"],
        },
    )
    assert response.status_code == 200
    assert call_count == 2
    data = response.json()
    assert len(data["questions"]) == 1


# -----------------------------------------------------------------------------
# 14. Malformed JSON Exhaustion Error
# -----------------------------------------------------------------------------
def test_malformed_json_exhaustion(monkeypatch):
    topic_resp = source_service.create_topic_source(TopicSourceCreate(topic="Database Systems"))

    async def mock_chat(*args, **kwargs):
        return "This is pure conversational output without any JSON { broken ... "

    monkeypatch.setattr(ollama_service, "chat_completion", mock_chat)

    response = client.post(
        "/api/quizzes/generate",
        json={
            "source_id": topic_resp.source_id,
            "title": "Database Systems Quiz",
            "question_count": 1,
            "difficulty": "medium",
            "question_types": ["multiple_choice"],
        },
    )
    assert response.status_code == 502
    data = response.json()
    assert "InvalidModelOutputError" in data["error"]["type"]


# -----------------------------------------------------------------------------
# 15. Timeout and Rate Limit Handling
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_timeout_and_rate_limit_handling():
    # Test timeout error conversion
    async def mock_timeout_post(*args, **kwargs):
        raise httpx.TimeoutException("Read timed out")

    mock_client = httpx.AsyncClient(transport=httpx.MockTransport(lambda req: None))
    mock_client.post = mock_timeout_post  # type: ignore

    srv = OllamaService(api_key="valid-key", client=mock_client)
    with pytest.raises(OllamaTimeoutError):
        await srv.chat_completion(messages=[{"role": "user", "content": "hi"}])

    # Test 429 rate limit conversion
    def rate_limit_handler(req: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code=429, json={"error": "rate limit reached"})

    srv_rl = OllamaService(
        api_key="valid-key",
        client=httpx.AsyncClient(transport=httpx.MockTransport(rate_limit_handler)),
    )
    with pytest.raises(OllamaRateLimitError):
        await srv_rl.chat_completion(messages=[{"role": "user", "content": "hi"}])

    # Test 401 auth failure conversion
    def auth_fail_handler(req: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code=401, json={"error": "unauthorized"})

    srv_auth = OllamaService(
        api_key="bad-key",
        client=httpx.AsyncClient(transport=httpx.MockTransport(auth_fail_handler)),
    )
    with pytest.raises(OllamaAuthenticationError):
        await srv_auth.chat_completion(messages=[{"role": "user", "content": "hi"}])


# -----------------------------------------------------------------------------
# 16. Both /api/quiz/generate and /api/quizzes/generate Routes Available
# -----------------------------------------------------------------------------
def test_both_route_prefixes_functional(monkeypatch):
    topic_resp = source_service.create_topic_source(TopicSourceCreate(topic="Route Test Topic"))

    mock_llm_response = {
        "title": "Route Test",
        "source_type": "topic",
        "difficulty": "easy",
        "questions": [
            {
                "question_id": "q1",
                "type": "multiple_choice",
                "question_text": "Is this a route test?",
                "options": [
                    {"id": "a", "text": "Yes"},
                    {"id": "b", "text": "No"},
                ],
                "correct_option_id": "a",
                "explanation": "Yes, testing routing aliases.",
                "difficulty": "easy",
            }
        ],
    }

    async def mock_chat(*args, **kwargs):
        return json.dumps(mock_llm_response)

    monkeypatch.setattr(ollama_service, "chat_completion", mock_chat)

    body = {
        "source_id": topic_resp.source_id,
        "title": "Route Test",
        "question_count": 1,
        "difficulty": "easy",
        "question_types": ["multiple_choice"],
    }

    # Singular prefix
    r1 = client.post("/api/quiz/generate", json=body)
    assert r1.status_code == 200

    # Plural prefix
    r2 = client.post("/api/quizzes/generate", json=body)
    assert r2.status_code == 200


# -----------------------------------------------------------------------------
# 17. Optional Live Ollama Cloud Integration Test
# -----------------------------------------------------------------------------
@pytest.mark.skipif(
    not os.getenv("OLLAMA_API_KEY") or not os.getenv("RUN_LIVE_OLLAMA_TEST"),
    reason="RUN_LIVE_OLLAMA_TEST not set or OLLAMA_API_KEY not configured",
)
@pytest.mark.asyncio
async def test_live_ollama_cloud_quiz_generation():
    """Optional end-to-end integration test against live Ollama Cloud Nemotron 3."""
    topic_resp = source_service.create_topic_source(
        TopicSourceCreate(topic="Basic Python Syntax", subject="Computer Science")
    )
    req = QuizGenerationRequest(
        source_id=topic_resp.source_id,
        title="Live Python Syntax Quiz",
        question_count=2,
        difficulty=DifficultyLevel.EASY,
        question_types=[QuestionType.MULTIPLE_CHOICE],
    )
    resp = await quiz_generation_service.generate_quiz(req)
    assert resp.status == "generated"
    assert resp.question_count == 2
    assert len(resp.questions) == 2
