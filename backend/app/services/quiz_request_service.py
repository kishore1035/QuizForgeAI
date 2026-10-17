from app.core.errors import AppError
from app.schemas.quiz import QuizGenerationRequest, QuizGenerationReadyResponse
from app.services.source_service import source_service


class QuizRequestService:
    """Service validating quiz generation configurations and preparing requests for AI execution."""

    @staticmethod
    def prepare_and_validate(request: QuizGenerationRequest) -> QuizGenerationReadyResponse:
        """
        Authoritatively validate that the referenced source exists,
        is ready, and parameters conform to quiz generation rules.
        """
        source = source_service.get_source(request.source_id)

        if source.status != "ready":
            raise AppError(
                message=f"Source '{request.source_id}' is not in ready state (current: {source.status}).",
                status_code=400,
                details={"source_id": request.source_id, "status": source.status},
            )

        return QuizGenerationReadyResponse(
            valid=True,
            status="generation_ready",
            message=f"Quiz configuration for '{request.title}' is valid and ready for Nemotron 3 Nano generation.",
            generation_payload=request,
            source_title=source.title,
            source_type=source.source_type.value,
        )


quiz_request_service = QuizRequestService()
