import json
from typing import Any, Dict, List, Optional
from app.schemas.quiz import QuizGenerationRequest, QuestionType, DifficultyLevel


SYSTEM_PROMPT = """You are Nemotron 3 Nano, an expert academic examination designer and quiz generator.
Your role is to craft rigorous, high-yield, conceptually sound educational quizzes.

STRICT OPERATIONAL CONSTRAINTS:
1. OUTPUT FORMAT: Output ONLY a single, valid JSON object matching the exact schema specified below. Do not wrap with Markdown explanations, commentary, or conversational text outside the JSON.
2. SCHEMATIC INTEGRITY: Every field in the JSON schema must be strictly populated and typed correctly.
3. ACCURACY & QUALITY: Questions must test real understanding, not trivial trivia. Avoid ambiguity. Distractors must be plausible misconceptions, not absurd or obviously incorrect choices.
4. QUESTION TYPES:
   - For 'multiple_choice' (MCQ): Provide 4 options (ids: 'a', 'b', 'c', 'd'). Exactly one option must be correct. 'correct_option_id' must match one of the option IDs. Vary the position of the correct answer naturally across questions. 'expected_answer' must be null.
   - For 'true_false': Provide 2 options: 'True' and 'False' (ids: 'a', 'b'). Exactly one must be correct. 'expected_answer' must be null.
   - For 'short_answer': Set 'options' to []. Set 'correct_option_id' to null. Populate 'expected_answer' with the concise, authoritative expected answer.
5. EXPLANATIONS: Every question MUST include a comprehensive explanation justifying the correct answer and explaining why incorrect options are wrong.
6. NO DUPLICATES: Questions must be distinctly different in both phrasing and tested concept.
7. GROUNDING RULES:
   - For 'topic' source: Use accurate domain knowledge. 'sources' array MUST be empty []. Never invent document page numbers or citations.
   - For 'text' (pasted study notes) source: Questions, correct answers, and explanations MUST be grounded STRICTLY in the provided text. Do not ask about external facts not supported by the text. 'sources' array MUST be empty [].
   - For 'pdf' source: Questions, correct answers, and explanations MUST be grounded STRICTLY in the provided extracted pages. For each question, populate the 'sources' array with the exact page number where the concept appears: [{"source_id": "<source_id>", "page": <page_number>}]. Never invent page numbers or citations that do not appear in the text.
8. INSUFFICIENT MATERIAL: If the provided source text or PDF does not contain enough substantive facts to generate the requested number of high-quality questions without hallucinating, return:
   {"error": "insufficient_material", "message": "<Explain what is missing and recommend a lower question count or more material>"}

REQUIRED JSON OUTPUT SCHEMA:
{
  "title": "<Quiz title string>",
  "source_type": "<topic | text | pdf>",
  "difficulty": "<easy | medium | hard | mixed>",
  "questions": [
    {
      "question_id": "q1",
      "type": "multiple_choice",
      "question_text": "<Clear question stem>",
      "options": [
        {"id": "a", "text": "<Option 1>"},
        {"id": "b", "text": "<Option 2>"},
        {"id": "c", "text": "<Option 3>"},
        {"id": "d", "text": "<Option 4>"}
      ],
      "correct_option_id": "a",
      "expected_answer": null,
      "explanation": "<In-depth conceptual explanation>",
      "difficulty": "medium",
      "topic": "<Subtopic label>",
      "sources": []
    }
  ]
}
"""


def build_topic_prompt(
    request: QuizGenerationRequest,
    source_title: str,
    additional_context: Optional[str] = None,
) -> str:
    """Build prompt for topic-based generation."""
    types_str = ", ".join([qt.value for qt in request.question_types])
    
    context_lines = []
    if request.subject:
        context_lines.append(f"- Subject Domain: {request.subject}")
    if request.exam:
        context_lines.append(f"- Target Examination: {request.exam}")
    if request.academic_year:
        context_lines.append(f"- Academic Year: {request.academic_year}")
    if request.additional_instructions:
        context_lines.append(f"- Additional User Instructions: {request.additional_instructions}")
    if additional_context:
        context_lines.append(f"- Context Notes: {additional_context}")

    context_block = "\n".join(context_lines) if context_lines else "None specified."

    return f"""GENERATE TOPIC-BASED QUIZ

Topic: {source_title}
Requested Title: {request.title}
Target Question Count: {request.question_count}
Target Difficulty: {request.difficulty.value}
Allowed Question Types: {types_str}

Academic Context & Preferences:
{context_block}

SPECIFIC INSTRUCTIONS:
1. Create exactly {request.question_count} questions distributed across the allowed question types ({types_str}).
2. Use accurate, authoritative general knowledge for the topic '{source_title}'.
3. Do not invent document citations: the 'sources' array for all questions must be empty [].
4. Return ONLY the valid JSON object adhering to the schema.
"""


def build_text_prompt(
    request: QuizGenerationRequest,
    text_content: str,
    source_id: str,
    target_count: Optional[int] = None,
) -> str:
    """Build prompt for pasted study material generation."""
    count = target_count or request.question_count
    types_str = ", ".join([qt.value for qt in request.question_types])

    context_lines = []
    if request.subject:
        context_lines.append(f"- Subject: {request.subject}")
    if request.exam:
        context_lines.append(f"- Target Exam: {request.exam}")
    if request.additional_instructions:
        context_lines.append(f"- User Instructions: {request.additional_instructions} (Do NOT override source grounding)")

    context_block = "\n".join(context_lines) if context_lines else "None specified."

    return f"""GENERATE QUIZ GROUNDED IN STUDY MATERIAL

Title: {request.title}
Target Question Count: {count}
Target Difficulty: {request.difficulty.value}
Allowed Question Types: {types_str}

Context:
{context_block}

STUDY MATERIAL:
\"\"\"
{text_content}
\"\"\"

STRICT GROUNDING DIRECTIVES:
1. Base every question, option, correct answer, and explanation EXCLUSIVELY on the study material provided above.
2. Do not introduce outside concepts, unmentioned formulas, or external facts not supported by this text.
3. Preserve key terminology and definitions as they appear in the text.
4. Set 'sources' array to empty [] for all questions (no document page numbers exist for pasted text).
5. If the study material is too brief to produce {count} non-duplicate, meaningful questions without hallucinating, return the 'insufficient_material' JSON error response.
6. Return ONLY the valid JSON object adhering to the schema.
"""


def build_pdf_section_prompt(
    request: QuizGenerationRequest,
    source_id: str,
    pages: List[Dict[str, Any]],
    target_count: Optional[int] = None,
) -> str:
    """Build prompt for extracted PDF page content."""
    count = target_count or request.question_count
    types_str = ", ".join([qt.value for qt in request.question_types])

    pages_text_list = []
    available_page_numbers = []
    for p in pages:
        p_num = p["page_number"]
        available_page_numbers.append(p_num)
        p_text = p.get("text", "").strip()
        pages_text_list.append(f"--- [Page {p_num}] ---\n{p_text}")

    formatted_pages = "\n\n".join(pages_text_list)
    pages_range_str = f"Pages: {', '.join(str(n) for n in available_page_numbers)}"

    context_lines = []
    if request.subject:
        context_lines.append(f"- Subject: {request.subject}")
    if request.exam:
        context_lines.append(f"- Target Exam: {request.exam}")
    if request.additional_instructions:
        context_lines.append(f"- User Instructions: {request.additional_instructions} (Do NOT override source grounding)")

    context_block = "\n".join(context_lines) if context_lines else "None specified."

    return f"""GENERATE QUIZ GROUNDED IN EXTRACTED PDF PAGES

Title: {request.title}
Target Question Count: {count}
Target Difficulty: {request.difficulty.value}
Allowed Question Types: {types_str}
Source Document ID: {source_id}
Available Document {pages_range_str}

Context:
{context_block}

DOCUMENT CONTENT:
\"\"\"
{formatted_pages}
\"\"\"

STRICT GROUNDING & CITATION DIRECTIVES:
1. Base every question, option, correct answer, and explanation STRICTLY on the document pages above.
2. For every question, populate the 'sources' array with the exact page number where the tested concept is found, e.g.:
   "sources": [{{"source_id": "{source_id}", "page": <page_number>}}]
3. ONLY cite page numbers that exist in this prompt: {available_page_numbers}. NEVER invent non-existent page numbers.
4. If the content across these pages cannot support {count} distinct, high-quality questions without hallucination, return the 'insufficient_material' JSON error response.
5. Return ONLY the valid JSON object adhering to the schema.
"""


def build_correction_prompt(raw_output: str, error_details: str) -> str:
    """Build focused prompt to correct malformed JSON output."""
    truncated_raw = raw_output[:2000] if len(raw_output) > 2000 else raw_output
    return f"""The previous response could not be parsed into the required quiz JSON structure.

VALIDATION ERROR:
{error_details}

PREVIOUS OUTPUT (TRUNCATED):
\"\"\"
{truncated_raw}
\"\"\"

CORRECTION TASK:
Please output ONLY the corrected JSON object conforming strictly to the requested schema. Ensure:
- All strings are properly escaped.
- Every MCQ has 'options' and a matching 'correct_option_id'.
- Every short_answer has 'expected_answer'.
- No trailing commas or unclosed braces.
- Return ONLY the raw JSON object with no surrounding prose.
"""
