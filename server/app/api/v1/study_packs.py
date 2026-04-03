import json
import logging
import re
import zipfile
from collections import defaultdict
from io import BytesIO
from xml.etree import ElementTree as ET

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import distinct, func, select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel

from app.core.ai_client import call_siliconflow as _call_siliconflow, extract_json_object as _extract_json_object
from app.db.session import get_db
from app.models import (
    StudyPack, PracticeModule, Submission, Class, ClassEnrollment,
    TeacherProfile, StudentProfile, User, UserRole
)
from app.schemas import (
    StudyPackCreate, StudyPackUpdate, StudyPackResponse,
    PracticeModuleResponse, SubmissionCreate, SubmissionResponse
)
from app.api.v1.auth import get_current_user
from app.models import User as UserModel
from app.services.membership import FEATURE_AI_STUDY_PACKS, FEATURE_STUDY_PACKS, assert_teacher_feature_access

router = APIRouter(prefix="/study-packs", tags=["Study Packs"])
logger = logging.getLogger(__name__)

SUPPORTED_MODULE_TYPES = {"vocabulary", "sentence", "listening", "reading", "speaking"}


def _get_module_metric_mode(module: PracticeModule) -> str:
    content = module.content or {}
    if module.type in {"vocabulary", "sentence"}:
        return "correctness"
    if module.type == "speaking":
        return "completion"
    if module.type in {"listening", "reading"}:
        reference_answer = (
            str(content.get("reference_answer") or content.get("answer") or content.get("sample_answer") or "").strip()
        )
        return "correctness" if reference_answer else "response"
    return "response"


class AiImportStudyPackModuleRequest(BaseModel):
    class_id: str
    module_type: str
    raw_text: str
    title: Optional[str] = None


class AiGenerateStudyPackModuleRequest(BaseModel):
    class_id: str
    module_type: str
    prompt: str
    title: Optional[str] = None
    difficulty: str = "medium"
    estimated_minutes: Optional[int] = None


class AiGenerateStudyPackRequest(BaseModel):
    class_id: str
    prompt: str
    title: Optional[str] = None
    description: Optional[str] = None
    difficulty: str = "medium"
    target_minutes: Optional[int] = 15
    module_types: Optional[List[str]] = None


def _normalize_multiline(value) -> str:
    if isinstance(value, list):
        return "\n".join(str(item).strip() for item in value if str(item).strip())
    return str(value or "").strip()


def _normalize_text_list(value) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return [line.strip() for line in str(value or "").splitlines() if line.strip()]


def _normalize_image_fields(value) -> dict:
    if not isinstance(value, dict):
        return {}

    image_url = str(value.get("image_url") or value.get("imageUrl") or "").strip()
    image_caption = str(value.get("image_caption") or value.get("imageCaption") or "").strip()
    image_name = str(value.get("image_name") or value.get("imageName") or "").strip()

    normalized = {}
    if image_url:
        normalized["image_url"] = image_url
    if image_caption:
        normalized["image_caption"] = image_caption
    if image_name:
        normalized["image_name"] = image_name
    return normalized


def _normalize_vocabulary_items(value) -> list[dict]:
    items = []
    source = value if isinstance(value, list) else _normalize_text_list(value)

    for entry in source:
        if isinstance(entry, dict):
            word = str(entry.get("word") or "").strip()
            meaning = str(entry.get("meaning") or entry.get("translation") or "").strip()
            phonetic = str(entry.get("phonetic") or "").strip()
            image_fields = _normalize_image_fields(entry)
        else:
            parts = [part.strip() for part in str(entry).split("|")]
            word = parts[0] if len(parts) > 0 else ""
            meaning = parts[1] if len(parts) > 1 else ""
            phonetic = parts[2] if len(parts) > 2 else ""
            image_fields = {}

        if word or meaning or phonetic:
            items.append({"word": word, "meaning": meaning, "phonetic": phonetic, **image_fields})

    return items


def _normalize_sentence_items(value) -> list[dict]:
    items = []
    source = value if isinstance(value, list) else _normalize_text_list(value)

    for entry in source:
        if isinstance(entry, dict):
            sentence = str(entry.get("sentence") or "").strip()
            translation = str(entry.get("translation") or entry.get("meaning") or "").strip()
            pattern = str(entry.get("pattern") or "").strip()
            image_fields = _normalize_image_fields(entry)
        else:
            parts = [part.strip() for part in str(entry).split("|")]
            sentence = parts[0] if len(parts) > 0 else ""
            translation = parts[1] if len(parts) > 1 else ""
            pattern = parts[2] if len(parts) > 2 else ""
            image_fields = {}

        if sentence or translation or pattern:
            items.append({"sentence": sentence, "translation": translation, "pattern": pattern, **image_fields})

    return items


def _serialize_vocabulary_items(items: list[dict]) -> str:
    lines = []
    for item in items:
        parts = [
            str(item.get("word") or "").strip(),
            str(item.get("meaning") or "").strip(),
            str(item.get("phonetic") or "").strip(),
        ]
        if any(parts):
            lines.append("|".join(parts))
    return "\n".join(lines)


def _serialize_sentence_items(items: list[dict]) -> str:
    lines = []
    for item in items:
        parts = [
            str(item.get("sentence") or "").strip(),
            str(item.get("translation") or "").strip(),
            str(item.get("pattern") or "").strip(),
        ]
        if any(parts):
            lines.append("|".join(parts))
    return "\n".join(lines)


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

async def _validate_teacher_class_access(class_id: str, current_user: UserModel, db: AsyncSession):
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers can use AI module tools")

    result = await db.execute(select(TeacherProfile).where(TeacherProfile.user_id == current_user.id))
    teacher = result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher profile not found")

    result = await db.execute(select(Class).where(Class.id == class_id))
    class_obj = result.scalar_one_or_none()
    if not class_obj or class_obj.teacher_id != teacher.user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found or you don't have permission")


def _build_module_defaults(module_type: str, title: Optional[str], seed_text: str = "") -> dict:
    safe_title = (title or "").strip()
    if module_type == "vocabulary":
        items = _normalize_vocabulary_items(seed_text)
        return {
            "title": safe_title or "本课词汇回顾",
            "items": items,
            "body": _serialize_vocabulary_items(items) or seed_text.strip(),
            "hints": "",
        }
    if module_type == "sentence":
        items = _normalize_sentence_items(seed_text)
        return {
            "title": safe_title or "句型复盘",
            "items": items,
            "body": _serialize_sentence_items(items) or seed_text.strip(),
            "pattern": "",
        }
    if module_type == "listening":
        return {
            "title": safe_title or "听力训练",
            "prompt": "请先阅读提示，再完成听力任务。",
            "script": seed_text.strip(),
            "body": "",
        }
    if module_type == "reading":
        return {
            "title": safe_title or "阅读理解",
            "content": seed_text.strip(),
            "body": "请根据阅读内容完成理解与总结。",
        }
    return {
        "title": safe_title or "口语任务",
        "prompt": seed_text.strip() or "请根据提示完成口语任务。",
        "hints": "",
    }


def _build_module_defaults(module_type: str, title: Optional[str], seed_text: str = "") -> dict:
    safe_title = (title or "").strip()
    if module_type == "vocabulary":
        items = _normalize_vocabulary_items(seed_text)
        return {
            "title": safe_title or "本课词汇回顾",
            "items": items,
            "body": _serialize_vocabulary_items(items) or seed_text.strip(),
            "hints": "",
        }
    if module_type == "sentence":
        items = _normalize_sentence_items(seed_text)
        return {
            "title": safe_title or "句型复盘",
            "items": items,
            "body": _serialize_sentence_items(items) or seed_text.strip(),
            "pattern": "",
        }
    if module_type == "listening":
        return {
            "title": safe_title or "听力训练",
            "prompt": "请先阅读提示，再完成听力任务。",
            "script": seed_text.strip(),
            "body": "",
        }
    if module_type == "reading":
        return {
            "title": safe_title or "阅读理解",
            "content": seed_text.strip(),
            "body": "请根据阅读内容完成理解与总结。",
        }
    return {
        "title": safe_title or "口语任务",
        "prompt": seed_text.strip() or "请根据提示完成口语任务。",
        "hints": "",
    }


def _normalize_module_content(module_type: str, payload: dict, fallback_title: Optional[str], fallback_text: str = "") -> dict:
    base = _build_module_defaults(module_type, fallback_title, fallback_text)
    title = str(payload.get("title") or base["title"]).strip() or base["title"]
    root_image_fields = _normalize_image_fields(payload)

    if module_type == "vocabulary":
        items = _normalize_vocabulary_items(payload.get("items") or payload.get("body"))
        body = _serialize_vocabulary_items(items) or _normalize_multiline(payload.get("body")) or base["body"]
        hints = _normalize_multiline(payload.get("hints"))
        return {"title": title, "items": items, "body": body, "hints": hints}

    if module_type == "sentence":
        items = _normalize_sentence_items(payload.get("items") or payload.get("body"))
        body = _serialize_sentence_items(items) or _normalize_multiline(payload.get("body")) or base["body"]
        pattern = _normalize_multiline(payload.get("pattern") or payload.get("hints"))
        return {"title": title, "items": items, "body": body, "pattern": pattern}

    if module_type == "listening":
        return {
            "title": title,
            "prompt": str(payload.get("prompt") or base["prompt"]).strip() or base["prompt"],
            "script": _normalize_multiline(payload.get("script") or payload.get("body")) or base["script"],
            "body": _normalize_multiline(payload.get("hints") or payload.get("body") if payload.get("script") else payload.get("notes")),
            **root_image_fields,
        }

    if module_type == "reading":
        return {
            "title": title,
            "content": _normalize_multiline(payload.get("content") or payload.get("body")) or base["content"],
            "body": _normalize_multiline(payload.get("task") or payload.get("questions") or payload.get("summary")) or base["body"],
            **root_image_fields,
        }

    return {
        "title": title,
        "prompt": str(payload.get("prompt") or payload.get("body") or base["prompt"]).strip() or base["prompt"],
        "hints": _normalize_multiline(payload.get("hints") or payload.get("tips")),
        **root_image_fields,
    }


def _sanitize_module_types(module_types: Optional[List[str]]) -> list[str]:
    selected: list[str] = []
    for module_type in module_types or []:
        value = str(module_type or "").strip().lower()
        if value in SUPPORTED_MODULE_TYPES and value not in selected:
            selected.append(value)

    return selected or ["vocabulary", "sentence", "speaking"]


def _safe_int(value, default: int) -> int:
    try:
        return max(1, int(value))
    except (TypeError, ValueError):
        return default


def _fallback_pack_modules(module_types: list[str], prompt: str, target_minutes: int) -> list[dict]:
    module_count = max(1, len(module_types))
    per_module_minutes = max(3, round(target_minutes / module_count))
    modules = []

    for index, module_type in enumerate(module_types):
        content = _build_module_defaults(module_type, None, prompt)
        modules.append(
            {
                "type": module_type,
                "order": index,
                "estimated_minutes": per_module_minutes,
                "content": content,
            }
        )

    return modules


def _build_generate_pack_messages(
    prompt: str,
    title: Optional[str],
    description: Optional[str],
    difficulty: str,
    target_minutes: int,
    module_types: list[str],
) -> List[dict]:
    return [
        {
            "role": "system",
            "content": (
                "You are an assistant for an English learning platform. "
                "Generate a complete after-class study pack draft for teachers. "
                "Return JSON only with this shape:\n"
                "{title, description, modules:[{type, title, estimated_minutes, content:{...}}]}\n"
                "Supported module types: vocabulary, sentence, listening, reading, speaking.\n"
                "For vocabulary content use {title, items:[{word, meaning, phonetic}], hints:[...]}\n"
                "For sentence content use {title, items:[{sentence, translation, pattern}], pattern:[...]}\n"
                "For listening content use {title, prompt, script, hints:[...]}\n"
                "For reading content use {title, content, task}\n"
                "For speaking content use {title, prompt, hints:[...]}\n"
                "Keep the pack concise, classroom-ready, and practical for mobile learners."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Teacher title hint: {title or ''}\n"
                f"Teacher description hint: {description or ''}\n"
                f"Difficulty: {difficulty}\n"
                f"Target minutes: {target_minutes}\n"
                f"Preferred module types: {', '.join(module_types)}\n"
                f"Teacher request: {prompt}"
            ),
        },
    ]


def _normalize_pack_modules(payload: dict, module_types: list[str], target_minutes: int) -> list[dict]:
    raw_modules = payload.get("modules")
    if not isinstance(raw_modules, list) or not raw_modules:
        return []

    default_minutes = max(3, round(target_minutes / max(1, len(raw_modules))))
    modules: list[dict] = []

    for index, raw_module in enumerate(raw_modules):
        if not isinstance(raw_module, dict):
            continue

        fallback_type = module_types[index % len(module_types)]
        module_type = str(raw_module.get("type") or fallback_type).strip().lower()
        if module_type not in SUPPORTED_MODULE_TYPES or module_type not in module_types:
            module_type = fallback_type

        content_payload = raw_module.get("content") if isinstance(raw_module.get("content"), dict) else raw_module
        title = raw_module.get("title") or (content_payload.get("title") if isinstance(content_payload, dict) else None)
        normalized_content = _normalize_module_content(module_type, content_payload, title, "")
        modules.append(
            {
                "type": module_type,
                "order": index,
                "estimated_minutes": _safe_int(
                    raw_module.get("estimated_minutes") or raw_module.get("minutes"),
                    default_minutes,
                ),
                "content": normalized_content,
            }
        )

    missing_types = [module_type for module_type in module_types if module_type not in {item["type"] for item in modules}]
    for module_type in missing_types:
        modules.append(
            {
                "type": module_type,
                "order": len(modules),
                "estimated_minutes": max(3, round(target_minutes / max(1, len(module_types)))),
                "content": _build_module_defaults(module_type, None, ""),
            }
        )

    return modules


async def _build_study_pack_with_ai(
    prompt: str,
    title: Optional[str],
    description: Optional[str],
    difficulty: str,
    target_minutes: int,
    module_types: list[str],
) -> tuple[dict, str]:
    fallback_title = (title or "").strip() or "AI 生成学习包"
    fallback_title = (title or "").strip() or "AI 生成学习包"
    fallback_description = (description or "").strip() or prompt.strip()
    fallback_modules = _fallback_pack_modules(module_types, prompt, target_minutes)

    try:
        response = await _call_siliconflow(
            _build_generate_pack_messages(
                prompt=prompt,
                title=title,
                description=description,
                difficulty=difficulty,
                target_minutes=target_minutes,
                module_types=module_types,
            )
        )
        content = response["choices"][0]["message"]["content"]
        parsed = _extract_json_object(content)
        modules = _normalize_pack_modules(parsed, module_types, target_minutes)
        if not modules:
            raise ValueError("AI pack response did not contain valid modules")

        return {
            "title": str(parsed.get("title") or fallback_title).strip() or fallback_title,
            "description": str(parsed.get("description") or fallback_description).strip() or fallback_description,
            "modules": modules,
        }, "ai_generate"
    except Exception as exc:
        logger.warning("Study pack AI pack fallback used: %s", exc)
        return {
            "title": fallback_title,
            "description": fallback_description,
            "modules": fallback_modules,
        }, "manual_fallback"


def _build_import_messages(module_type: str, raw_text: str, title: Optional[str]) -> List[dict]:
    return [
        {
            "role": "system",
            "content": (
                "You are an assistant for an English learning platform. "
                "Extract teacher materials into structured module content. "
                "Return JSON only.\n"
                f"Module type: {module_type}.\n"
                "For vocabulary: {title, items:[{word, meaning, phonetic}], hints:[...]}\n"
                "For sentence: {title, items:[{sentence, translation, pattern}], pattern:[...]}\n"
                "For listening: {title, prompt, script, hints:[...]}\n"
                "For reading: {title, content, task}\n"
                "For speaking: {title, prompt, hints:[...]}\n"
                "Do not add markdown fences."
            ),
        },
        {
            "role": "user",
            "content": f"Module title: {title or ''}\nModule type: {module_type}\nPlease extract usable structured content from:\n{raw_text}",
        },
    ]


def _build_generate_messages(module_type: str, prompt: str, title: Optional[str], difficulty: str, estimated_minutes: Optional[int]) -> List[dict]:
    return [
        {
            "role": "system",
            "content": (
                "You are an assistant for an English learning platform. "
                "Generate structured study-pack module content for teachers. "
                "Return JSON only.\n"
                f"Module type: {module_type}.\n"
                "For vocabulary: {title, items:[{word, meaning, phonetic}], hints:[...]}\n"
                "For sentence: {title, items:[{sentence, translation, pattern}], pattern:[...]}\n"
                "For listening: {title, prompt, script, hints:[...]}\n"
                "For reading: {title, content, task}\n"
                "For speaking: {title, prompt, hints:[...]}\n"
                "Keep the output concise and classroom-ready."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Title hint: {title or ''}\n"
                f"Difficulty: {difficulty}\n"
                f"Estimated minutes: {estimated_minutes or 10}\n"
                f"Teacher request: {prompt}"
            ),
        },
    ]


async def _build_module_content_with_ai(module_type: str, mode: str, raw_input: str, title: Optional[str], difficulty: str = "medium", estimated_minutes: Optional[int] = None) -> tuple[dict, str]:
    if module_type not in SUPPORTED_MODULE_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported module type")

    fallback_content = _build_module_defaults(module_type, title, raw_input)

    try:
        messages = (
            _build_import_messages(module_type, raw_input, title)
            if mode == "import"
            else _build_generate_messages(module_type, raw_input, title, difficulty, estimated_minutes)
        )
        response = await _call_siliconflow(messages)
        content = response["choices"][0]["message"]["content"]
        parsed = _extract_json_object(content)
        normalized = _normalize_module_content(module_type, parsed, title, raw_input)
        return normalized, f"ai_{mode}"
    except Exception as exc:
        logger.warning("Study pack AI fallback used for %s: %s", module_type, exc)
        return fallback_content, "manual_fallback"


def _get_effective_status(status_value: str, due_date):
    if status_value == "published" and due_date:
        due_dt = due_date
        if due_dt.tzinfo is None:
            due_dt = due_dt.replace(tzinfo=timezone.utc)
        if due_dt < datetime.now(timezone.utc):
            return "expired"
    return status_value


async def _load_pack_metrics(db: AsyncSession, packs: list[StudyPack]):
    if not packs:
        return {}

    pack_ids = [pack.id for pack in packs]
    class_ids = list({pack.class_id for pack in packs})
    module_counts = {pack.id: len(pack.modules or []) for pack in packs}

    metrics = {
        pack.id: {
            "assigned_student_count": 0,
            "started_student_count": 0,
            "completed_student_count": 0,
        }
        for pack in packs
    }

    if class_ids:
        result = await db.execute(
            select(
                ClassEnrollment.class_id,
                func.count(distinct(ClassEnrollment.student_id)),
            )
            .where(
                ClassEnrollment.class_id.in_(class_ids),
                ClassEnrollment.status == "active",
            )
            .group_by(ClassEnrollment.class_id)
        )
        assigned_by_class = {class_id: count for class_id, count in result.all()}
        for pack in packs:
            metrics[pack.id]["assigned_student_count"] = assigned_by_class.get(pack.class_id, 0)

    result = await db.execute(
        select(
            Submission.study_pack_id,
            func.count(distinct(Submission.student_id)),
        )
        .where(Submission.study_pack_id.in_(pack_ids))
        .group_by(Submission.study_pack_id)
    )
    for pack_id, started_count in result.all():
        metrics[pack_id]["started_student_count"] = started_count

    result = await db.execute(
        select(
            Submission.study_pack_id,
            Submission.student_id,
            func.count(distinct(Submission.module_id)),
        )
        .where(
            Submission.study_pack_id.in_(pack_ids),
            Submission.status == "completed",
        )
        .group_by(Submission.study_pack_id, Submission.student_id)
    )

    for pack_id, _student_id, completed_module_count in result.all():
        required_modules = module_counts.get(pack_id, 0)
        if required_modules > 0 and completed_module_count >= required_modules:
            metrics[pack_id]["completed_student_count"] += 1

    for pack in packs:
        assigned = metrics[pack.id]["assigned_student_count"]
        completed = metrics[pack.id]["completed_student_count"]
        metrics[pack.id]["completion_rate"] = round((completed / assigned) * 100, 1) if assigned else 0.0

    return metrics


def _serialize_pack(
    pack: StudyPack,
    completed_module_ids: list[str] | None = None,
    metrics: dict | None = None,
    latest_submissions: list[dict] | None = None,
):
    ordered_modules = sorted(pack.modules or [], key=lambda item: item.order)
    estimated_total_minutes = sum(module.estimated_minutes or 0 for module in ordered_modules)
    completed_ids = completed_module_ids or []
    pack_metrics = metrics or {}
    effective_status = _get_effective_status(pack.status, pack.due_date)

    return {
        "id": pack.id,
        "class_id": pack.class_id,
        "title": pack.title,
        "description": pack.description,
        "status": pack.status,
        "due_date": pack.due_date,
        "created_by": pack.created_by,
        "class_name": pack.class_.name if getattr(pack, "class_", None) else None,
        "module_count": len(ordered_modules),
        "estimated_total_minutes": estimated_total_minutes,
        "completed_count": len(completed_ids),
        "completed_module_ids": completed_ids,
        "effective_status": effective_status,
        "assigned_student_count": pack_metrics.get("assigned_student_count", 0),
        "started_student_count": pack_metrics.get("started_student_count", 0),
        "completed_student_count": pack_metrics.get("completed_student_count", 0),
        "completion_rate": pack_metrics.get("completion_rate", 0.0),
        "latest_submissions": latest_submissions or [],
        "modules": [
            {
                "id": module.id,
                "study_pack_id": module.study_pack_id,
                "type": module.type,
                "content": module.content,
                "order": module.order,
                "estimated_minutes": module.estimated_minutes,
            }
            for module in ordered_modules
        ],
    }


def _normalize_compare_text(value) -> str:
    text = str(value or "").strip().lower()
    text = re.sub(r"\s+", " ", text)
    return text


def _pick_answer_value(answers, index: int):
    if not isinstance(answers, dict):
        return ""
    if index in answers:
        return answers[index]
    index_key = str(index)
    if index_key in answers:
        return answers[index_key]
    return ""


def _evaluate_open_text_answer(student_answer, expected_answer):
    expected = str(expected_answer or "").strip()
    if not expected:
        return None
    return _normalize_compare_text(student_answer) == _normalize_compare_text(expected)


def _evaluate_submission(module: PracticeModule, answers) -> dict:
    content = module.content or {}

    if module.type == "vocabulary":
        items = _normalize_vocabulary_items(content.get("items") or content.get("body"))
        results = []
        correct_count = 0
        for index, item in enumerate(items):
            student_answer = str(_pick_answer_value(answers, index) or "").strip()
            expected_answer = str(item.get("meaning") or "").strip()
            is_correct = _evaluate_open_text_answer(student_answer, expected_answer)
            if is_correct:
                correct_count += 1
            results.append(
                {
                    "index": index,
                    "prompt": str(item.get("word") or "").strip(),
                    "student_answer": student_answer,
                    "expected_answer": expected_answer,
                    "is_correct": is_correct,
                    "image_url": item.get("image_url"),
                    "image_caption": item.get("image_caption"),
                }
            )
        total_count = len(results)
        return {
            "overall_status": "graded",
            "correct_count": correct_count,
            "total_count": total_count,
            "score": round(correct_count / total_count, 4) if total_count else None,
            "items": results,
        }

    if module.type == "sentence":
        items = _normalize_sentence_items(content.get("items") or content.get("body"))
        results = []
        correct_count = 0
        for index, item in enumerate(items):
            student_answer = str(_pick_answer_value(answers, index) or "").strip()
            expected_answer = str(item.get("translation") or "").strip()
            is_correct = _evaluate_open_text_answer(student_answer, expected_answer)
            if is_correct:
                correct_count += 1
            results.append(
                {
                    "index": index,
                    "prompt": str(item.get("sentence") or "").strip(),
                    "student_answer": student_answer,
                    "expected_answer": expected_answer,
                    "is_correct": is_correct,
                    "image_url": item.get("image_url"),
                    "image_caption": item.get("image_caption"),
                }
            )
        total_count = len(results)
        return {
            "overall_status": "graded",
            "correct_count": correct_count,
            "total_count": total_count,
            "score": round(correct_count / total_count, 4) if total_count else None,
            "items": results,
        }

    if module.type in {"listening", "reading"}:
        student_answer = answers.get("text") if isinstance(answers, dict) and "text" in answers else answers
        student_answer = str(student_answer or "").strip()
        expected_answer = (
            str(content.get("reference_answer") or content.get("answer") or content.get("sample_answer") or "").strip()
        )
        is_correct = _evaluate_open_text_answer(student_answer, expected_answer)
        return {
            "overall_status": "graded" if is_correct is not None else "submitted",
            "correct_count": 1 if is_correct else 0,
            "total_count": 1,
            "score": (1.0 if is_correct else 0.0) if is_correct is not None else None,
            "items": [
                {
                    "index": 0,
                    "prompt": str(content.get("prompt") or content.get("title") or "").strip(),
                    "student_answer": student_answer,
                    "expected_answer": expected_answer,
                    "is_correct": is_correct,
                    "image_url": content.get("image_url"),
                    "image_caption": content.get("image_caption"),
                }
            ],
        }

    if module.type == "speaking":
        answer_data = answers if isinstance(answers, dict) else {"text": str(answers or "").strip()}
        return {
            "overall_status": "submitted",
            "correct_count": 0,
            "total_count": 0,
            "score": None,
            "items": [
                {
                    "index": 0,
                    "prompt": str(content.get("prompt") or content.get("title") or "").strip(),
                    "student_answer": answer_data.get("text") or "",
                    "expected_answer": "",
                    "is_correct": None,
                    "audio_url": answer_data.get("audio_url"),
                    "duration": answer_data.get("duration"),
                    "image_url": content.get("image_url"),
                    "image_caption": content.get("image_caption"),
                }
            ],
        }

    return {
        "overall_status": "submitted",
        "correct_count": 0,
        "total_count": 0,
        "score": None,
        "items": [],
    }


def _serialize_submission(submission: Submission, module_by_id: dict[str, PracticeModule] | None = None) -> dict:
    module = module_by_id.get(submission.module_id) if module_by_id and submission.module_id else None
    result = _evaluate_submission(module, submission.answers) if module else None
    return {
        "id": submission.id,
        "study_pack_id": submission.study_pack_id,
        "student_id": submission.student_id,
        "module_id": submission.module_id,
        "answers": submission.answers,
        "score": result.get("score") if result and result.get("score") is not None else submission.score,
        "status": submission.status,
        "submitted_at": submission.submitted_at,
        "result": result,
    }


def _latest_submission_map(submissions: list[Submission]) -> dict[str, Submission]:
    latest_by_module: dict[str, Submission] = {}
    ordered = sorted(
        [submission for submission in submissions if submission.module_id],
        key=lambda item: item.submitted_at or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    for submission in ordered:
        if submission.module_id not in latest_by_module:
            latest_by_module[submission.module_id] = submission
    return latest_by_module


@router.get("", response_model=List[StudyPackResponse])
async def get_study_packs(
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all study packs accessible to the current user."""
    if current_user.role == UserRole.TEACHER:
        # Get teacher's study packs
        result = await db.execute(select(TeacherProfile).where(TeacherProfile.user_id == current_user.id))
        teacher = result.scalar_one_or_none()

        if not teacher:
            return []

        result = await db.execute(
            select(StudyPack)
            .where(StudyPack.created_by == teacher.user_id)
            .options(selectinload(StudyPack.modules), selectinload(StudyPack.class_))
        )
        packs = result.scalars().all()
        metrics_map = await _load_pack_metrics(db, packs)
        return [_serialize_pack(pack, metrics=metrics_map.get(pack.id)) for pack in packs]
    else:
        # Student - get study packs from enrolled classes
        result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
        student = result.scalar_one_or_none()

        if not student:
            return []

        result = await db.execute(
            select(StudyPack)
            .join(Class)
            .join(ClassEnrollment)
            .where(
                ClassEnrollment.student_id == student.user_id,
                StudyPack.status == "published",
            )
            .options(selectinload(StudyPack.modules), selectinload(StudyPack.class_))
        )
        packs = result.scalars().all()
        pack_ids = [pack.id for pack in packs]
        completed_map: dict[str, list[str]] = {}

        if pack_ids:
            result = await db.execute(
                select(Submission)
                .where(
                    Submission.student_id == student.user_id,
                    Submission.study_pack_id.in_(pack_ids),
                )
            )
            submissions_by_pack: dict[str, list[Submission]] = defaultdict(list)
            for submission in result.scalars().all():
                submissions_by_pack[submission.study_pack_id].append(submission)

            for pack_id, submissions in submissions_by_pack.items():
                completed_map[pack_id] = list(_latest_submission_map(submissions).keys())

        metrics_map = await _load_pack_metrics(db, packs)
        return [
            _serialize_pack(
                pack,
                completed_map.get(pack.id, []),
                metrics_map.get(pack.id),
            )
            for pack in packs
        ]


@router.post("/ai-import")
async def ai_import_study_pack_module(
    data: AiImportStudyPackModuleRequest,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _validate_teacher_class_access(data.class_id, current_user, db)
    await assert_teacher_feature_access(db, current_user.id, FEATURE_AI_STUDY_PACKS)
    if data.module_type not in SUPPORTED_MODULE_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported module type")
    if not (data.raw_text or "").strip():
        raise HTTPException(status_code=400, detail="No importable content found")

    content, source = await _build_module_content_with_ai(
        module_type=data.module_type,
        mode="import",
        raw_input=data.raw_text,
        title=data.title,
    )
    return {
        "module_type": data.module_type,
        "content": content,
        "source": source,
    }


@router.post("/ai-generate")
async def ai_generate_study_pack_module(
    data: AiGenerateStudyPackModuleRequest,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _validate_teacher_class_access(data.class_id, current_user, db)
    await assert_teacher_feature_access(db, current_user.id, FEATURE_AI_STUDY_PACKS)
    if data.module_type not in SUPPORTED_MODULE_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported module type")
    if not (data.prompt or "").strip():
        raise HTTPException(status_code=400, detail="Prompt is required")

    content, source = await _build_module_content_with_ai(
        module_type=data.module_type,
        mode="generate",
        raw_input=data.prompt,
        title=data.title,
        difficulty=data.difficulty,
        estimated_minutes=data.estimated_minutes,
    )
    return {
        "module_type": data.module_type,
        "content": content,
        "source": source,
    }


@router.post("/ai-generate-pack")
async def ai_generate_study_pack(
    data: AiGenerateStudyPackRequest,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _validate_teacher_class_access(data.class_id, current_user, db)
    await assert_teacher_feature_access(db, current_user.id, FEATURE_AI_STUDY_PACKS)
    if not (data.prompt or "").strip():
        raise HTTPException(status_code=400, detail="Prompt is required")

    module_types = _sanitize_module_types(data.module_types)
    pack_target_minutes = _safe_int(data.target_minutes, 15)
    pack_draft, source = await _build_study_pack_with_ai(
        prompt=data.prompt.strip(),
        title=data.title,
        description=data.description,
        difficulty=data.difficulty,
        target_minutes=pack_target_minutes,
        module_types=module_types,
    )
    return {
        **pack_draft,
        "source": source,
    }


@router.post("/ai-import-docx")
async def ai_import_study_pack_module_docx(
    class_id: str = Form(...),
    module_type: str = Form(...),
    title: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _validate_teacher_class_access(class_id, current_user, db)
    await assert_teacher_feature_access(db, current_user.id, FEATURE_AI_STUDY_PACKS)
    if module_type not in SUPPORTED_MODULE_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported module type")

    filename = file.filename or ""
    if not filename.lower().endswith(".docx"):
        raise HTTPException(status_code=400, detail="Only .docx files are supported")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB")

    raw_text = _extract_docx_text(content)
    if not raw_text:
        raise HTTPException(status_code=400, detail="No importable content found in the .docx file")

    normalized_content, source = await _build_module_content_with_ai(
        module_type=module_type,
        mode="import",
        raw_input=raw_text,
        title=title,
    )
    return {
        "module_type": module_type,
        "content": normalized_content,
        "source": source,
    }


@router.get("/{pack_id}", response_model=StudyPackResponse)
async def get_study_pack(
    pack_id: str,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific study pack by ID."""
    result = await db.execute(
        select(StudyPack)
        .where(StudyPack.id == pack_id)
        .options(selectinload(StudyPack.modules), selectinload(StudyPack.class_))
    )
    pack = result.scalar_one_or_none()

    if not pack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study pack not found",
        )

    completed_module_ids: list[str] = []
    latest_submissions: list[dict] = []
    if current_user.role == UserRole.STUDENT:
        result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
        student = result.scalar_one_or_none()
        if student:
            result = await db.execute(
                select(Submission)
                .where(
                    Submission.student_id == student.user_id,
                    Submission.study_pack_id == pack.id,
                )
            )
            latest_map = _latest_submission_map(result.scalars().all())
            completed_module_ids = list(latest_map.keys())
            module_by_id = {module.id: module for module in pack.modules or []}
            latest_submissions = [
                _serialize_submission(latest_map[module.id], module_by_id)
                for module in sorted(pack.modules or [], key=lambda item: item.order)
                if module.id in latest_map
            ]

    metrics_map = await _load_pack_metrics(db, [pack])
    return _serialize_pack(pack, completed_module_ids, metrics_map.get(pack.id), latest_submissions)


@router.post("", response_model=StudyPackResponse, status_code=status.HTTP_201_CREATED)
async def create_study_pack(
    pack_data: StudyPackCreate,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new study pack (teachers only)."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can create study packs",
        )

    # Get teacher profile
    result = await db.execute(select(TeacherProfile).where(TeacherProfile.user_id == current_user.id))
    teacher = result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher profile not found",
        )

    await assert_teacher_feature_access(db, teacher.user_id, FEATURE_STUDY_PACKS)

    # Verify class exists and belongs to teacher
    result = await db.execute(select(Class).where(Class.id == pack_data.class_id))
    class_obj = result.scalar_one_or_none()

    if not class_obj or class_obj.teacher_id != teacher.user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found or you don't have permission",
        )

    # Create study pack
    new_pack = StudyPack(
        class_id=pack_data.class_id,
        title=pack_data.title,
        description=pack_data.description,
        due_date=pack_data.due_date,
        created_by=teacher.user_id,
        status="draft",
    )

    db.add(new_pack)
    await db.flush()

    # Add modules if provided
    if pack_data.modules:
        for idx, module_data in enumerate(pack_data.modules):
            module = PracticeModule(
                study_pack_id=new_pack.id,
                type=module_data.type.value,
                content=module_data.content,
                order=module_data.order if module_data.order else idx,
                estimated_minutes=module_data.estimated_minutes,
            )
            db.add(module)

    await db.commit()
    await db.refresh(new_pack)

    # Get modules
    result = await db.execute(
        select(PracticeModule)
        .where(PracticeModule.study_pack_id == new_pack.id)
        .order_by(PracticeModule.order)
    )
    modules = result.scalars().all()

    return {
        "id": new_pack.id,
        "class_id": new_pack.class_id,
        "title": new_pack.title,
        "description": new_pack.description,
        "status": new_pack.status,
        "due_date": new_pack.due_date,
        "created_by": new_pack.created_by,
        "modules": [
            {
                "id": m.id,
                "study_pack_id": m.study_pack_id,
                "type": m.type,
                "content": m.content,
                "order": m.order,
                "estimated_minutes": m.estimated_minutes,
            }
            for m in modules
        ],
    }


@router.post("/submissions", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
async def submit_answer(
    submission_data: SubmissionCreate,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit an answer for a practice module (students only)."""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can submit answers",
        )

    # Get student profile
    result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found",
        )

    # Verify study pack exists
    result = await db.execute(select(StudyPack).where(StudyPack.id == submission_data.study_pack_id))
    pack = result.scalar_one_or_none()

    if not pack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study pack not found",
        )

    result = await db.execute(
        select(PracticeModule).where(
            PracticeModule.id == submission_data.module_id,
            PracticeModule.study_pack_id == submission_data.study_pack_id,
        )
    )
    module = result.scalar_one_or_none()

    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Practice module not found",
        )

    evaluation = _evaluate_submission(module, submission_data.answers)

    # Create submission
    submission = Submission(
        study_pack_id=submission_data.study_pack_id,
        student_id=student.user_id,
        module_id=submission_data.module_id,
        answers=submission_data.answers,
        score=evaluation.get("score"),
        status="completed",
        submitted_at=datetime.now(timezone.utc),
    )

    db.add(submission)
    await db.commit()
    await db.refresh(submission)

    return _serialize_submission(submission, {module.id: module})


@router.patch("/{pack_id}")
async def update_study_pack(
    pack_id: str,
    pack_data: StudyPackUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a study pack (teachers only)."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can update study packs",
        )

    # Get study pack
    result = await db.execute(select(StudyPack).where(StudyPack.id == pack_id))
    pack = result.scalar_one_or_none()

    if not pack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study pack not found",
        )

    # Verify ownership
    result = await db.execute(select(TeacherProfile).where(TeacherProfile.user_id == current_user.id))
    teacher = result.scalar_one_or_none()

    if not teacher or pack.created_by != teacher.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this pack",
        )

    # Update fields
    if pack_data.title is not None:
        pack.title = pack_data.title
    if pack_data.description is not None:
        pack.description = pack_data.description
    if pack_data.due_date is not None:
        pack.due_date = pack_data.due_date
    if pack_data.status is not None:
        pack.status = pack_data.status

    if pack_data.modules is not None:
        result = await db.execute(
            select(PracticeModule).where(PracticeModule.study_pack_id == pack.id)
        )
        for module in result.scalars().all():
            await db.delete(module)

        await db.flush()

        for idx, module_data in enumerate(pack_data.modules):
            module = PracticeModule(
                study_pack_id=pack.id,
                type=module_data.type.value,
                content=module_data.content,
                order=module_data.order if module_data.order is not None else idx,
                estimated_minutes=module_data.estimated_minutes,
            )
            db.add(module)

    await db.commit()
    result = await db.execute(
        select(StudyPack)
        .where(StudyPack.id == pack.id)
        .options(selectinload(StudyPack.modules), selectinload(StudyPack.class_))
    )
    updated_pack = result.scalar_one()

    metrics_map = await _load_pack_metrics(db, [updated_pack])
    return _serialize_pack(updated_pack, metrics=metrics_map.get(updated_pack.id))


@router.post("/{pack_id}/publish")
async def publish_study_pack(
    pack_id: str,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Publish a study pack to make it available to students."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can publish study packs",
        )

    # Get study pack
    result = await db.execute(select(StudyPack).where(StudyPack.id == pack_id))
    pack = result.scalar_one_or_none()

    if not pack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study pack not found",
        )

    # Verify ownership
    result = await db.execute(select(TeacherProfile).where(TeacherProfile.user_id == current_user.id))
    teacher = result.scalar_one_or_none()

    if not teacher or pack.created_by != teacher.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to publish this pack",
        )

    pack.status = "published"
    await db.commit()

    # Notify all enrolled students about the new study pack
    from app.api.v1.notifications import create_bulk_notifications
    from app.models import NotificationType, ClassEnrollment

    result = await db.execute(
        select(ClassEnrollment.student_id)
        .where(
            ClassEnrollment.class_id == pack.class_id,
            ClassEnrollment.status == "active"
        )
    )
    student_ids = [row[0] for row in result.all()]

    if student_ids:
        await create_bulk_notifications(
            db=db,
            user_ids=student_ids,
            type=NotificationType.STUDY_PACK_ASSIGNED,
            title=f"新学习包：{pack.title}",
            content=pack.description or "老师发布了新的学习包，快来完成吧！",
            data={"pack_id": pack.id, "class_id": pack.class_id}
        )

    result = await db.execute(
        select(StudyPack)
        .where(StudyPack.id == pack.id)
        .options(selectinload(StudyPack.modules), selectinload(StudyPack.class_))
    )
    published_pack = result.scalar_one()

    metrics_map = await _load_pack_metrics(db, [published_pack])
    return _serialize_pack(published_pack, metrics=metrics_map.get(published_pack.id))


@router.get("/{pack_id}/analytics")
async def get_study_pack_analytics(
    pack_id: str,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can view study pack analytics",
        )

    result = await db.execute(select(TeacherProfile).where(TeacherProfile.user_id == current_user.id))
    teacher = result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher profile not found")

    result = await db.execute(
        select(StudyPack)
        .where(StudyPack.id == pack_id)
        .options(selectinload(StudyPack.modules), selectinload(StudyPack.class_))
    )
    pack = result.scalar_one_or_none()
    if not pack:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study pack not found")
    if pack.created_by != teacher.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to view this pack")

    result = await db.execute(
        select(ClassEnrollment.student_id, User.name)
        .join(User, User.id == ClassEnrollment.student_id)
        .where(
            ClassEnrollment.class_id == pack.class_id,
            ClassEnrollment.status == "active",
        )
    )
    active_students = [{"student_id": student_id, "student_name": student_name} for student_id, student_name in result.all()]

    result = await db.execute(
        select(Submission)
        .where(Submission.study_pack_id == pack.id)
        .order_by(Submission.submitted_at.desc())
    )
    submissions = result.scalars().all()

    latest_by_student_module: dict[tuple[str, str], Submission] = {}
    for submission in submissions:
        if not submission.module_id:
            continue
        key = (submission.student_id, submission.module_id)
        if key not in latest_by_student_module:
            latest_by_student_module[key] = submission

    ordered_modules = sorted(pack.modules or [], key=lambda item: item.order)
    module_by_id = {module.id: module for module in ordered_modules}
    module_stats: list[dict] = []
    module_primary_rates: list[float] = []
    module_primary_labels: list[str] = []

    for module in ordered_modules:
        relevant = [submission for (student_id, module_id), submission in latest_by_student_module.items() if module_id == module.id]
        graded_scores = [submission.score for submission in relevant if submission.score is not None]
        graded_serialized = [_serialize_submission(submission, module_by_id) for submission in relevant]
        graded_results = [item["result"] for item in graded_serialized]
        correct_count = sum(result.get("correct_count", 0) for result in graded_results if result)
        total_count = sum(result.get("total_count", 0) for result in graded_results if result)
        metric_mode = _get_module_metric_mode(module)
        submitted_count = len(relevant)
        completion_rate = round((submitted_count / len(active_students)) * 100, 1) if active_students else 0.0
        response_rate = completion_rate
        correct_rate = round((correct_count / total_count) * 100, 1) if total_count else 0.0

        if metric_mode == "correctness":
            primary_label = "正确率"
            primary_rate = correct_rate
        elif metric_mode == "completion":
            primary_label = "完成率"
            primary_rate = completion_rate
        else:
            primary_label = "作答率"
            primary_rate = response_rate

        module_primary_rates.append(primary_rate)
        module_primary_labels.append(primary_label)

        sample_answers = []
        for serialized in graded_serialized[:5]:
            result = serialized.get("result") or {}
            items = result.get("items") or []
            answer_text = ""
            if items:
                first_item = items[0]
                answer_text = str(first_item.get("student_answer") or "").strip()
            if not answer_text and isinstance(serialized.get("answers"), dict):
                answer_text = json.dumps(serialized["answers"], ensure_ascii=False)
            elif not answer_text:
                answer_text = str(serialized.get("answers") or "").strip()
            if answer_text:
                sample_answers.append(
                    {
                        "student_id": serialized["student_id"],
                        "student_name": next((student["student_name"] for student in active_students if student["student_id"] == serialized["student_id"]), ""),
                        "answer": answer_text,
                    }
                )

        module_stats.append(
            {
                "module_id": module.id,
                "module_type": module.type,
                "module_title": str((module.content or {}).get("title") or module.type),
                "submitted_count": submitted_count,
                "avg_score": round((sum(graded_scores) / len(graded_scores)) * 100, 1) if graded_scores else None,
                "correct_count": correct_count,
                "total_count": total_count,
                "metric_mode": metric_mode,
                "primary_label": primary_label,
                "primary_rate": primary_rate,
                "completion_rate": completion_rate,
                "response_rate": response_rate,
                "correct_rate": correct_rate,
                "sample_answers": sample_answers,
            }
        )

    student_records: list[dict] = []
    for student in active_students:
        module_results: list[dict] = []
        completed_modules = 0
        score_values: list[float] = []
        latest_submitted_at = None

        for module in ordered_modules:
            submission = latest_by_student_module.get((student["student_id"], module.id))
            if not submission:
                module_results.append(
                    {
                        "module_id": module.id,
                        "module_type": module.type,
                        "module_title": str((module.content or {}).get("title") or module.type),
                        "status": "not_started",
                        "score": None,
                        "submitted_at": None,
                    }
                )
                continue

            serialized = _serialize_submission(submission, module_by_id)
            completed_modules += 1
            if serialized["score"] is not None:
                score_values.append(float(serialized["score"]))
            if not latest_submitted_at or (submission.submitted_at and submission.submitted_at > latest_submitted_at):
                latest_submitted_at = submission.submitted_at
            module_results.append(
                {
                    "module_id": module.id,
                    "module_type": module.type,
                    "module_title": str((module.content or {}).get("title") or module.type),
                    "status": "completed",
                    "score": round(float(serialized["score"]) * 100, 1) if serialized["score"] is not None else None,
                    "submitted_at": submission.submitted_at,
                    "result": serialized["result"],
                }
            )

        student_records.append(
            {
                "student_id": student["student_id"],
                "student_name": student["student_name"],
                "completed_modules": completed_modules,
                "total_modules": len(ordered_modules),
                "avg_score": round((sum(score_values) / len(score_values)) * 100, 1) if score_values else None,
                "latest_submitted_at": latest_submitted_at,
                "module_results": module_results,
            }
        )

    metrics_map = await _load_pack_metrics(db, [pack])
    summary = {
        **(metrics_map.get(pack.id) or {}),
        "module_count": len(ordered_modules),
        "summary_label": module_primary_labels[0] if module_primary_labels and len(set(module_primary_labels)) == 1 else "平均主指标",
        "summary_rate": round(sum(module_primary_rates) / len(module_primary_rates), 1) if module_primary_rates else 0.0,
    }

    return {
        "pack_id": pack.id,
        "summary": summary,
        "module_stats": module_stats,
        "student_records": student_records,
    }
