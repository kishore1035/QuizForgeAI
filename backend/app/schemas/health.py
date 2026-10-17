from pydantic import BaseModel, Field


class HealthStatusResponse(BaseModel):
    """Schema for /api/health response."""
    status: str = Field(default="ok", examples=["ok"])
    app_name: str = Field(..., examples=["QuizForge AI Backend"])
    version: str = Field(..., examples=["0.1.0"])
    environment: str = Field(..., examples=["development"])
    ai_service_configured: bool = Field(..., description="Indicates if AI service credentials are set")
    model_target: str = Field(..., examples=["nemotron-3-nano:30b-cloud"])
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp")
