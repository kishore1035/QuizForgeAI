from abc import ABC, abstractmethod
from typing import Optional, Union
from app.core.config import settings
from app.schemas.quiz import (
    QuizGenerationRequest,
    GeneratedQuizResponse,
    QuizResponse,
)
from app.services.ollama_service import ollama_service, OllamaService


class AIServiceInterface(ABC):
    """Abstract interface for AI model generation services."""

    @abstractmethod
    async def is_configured(self) -> bool:
        """Check if AI credentials and endpoints are correctly configured."""
        pass

    @abstractmethod
    async def generate_quiz(
        self, request: QuizGenerationRequest
    ) -> Union[GeneratedQuizResponse, QuizResponse]:
        """Generate a quiz structure from input parameters."""
        pass


class OllamaCloudService(AIServiceInterface):
    """
    Ollama Cloud Service implementation for Nemotron 3 Nano 30B Cloud.
    Handles communication with Ollama Cloud API server-side.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
    ):
        self._service = OllamaService(
            api_key=api_key,
            base_url=base_url,
            model=model,
        )

    async def is_configured(self) -> bool:
        """Returns True if the required base URL, model, and API key are configured."""
        return await self._service.is_configured()

    async def generate_quiz(self, request: QuizGenerationRequest) -> GeneratedQuizResponse:
        """Delegate generation to the QuizGenerationService."""
        from app.services.quiz_generation_service import quiz_generation_service
        return await quiz_generation_service.generate_quiz(request)


# Singleton service instance
ai_service = OllamaCloudService()
