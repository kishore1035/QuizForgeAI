import json
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import settings
from app.core.errors import (
    AppError,
    InvalidSourceError,
    SourceNotReadyError,
    InsufficientSourceMaterialError,
    InvalidModelOutputError,
    OllamaGenerationError,
)
from app.schemas.quiz import (
    QuizGenerationRequest,
    QuestionType,
    DifficultyLevel,
    GeneratedQuestion,
    QuizQuestionOption,
    SourceReference,
    GeneratedQuizPayload,
    GeneratedQuizSettings,
    GeneratedQuizSourceMeta,
    GeneratedQuizResponse,
)
from app.schemas.source import SourceType
from app.services.source_service import source_service
from app.services.ollama_service import ollama_service, OllamaService
from app.services.quiz_store import quiz_store
from app.services.quiz_prompts import (
    SYSTEM_PROMPT,
    build_topic_prompt,
    build_text_prompt,
    build_pdf_section_prompt,
    build_correction_prompt,
)

logger = logging.getLogger(__name__)


def extract_json_from_llm_response(text: str) -> str:
    """
    Extract clean JSON string from LLM output, handling markdown blocks,
    preceding/trailing prose, and <think>...</think> tags.
    """
    cleaned = text.strip()

    # Strip thinking tags if present (e.g., deepseek or reasoning models)
    cleaned = re.sub(r"<think>[\s\S]*?</think>", "", cleaned, flags=re.IGNORECASE).strip()

    # If wrapped in ```json ... ``` or ``` ... ```
    codeblock_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, re.IGNORECASE)
    if codeblock_match:
        cleaned = codeblock_match.group(1).strip()

    # Locate outermost JSON braces
    start_idx = cleaned.find("{")
    end_idx = cleaned.rfind("}")

    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        return cleaned[start_idx : end_idx + 1]

    return cleaned


def normalize_string_key(s: str) -> str:
    """Normalize string for duplicate detection."""
    return re.sub(r"[^\w\s]", "", s.lower()).strip()


class QuizGenerationService:
    """
    Authoritative Quiz Generation Engine orchestrating:
    Source validation -> Prompt creation -> Nemotron 3 Nano generation -> Structured validation.
    """

    def __init__(self, llm_service: Optional[OllamaService] = None):
        self._llm = llm_service or ollama_service

    async def generate_quiz(self, request: QuizGenerationRequest) -> GeneratedQuizResponse:
        """
        Main entry point for generating an AI quiz from a validated source and configuration.
        """
        # 1. Fetch and verify source existence and readiness
        source_raw = source_service.get_source_raw(request.source_id)
        if source_raw.get("status") != "ready":
            raise SourceNotReadyError(
                f"Source '{request.source_id}' is not in ready state.",
                details={"source_id": request.source_id, "status": source_raw.get("status")},
            )

        source_type = source_raw["source_type"]
        if isinstance(source_type, str):
            try:
                source_type = SourceType(source_type)
            except ValueError:
                pass

        # 2. Source-aware generation
        if source_type == SourceType.TOPIC:
            candidate_questions = await self._generate_topic_quiz(request, source_raw)
        elif source_type == SourceType.TEXT:
            candidate_questions = await self._generate_text_quiz(request, source_raw)
        elif source_type == SourceType.PDF:
            candidate_questions = await self._generate_pdf_quiz(request, source_raw)
        else:
            raise AppError(
                f"Unsupported source type '{source_type}' for quiz generation.",
                status_code=400,
            )

        # 3. Final validation, deduplication, and count alignment
        validated_questions = self._finalize_questions(
            candidate_questions=candidate_questions,
            request=request,
            source_raw=source_raw,
        )

        # 4. Construct API response payload
        quiz_id = f"quiz_{uuid.uuid4().hex[:12]}"
        settings_meta = GeneratedQuizSettings(
            difficulty=request.difficulty.value,
            question_types=[qt.value for qt in request.question_types],
            time_limit_enabled=request.time_limit_enabled,
            time_limit_seconds=request.time_limit_seconds,
            subject=request.subject,
            exam=request.exam,
            academic_year=request.academic_year,
        )

        source_meta = GeneratedQuizSourceMeta(
            source_id=request.source_id,
            source_type=str(source_raw["source_type"].value if hasattr(source_raw["source_type"], "value") else source_raw["source_type"]),
            title=source_raw.get("title", request.title),
            filename=source_raw.get("filename"),
            page_count=source_raw.get("page_count"),
            word_count=source_raw.get("word_count"),
        )

        quiz_response = GeneratedQuizResponse(
            quiz_id=quiz_id,
            title=request.title,
            status="generated",
            question_count=len(validated_questions),
            questions=validated_questions,
            settings=settings_meta,
            source_metadata=source_meta,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        quiz_store.register_quiz(quiz_response)
        return quiz_response

    # -------------------------------------------------------------------------
    # SOURCE GENERATION ROUTINES
    # -------------------------------------------------------------------------

    async def _generate_topic_quiz(
        self, request: QuizGenerationRequest, source_raw: Dict[str, Any]
    ) -> List[GeneratedQuestion]:
        """Generate questions grounded in broad domain knowledge for a topic."""
        topic_name = source_raw.get("title") or source_raw.get("content") or request.title
        prompt = build_topic_prompt(
            request=request,
            source_title=topic_name,
            additional_context=source_raw.get("additional_instructions"),
        )

        payload = await self._call_model_with_validation(
            prompt=prompt,
            request=request,
            source_raw=source_raw,
        )
        return payload.questions

    async def _generate_text_quiz(
        self, request: QuizGenerationRequest, source_raw: Dict[str, Any]
    ) -> List[GeneratedQuestion]:
        """Generate questions strictly grounded in pasted study notes."""
        text = source_raw.get("content", "").strip()
        word_count = source_raw.get("word_count", len(text.split()))

        # Check sufficiency: at least 8-10 words per question or 25 total
        min_required_words = max(10, request.question_count * 8)
        if word_count < min_required_words:
            raise InsufficientSourceMaterialError(
                f"The provided study material contains only {word_count} words, which is insufficient "
                f"to generate {request.question_count} meaningful questions without fabrication. "
                "Please provide more detailed material or reduce the requested question count.",
                details={"word_count": word_count, "min_required_words": min_required_words},
            )

        # For very long text (> 25k characters), split into 2 sections to prevent model truncations
        if len(text) > 25_000:
            return await self._generate_sectioned_text_quiz(request, source_raw, text)

        prompt = build_text_prompt(
            request=request,
            text_content=text,
            source_id=request.source_id,
        )

        payload = await self._call_model_with_validation(
            prompt=prompt,
            request=request,
            source_raw=source_raw,
        )
        return payload.questions

    async def _generate_sectioned_text_quiz(
        self, request: QuizGenerationRequest, source_raw: Dict[str, Any], text: str
    ) -> List[GeneratedQuestion]:
        """Split large text into sections, generate questions from each, and combine."""
        mid = len(text) // 2
        split_idx = text.find("\n\n", mid)
        if split_idx == -1:
            split_idx = mid

        part1 = text[:split_idx].strip()
        part2 = text[split_idx:].strip()

        count1 = request.question_count // 2
        count2 = request.question_count - count1

        all_questions: List[GeneratedQuestion] = []

        if part1 and count1 > 0:
            p1 = build_text_prompt(request, part1, request.source_id, target_count=count1)
            try:
                res1 = await self._call_model_with_validation(p1, request, source_raw)
                all_questions.extend(res1.questions)
            except Exception as e:
                logger.warning("Error generating section 1 of text: %s", e)

        if part2 and count2 > 0:
            p2 = build_text_prompt(request, part2, request.source_id, target_count=count2)
            try:
                res2 = await self._call_model_with_validation(p2, request, source_raw)
                all_questions.extend(res2.questions)
            except Exception as e:
                logger.warning("Error generating section 2 of text: %s", e)

        if not all_questions:
            # Fallback to single generation
            fallback_prompt = build_text_prompt(request, text[:22000], request.source_id)
            res = await self._call_model_with_validation(fallback_prompt, request, source_raw)
            return res.questions

        return all_questions

    async def _generate_pdf_quiz(
        self, request: QuizGenerationRequest, source_raw: Dict[str, Any]
    ) -> List[GeneratedQuestion]:
        """Generate questions strictly grounded in extracted PDF text with page citations."""
        pages = source_raw.get("raw_pages") or []
        word_count = source_raw.get("word_count", 0)

        # Check sufficiency
        min_required_words = max(10, request.question_count * 8)
        if word_count < min_required_words:
            raise InsufficientSourceMaterialError(
                f"The extracted PDF text contains only {word_count} words, which is insufficient "
                f"to generate {request.question_count} meaningful questions without fabrication. "
                "Please upload a document with more study material or reduce the requested question count.",
                details={"word_count": word_count, "min_required_words": min_required_words},
            )

        # Fallback if raw_pages was not populated
        if not pages:
            full_text = source_raw.get("content", "")
            pages = [{"page_number": 1, "text": full_text}]

        total_chars = sum(len(p.get("text", "")) for p in pages)

        # If PDF is long (> 20k characters), split into manageable page sections
        if total_chars > 20_000 and len(pages) > 1:
            return await self._generate_sectioned_pdf_quiz(request, source_raw, pages)

        prompt = build_pdf_section_prompt(
            request=request,
            source_id=request.source_id,
            pages=pages,
        )

        payload = await self._call_model_with_validation(
            prompt=prompt,
            request=request,
            source_raw=source_raw,
        )
        return payload.questions

    async def _generate_sectioned_pdf_quiz(
        self, request: QuizGenerationRequest, source_raw: Dict[str, Any], pages: List[Dict[str, Any]]
    ) -> List[GeneratedQuestion]:
        """Group pages into manageable sections and generate candidate questions."""
        sections: List[List[Dict[str, Any]]] = []
        current_section: List[Dict[str, Any]] = []
        current_chars = 0

        for page in pages:
            page_len = len(page.get("text", ""))
            if current_chars + page_len > 18_000 and current_section:
                sections.append(current_section)
                current_section = [page]
                current_chars = page_len
            else:
                current_section.append(page)
                current_chars += page_len

        if current_section:
            sections.append(current_section)

        # Distribute question count across sections
        sec_count = len(sections)
        base_count = max(1, request.question_count // sec_count)
        all_questions: List[GeneratedQuestion] = []

        for idx, sec in enumerate(sections):
            target = base_count if idx < sec_count - 1 else (request.question_count - len(all_questions))
            if target <= 0:
                continue
            sec_prompt = build_pdf_section_prompt(
                request=request,
                source_id=request.source_id,
                pages=sec,
                target_count=target,
            )
            try:
                res = await self._call_model_with_validation(sec_prompt, request, source_raw)
                all_questions.extend(res.questions)
            except Exception as e:
                logger.warning("Error generating questions for PDF section %d: %s", idx + 1, e)

        if not all_questions:
            # Fallback to first section
            fallback_prompt = build_pdf_section_prompt(request, request.source_id, sections[0])
            res = await self._call_model_with_validation(fallback_prompt, request, source_raw)
            return res.questions

        return all_questions

    # -------------------------------------------------------------------------
    # MODEL CALL & RETRY VALIDATION
    # -------------------------------------------------------------------------

    async def _call_model_with_validation(
        self,
        prompt: str,
        request: QuizGenerationRequest,
        source_raw: Dict[str, Any],
    ) -> GeneratedQuizPayload:
        """
        Send prompt to Ollama Cloud with retry logic on JSON or Pydantic validation failures.
        """
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]

        max_attempts = 1 + max(0, settings.OLLAMA_MAX_RETRIES)
        last_error_msg = ""
        last_raw_output = ""

        for attempt in range(max_attempts):
            if attempt > 0:
                logger.info("Retrying quiz generation with correction prompt (attempt %d)", attempt + 1)
                correction = build_correction_prompt(last_raw_output, last_error_msg)
                messages.append({"role": "assistant", "content": last_raw_output})
                messages.append({"role": "user", "content": correction})

            raw_output = await self._llm.chat_completion(
                messages=messages,
                format_type="json",
                temperature=0.2,
            )
            last_raw_output = raw_output

            try:
                json_str = extract_json_from_llm_response(raw_output)
                parsed = json.loads(json_str)

                # Check if model reported insufficient material
                if isinstance(parsed, dict) and parsed.get("error") == "insufficient_material":
                    msg = parsed.get("message") or "Source material does not have enough facts for the requested questions."
                    raise InsufficientSourceMaterialError(
                        f"Insufficient source material: {msg}",
                        details={"model_message": msg},
                    )

                # Validate with Pydantic
                quiz_payload = GeneratedQuizPayload.model_validate(parsed)

                if not quiz_payload.questions:
                    raise ValueError("Model returned 0 questions in output.")

                return quiz_payload

            except InsufficientSourceMaterialError:
                raise
            except Exception as e:
                last_error_msg = f"{type(e).__name__}: {str(e)}"
                logger.warning("Attempt %d validation failure: %s", attempt + 1, last_error_msg)

        raise InvalidModelOutputError(
            f"Failed to parse and validate Nemotron AI quiz output after {max_attempts} attempts. "
            f"Last error: {last_error_msg}",
            details={"last_error": last_error_msg},
        )

    # -------------------------------------------------------------------------
    # QUESTION SANITIZATION, ATTRIBUTION & DEDUPLICATION
    # -------------------------------------------------------------------------

    def _finalize_questions(
        self,
        candidate_questions: List[GeneratedQuestion],
        request: QuizGenerationRequest,
        source_raw: Dict[str, Any],
    ) -> List[GeneratedQuestion]:
        """
        Sanitize options, enforce question type rules, check for duplicates,
        verify page attribution, and ensure count alignment.
        """
        source_type = source_raw.get("source_type")
        page_count = source_raw.get("page_count", 1) or 1
        allowed_types = set(request.question_types)

        seen_normalized_texts = set()
        sanitized: List[GeneratedQuestion] = []

        for q in candidate_questions:
            # 1. Deduplication check
            norm_text = normalize_string_key(q.question_text)
            if not norm_text or norm_text in seen_normalized_texts:
                continue

            # 2. Type validation
            if q.type not in allowed_types:
                # If only one type was requested, normalize to that type
                if len(allowed_types) == 1:
                    q.type = list(allowed_types)[0]
                else:
                    continue

            # 3. Multiple Choice validation
            if q.type == QuestionType.MULTIPLE_CHOICE:
                if len(q.options) < 2:
                    continue

                # Ensure non-empty options and unique option text
                seen_opt_texts = set()
                clean_opts: List[QuizQuestionOption] = []
                for opt in q.options:
                    opt_norm = normalize_string_key(opt.text)
                    if opt_norm and opt_norm not in seen_opt_texts:
                        seen_opt_texts.add(opt_norm)
                        clean_opts.append(opt)

                if len(clean_opts) < 2:
                    continue

                q.options = clean_opts
                # Verify correct option ID
                valid_ids = [opt.id for opt in q.options]
                if not q.correct_option_id or q.correct_option_id not in valid_ids:
                    # Fallback to first option if not properly set
                    q.correct_option_id = valid_ids[0]

                q.expected_answer = None

            # 4. True/False validation
            elif q.type == QuestionType.TRUE_FALSE:
                # Ensure True and False options
                has_tf = any("true" in opt.text.lower() for opt in q.options) and any("false" in opt.text.lower() for opt in q.options)
                if not has_tf or len(q.options) != 2:
                    # Normalize options to True / False
                    correct_is_false = (
                        (q.correct_option_id and "b" in q.correct_option_id)
                        or (q.expected_answer and "false" in q.expected_answer.lower())
                    )
                    q.options = [
                        QuizQuestionOption(id="a", text="True"),
                        QuizQuestionOption(id="b", text="False"),
                    ]
                    q.correct_option_id = "b" if correct_is_false else "a"
                else:
                    valid_ids = [opt.id for opt in q.options]
                    if not q.correct_option_id or q.correct_option_id not in valid_ids:
                        q.correct_option_id = valid_ids[0]

                q.expected_answer = None

            # 5. Short Answer validation
            elif q.type == QuestionType.SHORT_ANSWER:
                if not q.expected_answer or not q.expected_answer.strip():
                    if q.correct_option_id and q.options:
                        matching_opt = next((o for o in q.options if o.id == q.correct_option_id), None)
                        if matching_opt:
                            q.expected_answer = matching_opt.text.strip()
                    if not q.expected_answer:
                        continue

                q.options = []
                q.correct_option_id = None

            # 6. Source attribution rules
            if source_type in (SourceType.TOPIC, "topic", SourceType.TEXT, "text"):
                # Topic and Text NEVER have page citations
                q.sources = []
            elif source_type in (SourceType.PDF, "pdf"):
                # PDF must only have valid pages
                verified_sources: List[SourceReference] = []
                for s in q.sources:
                    if s.page is not None and isinstance(s.page, int) and 1 <= s.page <= page_count:
                        verified_sources.append(
                            SourceReference(source_id=request.source_id, page=s.page)
                        )
                q.sources = verified_sources

            # 7. Ensure explanation exists
            if not q.explanation or not q.explanation.strip():
                q.explanation = "Detailed answer explanation based on the study curriculum."

            seen_normalized_texts.add(norm_text)
            sanitized.append(q)

        # 8. Check question count bounds
        if not sanitized:
            raise InvalidModelOutputError(
                "Could not extract any valid, well-formed questions from the AI model output.",
                details={"requested_count": request.question_count},
            )

        # If count exceeds requested, take requested amount
        final_questions = sanitized[: request.question_count]

        # Renumber questions cleanly: q1, q2, ...
        for idx, q in enumerate(final_questions):
            q.question_id = f"q{idx + 1}"

        return final_questions


quiz_generation_service = QuizGenerationService()
