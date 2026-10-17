from typing import Any, Dict, Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppError(Exception):
    """Base application exception."""

    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class InvalidSourceError(AppError):
    def __init__(self, message: str = "Invalid or expired source ID.", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=status.HTTP_404_NOT_FOUND, details=details)


class SourceNotReadyError(AppError):
    def __init__(self, message: str = "Source is not in ready state for quiz generation.", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=status.HTTP_400_BAD_REQUEST, details=details)


class InsufficientSourceMaterialError(AppError):
    def __init__(self, message: str = "Provided source material is insufficient to generate the requested questions.", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=status.HTTP_400_BAD_REQUEST, details=details)


class MissingOllamaApiKeyError(AppError):
    def __init__(self, message: str = "Ollama Cloud API key is not configured. Please set OLLAMA_API_KEY in the backend environment.", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=status.HTTP_400_BAD_REQUEST, details=details)


class OllamaAuthenticationError(AppError):
    def __init__(self, message: str = "Ollama Cloud authentication failed. Please verify your OLLAMA_API_KEY.", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=status.HTTP_401_UNAUTHORIZED, details=details)


class OllamaRateLimitError(AppError):
    def __init__(self, message: str = "Ollama Cloud rate limit exceeded. Please try again later.", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=status.HTTP_429_TOO_MANY_REQUESTS, details=details)


class OllamaTimeoutError(AppError):
    def __init__(self, message: str = "Ollama Cloud request timed out. Please try again or request fewer questions.", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=status.HTTP_504_GATEWAY_TIMEOUT, details=details)


class OllamaGenerationError(AppError):
    def __init__(self, message: str = "Ollama Cloud generation failed.", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=status.HTTP_502_BAD_GATEWAY, details=details)


class InvalidModelOutputError(AppError):
    def __init__(self, message: str = "Failed to parse and validate AI-generated quiz output.", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=status.HTTP_502_BAD_GATEWAY, details=details)


class QuizNotFoundError(AppError):
    def __init__(self, message: str = "The requested quiz was not found.", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=status.HTTP_404_NOT_FOUND, details=details)


class AttemptNotFoundError(AppError):
    def __init__(self, message: str = "The requested quiz attempt was not found.", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=status.HTTP_404_NOT_FOUND, details=details)


class AttemptAlreadySubmittedError(AppError):
    def __init__(self, message: str = "This attempt has already been submitted and finalized.", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=status.HTTP_400_BAD_REQUEST, details=details)


class AttemptNotSubmittedError(AppError):
    def __init__(self, message: str = "This attempt has not been submitted yet.", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=status.HTTP_400_BAD_REQUEST, details=details)


class InvalidAttemptStateError(AppError):
    def __init__(self, message: str = "Invalid attempt state.", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=status.HTTP_400_BAD_REQUEST, details=details)


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "message": exc.message,
                "type": exc.__class__.__name__,
                "details": exc.details,
            },
        },
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "message": exc.detail if isinstance(exc.detail, str) else "HTTP Exception",
                "type": "HTTPException",
                "details": exc.detail if isinstance(exc.detail, dict) else {},
            },
        },
    )


from fastapi.encoders import jsonable_encoder


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "message": "Validation error in request parameters or body",
                "type": "ValidationError",
                "details": jsonable_encoder(exc.errors()),
            },
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "message": "An unexpected server error occurred.",
                "type": "InternalServerError",
                "details": {},
            },
        },
    )
