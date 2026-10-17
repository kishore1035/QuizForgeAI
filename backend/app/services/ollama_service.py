import json
import logging
from typing import Any, Dict, List, Optional
import httpx

from app.core.config import settings
from app.core.errors import (
    MissingOllamaApiKeyError,
    OllamaAuthenticationError,
    OllamaRateLimitError,
    OllamaTimeoutError,
    OllamaGenerationError,
)

logger = logging.getLogger(__name__)


class OllamaService:
    """
    Dedicated LLM Service for Ollama Cloud hosting Nemotron 3 Nano 30B Cloud.
    Handles authenticated communication with the Ollama Cloud chat endpoint.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        timeout_seconds: Optional[int] = None,
        client: Optional[httpx.AsyncClient] = None,
    ):
        self.api_key = api_key if api_key is not None else settings.OLLAMA_API_KEY
        self.base_url = (base_url if base_url is not None else settings.OLLAMA_BASE_URL).strip().rstrip("/")
        self.model = model if model is not None else settings.OLLAMA_MODEL
        self.timeout_seconds = (
            timeout_seconds if timeout_seconds is not None else settings.OLLAMA_TIMEOUT_SECONDS
        )
        self._client = client

    @property
    def chat_url(self) -> str:
        """Derive the normalized Ollama chat completion URL."""
        if self.base_url.endswith("/api"):
            return f"{self.base_url}/chat"
        return f"{self.base_url}/api/chat"

    def get_auth_headers(self) -> Dict[str, str]:
        """Construct authentication and request headers without exposing keys in logs."""
        clean_key = (self.api_key or "").strip()
        return {
            "Authorization": f"Bearer {clean_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def is_configured(self) -> bool:
        """Check whether the service has valid non-empty configuration credentials."""
        clean_key = (self.api_key or "").strip()
        return bool(clean_key and self.base_url and self.model)

    def set_client(self, client: Optional[httpx.AsyncClient]) -> None:
        """Inject an HTTP client for testing or connection pooling."""
        self._client = client

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        format_type: Optional[str] = "json",
        temperature: float = 0.2,
    ) -> str:
        """
        Send a chat completion request to the Ollama Cloud endpoint.
        Returns the raw assistant response content string.
        """
        clean_key = (self.api_key or "").strip()
        if not clean_key:
            raise MissingOllamaApiKeyError(
                "Ollama Cloud API key is not configured. Please set OLLAMA_API_KEY in the backend environment."
            )

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature,
            },
        }

        if format_type:
            payload["format"] = format_type

        headers = self.get_auth_headers()
        url = self.chat_url

        try:
            if self._client:
                response = await self._client.post(
                    url,
                    json=payload,
                    headers=headers,
                    timeout=float(self.timeout_seconds),
                )
            else:
                async with httpx.AsyncClient(timeout=float(self.timeout_seconds)) as client:
                    response = await client.post(
                        url,
                        json=payload,
                        headers=headers,
                    )

            if response.status_code in (401, 403):
                raise OllamaAuthenticationError(
                    "Ollama Cloud authentication failed. Please verify your OLLAMA_API_KEY.",
                    details={"status_code": response.status_code},
                )
            elif response.status_code == 429:
                raise OllamaRateLimitError(
                    "Ollama Cloud rate limit exceeded. Please try again later.",
                    details={"status_code": 429},
                )
            elif response.is_error:
                error_body = response.text[:500]
                raise OllamaGenerationError(
                    f"Ollama Cloud API returned error (HTTP {response.status_code}): {error_body}",
                    details={"status_code": response.status_code},
                )

            data = response.json()
            if not isinstance(data, dict):
                raise OllamaGenerationError(
                    "Unexpected response structure from Ollama Cloud (expected JSON object).",
                    details={"response_type": type(data).__name__},
                )

            if "error" in data and data["error"]:
                raise OllamaGenerationError(
                    f"Ollama Cloud reported error: {data['error']}",
                    details={"error": data["error"]},
                )

            content = data.get("message", {}).get("content", "")
            if not content:
                raise OllamaGenerationError(
                    "Ollama Cloud returned an empty message content.",
                    details={"response_keys": list(data.keys())},
                )

            return content

        except httpx.TimeoutException as exc:
            logger.warning("Ollama Cloud request timed out after %ds", self.timeout_seconds)
            raise OllamaTimeoutError(
                f"Ollama Cloud request timed out after {self.timeout_seconds} seconds. "
                "Please reduce the requested question count or try again.",
                details={"timeout_seconds": self.timeout_seconds},
            ) from exc
        except (MissingOllamaApiKeyError, OllamaAuthenticationError, OllamaRateLimitError, OllamaTimeoutError, OllamaGenerationError):
            raise
        except httpx.RequestError as exc:
            logger.error("Connection failure to Ollama Cloud: %s", exc)
            raise OllamaGenerationError(
                f"Failed to communicate with Ollama Cloud endpoint: {str(exc)}",
                details={"url": url},
            ) from exc


ollama_service = OllamaService()
