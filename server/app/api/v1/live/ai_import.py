"""AI import functionality for live classroom task groups."""
import logging
import re
import zipfile
from io import BytesIO
from datetime import datetime, timezone
from typing import List, Optional
from xml.etree import ElementTree as ET

from fastapi import HTTPException

from app.core.ai_client import call_siliconflow as _call_siliconflow, extract_json_object as _extract_json_object
from .schemas import AiImportTaskGroupRequest, AiGenerateTaskGroupRequest

logger = logging.getLogger(__name__)

SUPPORTED_AI_TYPES = [
    "single_choice",
    "multiple_choice",
    "fill_blank",
    "true_false",
    "matching",
    "sorting",
    "image_understanding",
    "error_correction",
    "scenario",
    "reading",
]

AI_JSON_SCHEMA_PROMPT = """
Return valid JSON only.
Top-level format:
{
  "questions": [
    {
      "type": "single_choice | multiple_choice | fill_blank | true_false | matching | sorting | image_understanding | error_correction | scenario | reading",
      "text": "question stem",
      "passage": "long reading passage when type is reading",
      "prompt": "optional question or instruction for the reading task",
      "answer_required": true,
      "options": [{"key": "A", "text": "..."}, {"key": "B", "text": "..."}],
      "correct_answer": {"value": "A"},
      "blanks": [{"position": 0, "answer": "helping"}],
      "pairs": [{"left": "...", "right": "..."}],
      "countdown_seconds": 30,
      "explanation": "short explanation",
      "confidence": "high | medium | low"
    }
  ]
}

Rules:
- Keep only supported types: single_choice, multiple_choice, fill_blank, true_false, matching, sorting, image_understanding, error_correction, scenario, reading.
- For single_choice, multiple_choice, image_understanding, error_correction, and scenario, always include options and correct_answer.value.
- For multiple_choice, correct_answer.value must be an array like ["A","C"].
- For image_understanding, use one correct option and write the prompt so the image is required together with the stem.
- For error_correction, use one correct option and make the question focus on finding an error or choosing the corrected expression.
- For scenario, use one correct option and make the question describe a concrete situation or case.
- For fill_blank, include blanks and correct_answer.value as an array of strings.
- For true_false, correct_answer.value must be true or false.
- For matching, include pairs and correct_answer.value as [0,1,2...] matching the right side order.
- For sorting, include options and correct_answer.value as an ordered array like ["A","C","B"].
- For reading, include passage and optional prompt. If answer_required is false, students only need to read. If answer_required is true, correct_answer.value may contain a short reference answer.
- countdown_seconds should be between 20 and 90.
- Keep explanations concise.
- Do not include markdown fences or extra commentary.
""".strip()


def _normalize_choice_options(options: Optional[List[dict]]) -> List[dict]:
    normalized = []
    source = options or []
    for index, option in enumerate(source):
        key = str(option.get("key") or chr(65 + index)).upper()
        text = str(option.get("text") or "").strip()
        if text:
            normalized.append({"key": key, "text": text})

    if len(normalized) < 2:
        normalized = [
            {"key": "A", "text": "Option A"},
            {"key": "B", "text": "Option B"},
            {"key": "C", "text": "Option C"},
            {"key": "D", "text": "Option D"},
        ]

    return normalized


def _normalize_ai_task_draft(
    item: dict,
    order: int,
    randomize_answer_position: bool,
    source: str,
) -> dict:
    task_type = str(item.get("type") or "single_choice").strip()
    if task_type not in SUPPORTED_AI_TYPES:
      task_type = "single_choice"

    explanation = str(item.get("explanation") or "").strip() or None
    confidence = str(item.get("confidence") or "medium").strip().lower()
    if confidence not in {"high", "medium", "low"}:
        confidence = "medium"

    countdown = item.get("countdown_seconds")
    try:
        countdown_seconds = max(20, min(int(countdown or 30), 90))
    except (TypeError, ValueError):
        countdown_seconds = 30

    text = str(item.get("text") or "").strip() or f"Question {order + 1}"
    ai_meta = {"confidence": confidence, "source": source}

    if task_type in {"single_choice", "multiple_choice", "image_understanding", "error_correction", "scenario"}:
        options = _normalize_choice_options(item.get("options"))
        raw_answer = item.get("correct_answer", {}).get("value") if isinstance(item.get("correct_answer"), dict) else item.get("correct_answer")
        if task_type == "multiple_choice":
            if not isinstance(raw_answer, list):
                raw_answer = [raw_answer] if raw_answer else ["A"]
            answer_value = [str(choice).upper() for choice in raw_answer if str(choice).strip()] or ["A"]
        else:
            answer_value = str(raw_answer or "A").upper()

        return {
            "type": task_type,
            "question": {
                "text": text,
                "options": options,
                "randomize_answer_position": randomize_answer_position,
                "ai_meta": ai_meta,
            },
            "correct_answer": {"value": answer_value},
            "countdown_seconds": countdown_seconds,
            "explanation": explanation,
            "order": order,
        }

    if task_type == "sorting":
        options = _normalize_choice_options(item.get("options"))
        raw_answer = item.get("correct_answer", {}).get("value") if isinstance(item.get("correct_answer"), dict) else item.get("correct_answer")
        if not isinstance(raw_answer, list):
            raw_answer = [option["key"] for option in options]
        answer_value = [str(choice).upper() for choice in raw_answer if str(choice).strip()] or [option["key"] for option in options]

        normalized_order = []
        seen = set()
        for key in answer_value:
            if key in seen:
                continue
            if any(option["key"] == key for option in options):
                normalized_order.append(key)
                seen.add(key)
        for option in options:
            if option["key"] not in seen:
                normalized_order.append(option["key"])

        return {
            "type": "sorting",
            "question": {
                "text": text,
                "options": options,
                "randomize_answer_position": randomize_answer_position,
                "ai_meta": ai_meta,
            },
            "correct_answer": {"value": normalized_order},
            "countdown_seconds": countdown_seconds,
            "explanation": explanation,
            "order": order,
        }

    if task_type == "fill_blank":
        raw_blanks = item.get("blanks") if isinstance(item.get("blanks"), list) else []
        blanks = []
        answers = []
        for index, blank in enumerate(raw_blanks):
            answer = str(blank.get("answer") if isinstance(blank, dict) else "").strip()
            if answer:
                blanks.append({"position": index, "answer": answer})
                answers.append(answer)
        if not blanks:
            answers = ["sample"]
            blanks = [{"position": 0, "answer": "sample"}]

        return {
            "type": "fill_blank",
            "question": {
                "text": text,
                "blanks": blanks,
                "randomize_answer_position": randomize_answer_position,
                "ai_meta": ai_meta,
            },
            "correct_answer": {"value": answers},
            "countdown_seconds": countdown_seconds,
            "explanation": explanation,
            "order": order,
        }

    if task_type == "true_false":
        raw_answer = item.get("correct_answer", {}).get("value") if isinstance(item.get("correct_answer"), dict) else item.get("correct_answer")
        answer_value = bool(raw_answer)
        if isinstance(raw_answer, str):
            answer_value = raw_answer.strip().lower() in {"true", "1", "yes", "correct"}

        return {
            "type": "true_false",
            "question": {
                "text": text,
                "randomize_answer_position": randomize_answer_position,
                "ai_meta": ai_meta,
            },
            "correct_answer": {"value": answer_value},
            "countdown_seconds": countdown_seconds,
            "explanation": explanation,
            "order": order,
        }

    if task_type == "reading":
        passage = str(item.get("passage") or "").strip()
        prompt = str(item.get("prompt") or "").strip()
        raw_answer_required = item.get("answer_required")
        answer_required = bool(prompt)
        if isinstance(raw_answer_required, bool):
            answer_required = raw_answer_required
        elif isinstance(raw_answer_required, str):
            answer_required = raw_answer_required.strip().lower() in {"true", "1", "yes", "required"}

        if not passage:
            passage = text
        reference_answer = item.get("correct_answer", {}).get("value") if isinstance(item.get("correct_answer"), dict) else item.get("correct_answer")
        reference_answer_text = str(reference_answer or "").strip()

        return {
            "type": "reading",
            "question": {
                "text": text,
                "passage": passage,
                "prompt": prompt or None,
                "answer_required": answer_required,
                "randomize_answer_position": False,
                "ai_meta": ai_meta,
            },
            "correct_answer": {"value": reference_answer_text} if answer_required and reference_answer_text else None,
            "countdown_seconds": countdown_seconds,
            "explanation": explanation,
            "order": order,
        }

    raw_pairs = item.get("pairs") if isinstance(item.get("pairs"), list) else []
    pairs = []
    for pair in raw_pairs:
        if not isinstance(pair, dict):
            continue
        left = str(pair.get("left") or "").strip()
        right = str(pair.get("right") or "").strip()
        if left and right:
            pairs.append({"left": left, "right": right})

    if len(pairs) < 2:
        pairs = [
            {"left": "Imported left 1", "right": "Imported right 1"},
            {"left": "Imported left 2", "right": "Imported right 2"},
        ]

    answer_value = list(range(len(pairs)))

    return {
        "type": "matching",
        "question": {
            "text": text,
            "pairs": pairs,
            "randomize_answer_position": randomize_answer_position,
            "ai_meta": ai_meta,
        },
        "correct_answer": {"value": answer_value},
        "countdown_seconds": countdown_seconds,
        "explanation": explanation,
        "order": order,
    }


def _build_import_messages(raw_text: str, randomize_answer_position: bool) -> List[dict]:
    """Build messages for AI import with few-shot examples to ensure proper parsing."""

    system_prompt = f"""You are a question parser. Convert teacher's text into structured JSON.

RULES:
1. EXTRACT from input - do NOT generate new content
2. Question text = everything before first option
3. Options = patterns like A/B/C/D, (A), A., 1/2/3/4
4. Answer = text after "答案/Answer/Correct" markers
5. Only use objective types: single_choice, multiple_choice, fill_blank, true_false, matching, sorting, image_understanding, error_correction, scenario
6. Return ONLY JSON

OUTPUT FORMAT:
{{
  "questions": [
    {{
      "type": "single_choice",
      "text": "question text here",
      "options": [
        {{"key": "A", "text": "option A text"}},
        {{"key": "B", "text": "option B text"}}
      ],
      "correct_answer": {{"value": "A"}},
      "countdown_seconds": 30,
      "confidence": "high"
    }}
  ]
}}

{AI_JSON_SCHEMA_PROMPT}"""

    user_prompt = f"""Parse this content into JSON. Extract question, options, and answer:

{raw_text}"""

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def _build_generate_messages(data: AiGenerateTaskGroupRequest) -> List[dict]:
    default_types = ["reading"] if data.task_mode == "reading" else SUPPORTED_AI_TYPES
    requested_types = [t for t in (data.types or default_types) if t in SUPPORTED_AI_TYPES]
    if not requested_types:
        requested_types = default_types
    question_count = 1 if data.task_mode == "reading" else max(1, min(data.question_count, 10))

    return [
        {
            "role": "system",
            "content": (
                "You are an expert classroom question designer for an English teaching platform. "
                "Generate high-quality classroom interaction questions for a live teacher. "
                f"{AI_JSON_SCHEMA_PROMPT}"
            ),
        },
        {
            "role": "user",
            "content": (
                f"Generate {question_count} questions.\n"
                f"Difficulty: {data.difficulty}.\n"
                f"Task mode: {data.task_mode}.\n"
                f"Allowed types: {', '.join(requested_types)}.\n"
                f"Include explanations: {str(data.include_explanations).lower()}.\n"
                f"Set randomize_answer_position to {str(data.randomize_answer_position).lower()} when supported.\n"
                f"Teacher request: {data.prompt}"
            ),
        },
    ]


def _extract_prompt_topic(text: str) -> str:
    cleaned = " ".join((text or "").split())
    if not cleaned:
        return "classroom English"
    return cleaned[:72]


def _build_single_choice_question(topic: str, order: int, randomize: bool, explanation: bool = True) -> dict:
    options = [
        {"key": "A", "text": f"Open it now."},
        {"key": "B", "text": f"I need that immediately."},
        {"key": "C", "text": f"Could you please help me with {topic}?"},
        {"key": "D", "text": f"Do this for me."},
    ]
    return {
        "type": "single_choice",
        "question": {
            "text": f"Which sentence is the most polite in this topic: {topic}?",
            "options": options,
            "randomize_answer_position": randomize,
            "ai_meta": {"confidence": "medium", "source": "ai_generate"},
        },
        "correct_answer": {"value": "C"},
        "countdown_seconds": 35,
        "explanation": f"The most polite option uses a complete request form about {topic}." if explanation else None,
        "order": order,
    }


def _build_multiple_choice_question(topic: str, order: int, randomize: bool, explanation: bool = True) -> dict:
    options = [
        {"key": "A", "text": "Sure, I'd be happy to help."},
        {"key": "B", "text": "No, do it yourself."},
        {"key": "C", "text": f"Of course, I can help with {topic}."},
        {"key": "D", "text": "That is your problem."},
    ]
    return {
        "type": "multiple_choice",
        "question": {
            "text": f"Choose all polite responses related to {topic}.",
            "options": options,
            "randomize_answer_position": randomize,
            "ai_meta": {"confidence": "medium", "source": "ai_generate"},
        },
        "correct_answer": {"value": ["A", "C"]},
        "countdown_seconds": 40,
        "explanation": "Polite responses typically include willingness and softening language." if explanation else None,
        "order": order,
    }


def _build_fill_blank_question(topic: str, order: int, explanation: bool = True) -> dict:
    return {
        "type": "fill_blank",
        "question": {
            "text": f"Complete the sentence: Would you mind ___ me with {topic}?",
            "blanks": [{"position": 0, "answer": "helping"}],
            "ai_meta": {"confidence": "medium", "source": "ai_generate"},
        },
        "correct_answer": {"value": ["helping"]},
        "countdown_seconds": 30,
        "explanation": "After 'would you mind', the verb normally takes the -ing form." if explanation else None,
        "order": order,
    }


def _build_true_false_question(topic: str, order: int, explanation: bool = True) -> dict:
    return {
        "type": "true_false",
        "question": {
            "text": f"True or false: 'Help me with {topic}.' sounds polite enough in class.",
            "ai_meta": {"confidence": "high", "source": "ai_generate"},
        },
        "correct_answer": {"value": False},
        "countdown_seconds": 25,
        "explanation": "This is too direct for a polite classroom request." if explanation else None,
        "order": order,
    }


def _build_matching_question(topic: str, order: int, explanation: bool = True) -> dict:
    return {
        "type": "matching",
        "question": {
            "text": f"Match each request about {topic} with the best polite response.",
            "pairs": [
                {"left": f"Could you help me with {topic}?", "right": "Sure, no problem."},
                {"left": "Would you mind waiting a minute?", "right": "Of course, take your time."},
            ],
            "randomize_answer_position": True,
            "ai_meta": {"confidence": "medium", "source": "ai_generate"},
        },
        "correct_answer": {"value": [0, 1]},
        "countdown_seconds": 45,
        "explanation": "Each request should pair with the most natural and polite response." if explanation else None,
        "order": order,
    }


def _build_sorting_question(topic: str, order: int, explanation: bool = True) -> dict:
    options = [
        {"key": "A", "text": f"Identify the core idea about {topic}."},
        {"key": "B", "text": "Find the supporting detail."},
        {"key": "C", "text": "Organize the information logically."},
        {"key": "D", "text": "Share the final answer."},
    ]
    return {
        "type": "sorting",
        "question": {
            "text": f"Put these steps about {topic} in the correct order.",
            "options": options,
            "randomize_answer_position": True,
            "ai_meta": {"confidence": "medium", "source": "ai_generate"},
        },
        "correct_answer": {"value": ["A", "B", "C", "D"]},
        "countdown_seconds": 40,
        "explanation": "The steps should move from understanding the task to giving the final response." if explanation else None,
        "order": order,
    }


def _build_image_understanding_question(topic: str, order: int, randomize: bool, explanation: bool = True) -> dict:
    options = [
        {"key": "A", "text": "The image suggests a routine classroom activity."},
        {"key": "B", "text": "The image shows a weather emergency."},
        {"key": "C", "text": "The image focuses on a sports competition."},
        {"key": "D", "text": "The image is mainly about a traffic problem."},
    ]
    return {
        "type": "image_understanding",
        "question": {
            "text": f"Look at the image and choose the best description related to {topic}.",
            "options": options,
            "randomize_answer_position": randomize,
            "ai_meta": {"confidence": "medium", "source": "ai_generate"},
        },
        "correct_answer": {"value": "A"},
        "countdown_seconds": 35,
        "explanation": "Choose the option that best matches the visual information and the task topic." if explanation else None,
        "order": order,
    }


def _build_error_correction_question(topic: str, order: int, randomize: bool, explanation: bool = True) -> dict:
    options = [
        {"key": "A", "text": f"Please helps me with {topic}."},
        {"key": "B", "text": f"Could you please help me with {topic}?"},
        {"key": "C", "text": f"Would you mind helping me with {topic}?"},
        {"key": "D", "text": f"Could you give me a hand with {topic}?"},
    ]
    return {
        "type": "error_correction",
        "question": {
            "text": f"Which option contains an error about {topic}?",
            "options": options,
            "randomize_answer_position": randomize,
            "ai_meta": {"confidence": "medium", "source": "ai_generate"},
        },
        "correct_answer": {"value": "A"},
        "countdown_seconds": 35,
        "explanation": "Option A is incorrect because the verb after 'please' should be the base form." if explanation else None,
        "order": order,
    }


def _build_scenario_question(topic: str, order: int, randomize: bool, explanation: bool = True) -> dict:
    options = [
        {"key": "A", "text": "Ignore the situation and wait for someone else."},
        {"key": "B", "text": f"Choose the response that best fits this situation about {topic}."},
        {"key": "C", "text": "Answer without considering the context."},
        {"key": "D", "text": "Change the topic immediately."},
    ]
    return {
        "type": "scenario",
        "question": {
            "text": f"You are in a situation related to {topic}. What is the best response?",
            "options": options,
            "randomize_answer_position": randomize,
            "ai_meta": {"confidence": "medium", "source": "ai_generate"},
        },
        "correct_answer": {"value": "B"},
        "countdown_seconds": 35,
        "explanation": "The best option should respond directly to the situation and fit the context." if explanation else None,
        "order": order,
    }


def _build_reading_question(topic: str, order: int, answer_required: bool = True) -> dict:
    prompt = "请用 1-2 句话概括本文主旨。" if answer_required else None
    return {
        "type": "reading",
        "question": {
            "text": f"{topic} 阅读任务",
            "passage": (
                f"{topic} is an important classroom topic. Students are expected to read the passage carefully, "
                "notice the key details, and understand the main idea before moving to the next activity. "
                "The passage should help the teacher connect classroom learning with after-class comprehension."
            ),
            "prompt": prompt,
            "answer_required": answer_required,
            "randomize_answer_position": False,
            "ai_meta": {"confidence": "medium", "source": "ai_generate"},
        },
        "correct_answer": {"value": "文章主要介绍了该主题的核心信息和课堂应用。"} if answer_required else None,
        "countdown_seconds": 300,
        "explanation": "Generated reading task draft.",
        "order": order,
    }


def _build_generated_questions(request: AiGenerateTaskGroupRequest) -> List[dict]:
    topic = _extract_prompt_topic(request.prompt)
    question_count = 1 if request.task_mode == "reading" else max(1, min(request.question_count, 10))
    default_types = ["reading"] if request.task_mode == "reading" else SUPPORTED_AI_TYPES
    requested_types = [t for t in (request.types or default_types) if t in SUPPORTED_AI_TYPES]
    if not requested_types:
        requested_types = default_types

    builders = {
        "single_choice": lambda idx: _build_single_choice_question(topic, idx, request.randomize_answer_position, request.include_explanations),
        "multiple_choice": lambda idx: _build_multiple_choice_question(topic, idx, request.randomize_answer_position, request.include_explanations),
        "fill_blank": lambda idx: _build_fill_blank_question(topic, idx, request.include_explanations),
        "true_false": lambda idx: _build_true_false_question(topic, idx, request.include_explanations),
        "matching": lambda idx: _build_matching_question(topic, idx, request.include_explanations),
        "sorting": lambda idx: _build_sorting_question(topic, idx, request.include_explanations),
        "image_understanding": lambda idx: _build_image_understanding_question(topic, idx, request.randomize_answer_position, request.include_explanations),
        "error_correction": lambda idx: _build_error_correction_question(topic, idx, request.randomize_answer_position, request.include_explanations),
        "scenario": lambda idx: _build_scenario_question(topic, idx, request.randomize_answer_position, request.include_explanations),
        "reading": lambda idx: _build_reading_question(topic, idx, True),
    }

    results = []
    for idx in range(question_count):
        task_type = requested_types[idx % len(requested_types)]
        results.append(builders[task_type](idx))
    return results


def _normalize_import_text(raw_text: str) -> str:
    text = (raw_text or "").replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _split_import_blocks(raw_text: str) -> List[str]:
    normalized = _normalize_import_text(raw_text)
    if not normalized:
        return []

    blank_line_blocks = [block.strip() for block in re.split(r"\n\s*\n", normalized) if block.strip()]
    if len(blank_line_blocks) > 1:
        return blank_line_blocks[:10]

    question_start_pattern = re.compile(
        r"(?m)(?=^(?:\d{1,2}[\.\)、)]\s+|Q\d{1,2}[\.\):]?\s+|第\d+题[\:\s]|[一二三四五六七八九十]+[、.]\s+))"
    )
    blocks = [block.strip() for block in question_start_pattern.split(normalized) if block.strip()]
    return (blocks or [normalized])[:10]


def _extract_answer_text(block: str) -> str:
    match = re.search(
        r"(?:^|\n)\s*(?:答案|Answer|Correct Answer|Correct|Ans)\s*[：:]?\s*(.+?)(?=\n|$)",
        block,
        flags=re.IGNORECASE,
    )
    return match.group(1).strip() if match else ""


def _remove_answer_line(block: str) -> str:
    return re.sub(
        r"(?:^|\n)\s*(?:答案|Answer|Correct Answer|Correct|Ans)\s*[：:]?\s*.+?(?=\n|$)",
        "",
        block,
        flags=re.IGNORECASE,
    ).strip()


def _extract_choice_parts(block: str) -> tuple[str, List[dict]]:
    content = _remove_answer_line(block)
    lines = [line.strip() for line in content.splitlines() if line.strip()]
    options = []
    stem_lines = []
    line_pattern = re.compile(r"^([A-H])[\.\):、]\s*(.+)$")
    for line in lines:
        match = line_pattern.match(line)
        if match:
            options.append({"key": match.group(1).upper(), "text": match.group(2).strip()})
        else:
            stem_lines.append(line)

    if len(options) >= 2:
        return " ".join(stem_lines).strip(), options

    compact = " ".join(lines)
    inline_pattern = re.compile(r"([A-H])[\.\):、]\s*(.*?)(?=(?:\s+[A-H][\.\):、]\s)|$)")
    matches = list(inline_pattern.finditer(compact))
    if len(matches) >= 2:
        stem = compact[:matches[0].start()].strip()
        inline_options = []
        for match in matches:
            text = match.group(2).strip(" ;；")
            if text:
                inline_options.append({"key": match.group(1).upper(), "text": text})
        if len(inline_options) >= 2:
            return stem, inline_options

    return content.strip(), []


def _extract_fill_blank_parts(block: str) -> tuple[str, List[dict], List[str]]:
    stem = _remove_answer_line(block)
    answer_text = _extract_answer_text(block)
    answers = [part.strip() for part in re.split(r"[,，;/；、]+", answer_text) if part.strip()]
    if not answers:
        answers = ["sample"]

    blank_matches = list(re.finditer(r"(_{2,}|（\s*）|\(\s*\)|\[\s*\])", stem))
    blanks = [{"position": idx, "answer": answers[idx] if idx < len(answers) else answers[-1]} for idx, _ in enumerate(blank_matches)]
    if not blanks:
        blanks = [{"position": 0, "answer": answers[0]}]

    return stem.strip(), blanks, [blank["answer"] for blank in blanks]


def _extract_matching_parts(block: str) -> tuple[str, List[dict], List[int]]:
    answer_text = _extract_answer_text(block)
    content = _remove_answer_line(block)
    lines = [line.strip() for line in content.splitlines() if line.strip()]

    left_items = {}
    right_items = {}
    paired_lines = []
    stem_lines = []

    for line in lines:
        left_match = re.match(r"^([A-H])[\.\):、]\s*(.+)$", line)
        right_match = re.match(r"^(\d{1,2})[\.\):、]\s*(.+)$", line)
        dash_match = re.match(r"^(.+?)\s*[-—–:：]\s*(.+)$", line)
        if left_match:
            left_items[left_match.group(1).upper()] = left_match.group(2).strip()
        elif right_match:
            right_items[right_match.group(1)] = right_match.group(2).strip()
        elif dash_match and "match" not in line.lower():
            paired_lines.append({"left": dash_match.group(1).strip(), "right": dash_match.group(2).strip()})
        else:
            stem_lines.append(line)

    if paired_lines:
        return " ".join(stem_lines).strip() or "Match the following items.", paired_lines, list(range(len(paired_lines)))

    pairs = []
    if left_items and right_items:
        mappings = re.findall(r"([A-H])\s*[-—–]\s*(\d{1,2})", answer_text, flags=re.IGNORECASE)
        if mappings:
            for left_key, right_key in mappings:
                if left_items.get(left_key.upper()) and right_items.get(right_key):
                    pairs.append({"left": left_items[left_key.upper()], "right": right_items[right_key]})
        if not pairs:
            right_keys = sorted(right_items.keys(), key=int)
            for index, left_key in enumerate(sorted(left_items.keys())):
                if index < len(right_keys):
                    pairs.append({"left": left_items[left_key], "right": right_items[right_keys[index]]})

    if len(pairs) < 2:
        pairs = [
            {"left": "Imported left 1", "right": "Imported right 1"},
            {"left": "Imported left 2", "right": "Imported right 2"},
        ]

    return " ".join(stem_lines).strip() or "Match the following items.", pairs, list(range(len(pairs)))


def _detect_import_type(block: str) -> str:
    lower = block.lower()
    answer_text = _extract_answer_text(block)
    answer_lower = answer_text.lower()
    _, options = _extract_choice_parts(block)

    if "true or false" in lower or "判断" in block or answer_lower in {"true", "false", "t", "f", "对", "错", "正确", "错误"}:
        return "true_false"
    if "___" in block or "fill in the blank" in lower or "填空" in block or "（ ）" in block or re.search(r"_{2,}|\(\s*\)|\[\s*\]", block):
        return "fill_blank"
    if "match" in lower or "配对" in block or re.findall(r"([A-H])\s*[-—–]\s*(\d{1,2})", answer_text, flags=re.IGNORECASE):
        return "matching"
    if len(options) >= 2:
        parsed_answer = re.findall(r"[A-H]", answer_text.upper())
        if len(parsed_answer) > 1 or "choose all" in lower or "多选" in block:
            return "multiple_choice"
        return "single_choice"
    return "single_choice"


def _merge_import_draft(ai_draft: dict, fallback_draft: dict) -> dict:
    merged = dict(ai_draft)
    merged["type"] = ai_draft.get("type") or fallback_draft["type"]
    merged["countdown_seconds"] = ai_draft.get("countdown_seconds") or fallback_draft["countdown_seconds"]

    ai_question = dict(ai_draft.get("question") or {})
    fallback_question = dict(fallback_draft["question"])
    ai_question["text"] = ai_question.get("text") or fallback_question.get("text")
    ai_question["randomize_answer_position"] = fallback_question.get("randomize_answer_position", False)
    ai_question["ai_meta"] = ai_question.get("ai_meta") or fallback_question.get("ai_meta")

    if merged["type"] in {"single_choice", "multiple_choice"}:
        ai_question["options"] = fallback_question.get("options", [])
    if merged["type"] == "fill_blank":
        ai_question["blanks"] = fallback_question.get("blanks", [])
    if merged["type"] == "matching":
        ai_question["pairs"] = fallback_question.get("pairs", [])

    merged["question"] = ai_question

    merged["correct_answer"] = fallback_draft["correct_answer"]

    if not merged.get("explanation"):
        merged["explanation"] = fallback_draft.get("explanation")
    return merged


def _build_import_question(block: str, order: int, randomize: bool) -> dict:
    task_type = _detect_import_type(block)
    answer_text = _extract_answer_text(block)
    content_without_answer = _remove_answer_line(block)
    ai_meta = {"confidence": "medium", "source": "ai_import"}

    if task_type in ("single_choice", "multiple_choice"):
        stem, options = _extract_choice_parts(block)
        if not options:
            options = [
                {"key": "A", "text": "Option A"},
                {"key": "B", "text": "Option B"},
                {"key": "C", "text": "Option C"},
                {"key": "D", "text": "Option D"},
            ]
        parsed_answer = re.findall(r"[A-H]", answer_text.upper()) or ["A"]
        correct_value = parsed_answer if task_type == "multiple_choice" else parsed_answer[0]
        return {
            "type": task_type,
            "question": {
                "text": stem or content_without_answer or f"Question {order + 1}",
                "options": options,
                "randomize_answer_position": randomize,
                "ai_meta": ai_meta,
            },
            "correct_answer": {"value": correct_value},
            "countdown_seconds": 35,
            "explanation": answer_text or "Imported from pasted content.",
            "order": order,
        }

    if task_type == "fill_blank":
        stem, blanks, answers = _extract_fill_blank_parts(block)
        return {
            "type": "fill_blank",
            "question": {
                "text": stem or content_without_answer or f"Question {order + 1}",
                "blanks": blanks,
                "randomize_answer_position": randomize,
                "ai_meta": ai_meta,
            },
            "correct_answer": {"value": answers},
            "countdown_seconds": 30,
            "explanation": answer_text or "Please review the imported blank answer.",
            "order": order,
        }

    if task_type == "true_false":
        normalized_answer = answer_text.strip().lower()
        answer_value = normalized_answer in {"true", "t", "yes", "correct", "对", "正确"}
        return {
            "type": "true_false",
            "question": {
                "text": content_without_answer or f"Question {order + 1}",
                "randomize_answer_position": randomize,
                "ai_meta": ai_meta,
            },
            "correct_answer": {"value": answer_value},
            "countdown_seconds": 25,
            "explanation": answer_text or "Imported true/false question.",
            "order": order,
        }

    stem, pairs, pair_answer = _extract_matching_parts(block)
    return {
        "type": "matching",
        "question": {
            "text": stem or content_without_answer or f"Question {order + 1}",
            "pairs": pairs,
            "randomize_answer_position": randomize,
            "ai_meta": {"confidence": "low", "source": "ai_import"},
        },
        "correct_answer": {"value": pair_answer},
        "countdown_seconds": 40,
        "explanation": answer_text or "Matching pairs were created as an import draft. Please review before publishing.",
        "order": order,
    }


def _build_reading_import_task(raw_text: str, order: int = 0) -> dict:
    normalized = _normalize_import_text(raw_text)
    if not normalized:
        raise HTTPException(status_code=400, detail="No importable content found")

    lines = [line.strip() for line in normalized.splitlines() if line.strip()]
    short_first_line = lines[0] if lines and len(lines[0]) <= 80 else ""
    title = short_first_line or "阅读任务"

    answer_text = _extract_answer_text(normalized)
    content_without_answer = _remove_answer_line(normalized)
    content_lines = [line.strip() for line in content_without_answer.splitlines() if line.strip()]
    if short_first_line and len(content_lines) > 1 and content_lines[0] == short_first_line:
        content_lines = content_lines[1:]

    prompt = ""
    passage_lines = content_lines
    if len(content_lines) >= 2:
        last_line = content_lines[-1]
        lowered = last_line.lower()
        if (
            last_line.endswith("?")
            or last_line.endswith("？")
            or lowered.startswith("question:")
            or lowered.startswith("task:")
            or last_line.startswith("问题：")
            or last_line.startswith("任务：")
        ):
            prompt = re.sub(r"^(question|task)\s*:\s*", "", last_line, flags=re.IGNORECASE)
            prompt = prompt.removeprefix("问题：").removeprefix("任务：").strip()
            passage_lines = content_lines[:-1]

    passage = "\n\n".join(passage_lines).strip() or normalized
    answer_required = bool(prompt)
    correct_answer = {"value": answer_text} if answer_required and answer_text else None

    return {
        "type": "reading",
        "question": {
            "text": title,
            "passage": passage,
            "prompt": prompt or None,
            "answer_required": answer_required,
            "randomize_answer_position": False,
            "ai_meta": {"confidence": "medium", "source": "reading_import"},
        },
        "correct_answer": correct_answer,
        "countdown_seconds": 300,
        "explanation": "Imported as a reading task.",
        "order": order,
    }


async def _build_import_questions_with_ai(raw_text: str, randomize_answer_position: bool) -> List[dict]:
    blocks = _split_import_blocks(raw_text)
    if not blocks:
        raise HTTPException(status_code=400, detail="No importable content found")

    fallback_drafts = [
        _build_import_question(block, index, randomize_answer_position)
        for index, block in enumerate(blocks)
    ]

    try:
        messages = _build_import_messages(raw_text, randomize_answer_position)
        logger.info(f"[AI Import] Sending request with raw_text length: {len(raw_text)}")

        response = await _call_siliconflow(messages)
        content = response["choices"][0]["message"]["content"]
        logger.info(f"[AI Import] AI response content preview: {content[:500]}...")

        parsed = _extract_json_object(content)
        questions = parsed.get("questions")
        if not isinstance(questions, list) or not questions:
            logger.warning("[AI Import] SiliconFlow returned no usable questions, falling back to local parser")
            return fallback_drafts

        normalized = []
        for index, item in enumerate(questions[:len(fallback_drafts)]):
            if not isinstance(item, dict):
                normalized.append(fallback_drafts[index])
                continue
            ai_draft = _normalize_ai_task_draft(item, index, randomize_answer_position, "ai_import")
            normalized.append(_merge_import_draft(ai_draft, fallback_drafts[index]))

        if len(normalized) < len(fallback_drafts):
            normalized.extend(fallback_drafts[len(normalized):])

        return normalized
    except HTTPException as exc:
        logger.warning("[AI Import] Falling back to local parser because AI import failed: %s", exc.detail)
        return fallback_drafts


async def _build_generated_questions_with_ai(data: AiGenerateTaskGroupRequest) -> List[dict]:
    try:
        response = await _call_siliconflow(_build_generate_messages(data))
        content = response["choices"][0]["message"]["content"]
        parsed = _extract_json_object(content)
        questions = parsed.get("questions")
        if not isinstance(questions, list) or not questions:
            raise HTTPException(status_code=502, detail="SiliconFlow returned no questions")
        return [
            _normalize_ai_task_draft(item, index, data.randomize_answer_position, "ai_generate")
            for index, item in enumerate(questions[:10])
            if isinstance(item, dict)
        ]
    except HTTPException as exc:
        logger.warning("[AI Generate] Falling back to local generator because AI generate failed: %s", exc.detail)
        return _build_generated_questions(data)


def _extract_docx_text(content: bytes) -> str:
    try:
        with zipfile.ZipFile(BytesIO(content)) as archive:
            document_xml = archive.read("word/document.xml")
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid .docx file") from exc

    try:
        root = ET.fromstring(document_xml)
        namespaces = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        paragraphs = []
        for paragraph in root.findall(".//w:p", namespaces):
            texts = [node.text for node in paragraph.findall(".//w:t", namespaces) if node.text]
            if texts:
                paragraphs.append("".join(texts))
        return "\n\n".join(paragraphs).strip()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Unable to extract text from .docx") from exc


# Import helper functions for use in other modules
__all__ = [
    "_build_import_questions_with_ai",
    "_build_generated_questions_with_ai",
    "_build_reading_import_task",
    "_extract_docx_text",
    "_normalize_ai_task_draft",
    "_merge_import_draft",
    "_build_import_question",
    "SUPPORTED_AI_TYPES",
]
