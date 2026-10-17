import json
import logging
import re
from typing import Tuple

from app.services.ollama_service import ollama_service, OllamaService

logger = logging.getLogger(__name__)


SHORT_ANSWER_SYSTEM_PROMPT = """You are an expert academic examiner and evaluator.
Your role is to objectively assess a student's short-answer response against the question's expected answer and explanation.
Evaluate factual accuracy, understanding of key principles, and completeness.
Support partial credit between 0.0 and the maximum score.

You MUST respond ONLY with a single valid JSON object in this exact format without any markdown backticks or extra prose:
{
  "score": 0.8,
  "feedback": "Constructive explanation for the student.",
  "rationale": "Brief reason for the score assigned."
}
"""


class ShortAnswerEvalService:
    """
    Evaluates student short-answer responses against expected answers
    using Nemotron 3 Nano via Ollama Cloud, with a resilient fallback.
    """

    def __init__(self, ollama_svc: OllamaService = ollama_service) -> None:
        self.ollama = ollama_svc

    async def evaluate(
        self,
        question_text: str,
        expected_answer: str,
        explanation: str,
        student_answer: str,
        max_score: float = 1.0,
    ) -> Tuple[float, str, str]:
        """
        Evaluate student response.
        Returns tuple of (score, feedback, rationale).
        """
        # If student answer is empty, award zero without calling LLM
        clean_student = (student_answer or "").strip()
        if not clean_student:
            return (
                0.0,
                "No answer provided.",
                "Question was left unanswered.",
            )

        clean_expected = (expected_answer or "").strip()

        # Try evaluating with LLM
        try:
            user_prompt = (
                f"Question:\n{question_text}\n\n"
                f"Expected Answer:\n{clean_expected}\n\n"
                f"Reference Explanation:\n{explanation}\n\n"
                f"Student Submitted Answer:\n{clean_student}\n\n"
                f"Maximum Possible Score: {max_score}\n\n"
                f"Evaluate the student's answer and return the JSON evaluation."
            )

            response_text = await self.ollama.chat_completion(
                messages=[
                    {"role": "system", "content": SHORT_ANSWER_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.0,
            )

            score, feedback, rationale = self._parse_evaluation_output(response_text, max_score)
            return (score, feedback, rationale)

        except Exception as e:
            logger.warning(
                "Nemotron evaluation failed (%s: %s). Falling back to heuristic scoring.",
                type(e).__name__,
                str(e),
            )
            return self._heuristic_fallback(clean_student, clean_expected, max_score)

    def _parse_evaluation_output(self, raw_output: str, max_score: float) -> Tuple[float, str, str]:
        """Parse and clamp the JSON output from the evaluator LLM."""
        cleaned = raw_output.strip()
        # Strip thinking tags
        cleaned = re.sub(r"<think>[\s\S]*?</think>", "", cleaned, flags=re.IGNORECASE).strip()

        # Strip markdown fences
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, re.IGNORECASE)
        if match:
            cleaned = match.group(1).strip()

        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1:
            cleaned = cleaned[start : end + 1]

        data = json.loads(cleaned)
        raw_score = float(data.get("score", 0.0))
        # Clamp score between 0.0 and max_score
        score = max(0.0, min(float(max_score), round(raw_score, 2)))
        feedback = str(data.get("feedback", "Answer evaluated.")).strip()
        rationale = str(data.get("rationale", "Score calculated from content.")).strip()

        return (score, feedback, rationale)

    def _heuristic_fallback(
        self, student_text: str, expected_text: str, max_score: float
    ) -> Tuple[float, str, str]:
        """
        Deterministic keyword overlap fallback when LLM is unavailable.
        Ensures evaluation never crashes or hangs.
        """
        stop_words = {
            "a", "an", "the", "in", "on", "at", "to", "for", "of", "and", "or",
            "is", "are", "was", "were", "it", "this", "that", "with", "as", "by",
            "from", "be", "have", "has", "do", "does", "not", "but"
        }

        def tokenize(text: str) -> set:
            words = re.findall(r"\b[a-zA-Z0-9_]+\b", text.lower())
            return {w for w in words if w not in stop_words and len(w) > 2}

        student_tokens = tokenize(student_text)
        expected_tokens = tokenize(expected_text)

        if not expected_tokens:
            # If no expected tokens, exact non-empty match gets full credit
            return (
                max_score,
                "Answer accepted based on response length.",
                "Heuristic fallback scoring applied.",
            )

        overlap = student_tokens.intersection(expected_tokens)
        ratio = len(overlap) / len(expected_tokens)

        if ratio >= 0.6:
            score = round(max_score * 1.0, 2)
            feedback = "Strong answer covering the essential keywords and concepts."
        elif ratio >= 0.35:
            score = round(max_score * 0.6, 2)
            feedback = "Partially correct. Demonstrates understanding of key concepts."
        elif ratio >= 0.15:
            score = round(max_score * 0.3, 2)
            feedback = "Mentions some relevant terminology but incomplete."
        else:
            score = 0.0
            feedback = "The answer does not sufficiently address the expected response."

        rationale = f"Evaluated via keyword overlap ({len(overlap)} of {len(expected_tokens)} keywords matched)."
        return (score, feedback, rationale)


short_answer_eval_service = ShortAnswerEvalService()
