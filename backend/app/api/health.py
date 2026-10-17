from datetime import datetime, timezone
from fastapi import APIRouter
from app.core.config import settings
from app.schemas.health import HealthStatusResponse
from app.services.ai_service import ai_service

router = APIRouter()


@router.get("/health", response_model=HealthStatusResponse, summary="Service Health Check")
async def health_check() -> HealthStatusResponse:
    """
    Health check endpoint returning system status, version, and configuration readiness.
    """
    ai_ready = await ai_service.is_configured()
    return HealthStatusResponse(
        status="ok",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        ai_service_configured=ai_ready,
        model_target=settings.OLLAMA_MODEL,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
