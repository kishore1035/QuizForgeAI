from fastapi import APIRouter
from app.schemas.quiz import (
    QuizGenerationRequest,
    QuizGenerationReadyResponse,
    GeneratedQuizResponse,
)
from app.services.quiz_request_service import quiz_request_service
from app.services.quiz_generation_service import quiz_generation_service

router = APIRouter(tags=["Quiz"])


@router.post(
    "/validate-request",
    response_model=QuizGenerationReadyResponse,
    summary="Validate quiz configuration and prepare for generation",
)
async def validate_generation_request(payload: QuizGenerationRequest) -> QuizGenerationReadyResponse:
    """
    Validate that the generation payload has an existing valid source,
    conforms to difficulty/question count bounds, and is ready for the AI engine.
    """
    return quiz_request_service.prepare_and_validate(payload)


@router.post(
    "/generate",
    response_model=GeneratedQuizResponse,
    summary="Generate a validated quiz using Ollama Cloud Nemotron 3 Nano",
)
async def generate_quiz(payload: QuizGenerationRequest) -> GeneratedQuizResponse:
    """
    Generate a full educational quiz with validated questions grounded
    in the chosen Topic, Text, or PDF source.
    """
    return await quiz_generation_service.generate_quiz(payload)
