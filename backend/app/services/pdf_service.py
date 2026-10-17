import re
from typing import Dict, Any, List
import pymupdf as fitz
from app.core.errors import AppError


class PDFProcessingService:
    """Service for extracting and validating text from PDF documents using PyMuPDF."""

    @staticmethod
    def validate_pdf_signature(file_bytes: bytes) -> bool:
        """Verify standard PDF magic number header (%PDF-)."""
        if len(file_bytes) < 5:
            return False
        return file_bytes[:5] == b"%PDF-"

    @classmethod
    def extract_text(cls, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Extract text page by page from raw PDF bytes.
        Preserves page numbers and extracts page-level metadata.
        """
        if not cls.validate_pdf_signature(file_bytes):
            raise AppError(
                message=f"File '{filename}' is not a valid PDF document (missing %PDF- signature).",
                status_code=400,
                details={"filename": filename, "error": "invalid_magic_bytes"},
            )

        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
        except Exception as e:
            raise AppError(
                message=f"Failed to parse PDF '{filename}'. File may be corrupted or encrypted.",
                status_code=400,
                details={"filename": filename, "error": str(e)},
            )

        try:
            page_count = len(doc)
            if page_count == 0:
                raise AppError(
                    message=f"PDF '{filename}' contains 0 pages.",
                    status_code=400,
                    details={"filename": filename},
                )

            pages_data: List[Dict[str, Any]] = []
            full_text_chunks: List[str] = []
            total_words = 0
            total_chars = 0

            for page_index in range(page_count):
                page = doc.load_page(page_index)
                page_text = page.get_text("text") or ""
                # Normalize excessive blank lines and spaces
                normalized_page_text = re.sub(r"\n{3,}", "\n\n", page_text).strip()

                words = normalized_page_text.split()
                word_count = len(words)
                char_count = len(normalized_page_text)

                total_words += word_count
                total_chars += char_count

                preview_snippet = (
                    normalized_page_text[:180].replace("\n", " ").strip() + "..."
                    if len(normalized_page_text) > 180
                    else normalized_page_text.replace("\n", " ").strip()
                )

                pages_data.append({
                    "page_number": page_index + 1,
                    "char_count": char_count,
                    "word_count": word_count,
                    "preview_snippet": preview_snippet,
                    "text": normalized_page_text,
                })
                if normalized_page_text:
                    full_text_chunks.append(f"[Page {page_index + 1}]\n{normalized_page_text}")

            full_text = "\n\n".join(full_text_chunks).strip()

            # Reject scanned PDFs or image-only documents without extractable text
            if total_words == 0 or not full_text:
                raise AppError(
                    message=(
                        f"No extractable text found in '{filename}'. "
                        "This document appears to be scanned or contains only images. "
                        "OCR processing is required to extract text from image-only PDFs."
                    ),
                    status_code=400,
                    details={"filename": filename, "page_count": page_count, "word_count": 0},
                )

            return {
                "filename": filename,
                "page_count": page_count,
                "total_words": total_words,
                "total_chars": total_chars,
                "pages": pages_data,
                "full_text": full_text,
            }
        finally:
            doc.close()


pdf_service = PDFProcessingService()
