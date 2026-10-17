import json
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration settings loaded from environment variables."""

    # Server Settings
    APP_NAME: str = "QuizForge AI Backend"
    APP_VERSION: str = "0.3.0"
    ENVIRONMENT: str = Field(default="development", description="Environment mode: development, staging, production")
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    # CORS Configuration
    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.strip().startswith("["):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    # Source Processing Limits
    MAX_UPLOAD_SIZE_BYTES: int = Field(
        default=15 * 1024 * 1024,
        description="Maximum upload size in bytes (15MB default)",
    )
    MAX_TEXT_CHAR_COUNT: int = Field(
        default=150_000,
        description="Maximum characters allowed for pasted text input (approx 25k words)",
    )
    STORAGE_DIR: str = Field(
        default="storage",
        description="Directory for temporary uploaded source files",
    )
    DATABASE_URL: str = Field(
        default="sqlite:///./data/quizforge.db",
        description="Database connection URL (defaults to SQLite in ./data/quizforge.db)",
    )
    UPLOAD_DIR: str = Field(
        default="data/uploads",
        description="Directory for persistent uploaded source files",
    )

    # Ollama Cloud / Nemotron 3 Nano 30B Cloud Configuration
    # Note: Model configuration is managed server-side. Never expose API key to client.
    OLLAMA_API_KEY: str = Field(default="", description="Ollama Cloud API Key (server-side only)")
    OLLAMA_BASE_URL: str = Field(default="https://ollama.com", description="Base URL for Ollama Cloud service")
    OLLAMA_MODEL: str = Field(
        default="nemotron-3-nano:30b-cloud",
        description="Target AI model identifier for quiz generation",
    )
    OLLAMA_TIMEOUT_SECONDS: int = Field(
        default=180,
        description="Ollama Cloud API request timeout in seconds",
    )
    OLLAMA_MAX_RETRIES: int = Field(
        default=1,
        description="Max retries for JSON structured output correction",
    )

    @property
    def normalized_ollama_chat_url(self) -> str:
        clean = (self.OLLAMA_BASE_URL or "https://ollama.com").strip().rstrip("/")
        if clean.endswith("/api"):
            return f"{clean}/chat"
        return f"{clean}/api/chat"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
