from fastapi import APIRouter, UploadFile, File, status
from app.core.errors import AppError
from app.schemas.source import (
    SourceResponse,
    TopicSourceCreate,
    TextSourceCreate,
)
from app.services.source_service import source_service

router = APIRouter(prefix="/sources", tags=["Sources"])


@router.post("/topic", response_model=SourceResponse, status_code=status.HTTP_201_CREATED, summary="Register a Topic source")
async def create_topic_source(payload: TopicSourceCreate) -> SourceResponse:
    """Validate and register a topic or concept name as a quiz generation source."""
    return source_service.create_topic_source(payload)


@router.post("/text", response_model=SourceResponse, status_code=status.HTTP_201_CREATED, summary="Register a Text source")
async def create_text_source(payload: TextSourceCreate) -> SourceResponse:
    """Validate and register pasted notes, textbook content, or study material."""
    return source_service.create_text_source(payload)


@router.post("/upload", response_model=SourceResponse, status_code=status.HTTP_201_CREATED, summary="Upload and extract PDF source")
async def upload_pdf_source(file: UploadFile = File(...)) -> SourceResponse:
    """Upload a PDF file, extract text page-by-page via PyMuPDF, and register the source."""
    if not file.filename:
        raise AppError("Uploaded file must have a filename.", status_code=400)

    # Basic filename extension check before reading bytes
    if not file.filename.lower().endswith(".pdf"):
        raise AppError(
            f"File '{file.filename}' is not a PDF. Only .pdf documents are accepted.",
            status_code=400,
            details={"filename": file.filename},
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise AppError("Uploaded PDF file is completely empty (0 bytes).", status_code=400)

    return source_service.create_pdf_source(file_bytes, file.filename)


@router.get("/{source_id}", response_model=SourceResponse, summary="Retrieve source metadata")
async def get_source(source_id: str) -> SourceResponse:
    """Retrieve metadata, page counts, word counts, and status for a prepared source."""
    return source_service.get_source(source_id)


@router.delete("/{source_id}", summary="Delete a source")
async def delete_source(source_id: str):
    """Safely delete a source if it is not in use by any quiz."""
    source_service.delete_source(source_id)
    return {"success": True, "message": f"Source '{source_id}' was deleted successfully."}

