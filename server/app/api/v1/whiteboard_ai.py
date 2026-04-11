"""Whiteboard AI assistant endpoints."""

from __future__ import annotations

import base64
import logging
import math
from typing import Literal, Optional

import httpx
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import select

from app.core.dashscope_client import call_dashscope, call_dashscope_image_gen
from app.db.session import async_session_maker
from app.models import ActivityType, LiveSession
from app.services.activity_logger import log_activity

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/whiteboard-ai", tags=["Whiteboard AI"])


class WhiteboardAiRequest(BaseModel):
    action: Literal["reference", "generate_image", "free_question", "voice_explain"]
    question: Optional[str] = ""
    template_id: Optional[str] = "general"
    context: dict
    image_base64: Optional[str] = None
    history: Optional[list[dict]] = None


PROMPT_TEMPLATES = {
    "reference": {
        "system": (
            "你是课堂白板 AI 助手。"
            "请基于老师当前整张白板内容、任务标题和题目内容回答问题。"
            "回答要准确、简洁，适合老师课堂直接使用。"
        ),
        "user_template": "当前白板上下文：\n{context}\n\n老师的问题：{question}",
    },
    "generate_image": {
        "system": (
            "你是课堂视觉辅助助手。"
            "请根据老师的描述生成适合课堂展示的图片提示词内容。"
        ),
        "user_template": "请根据以下需求生成课堂图片：\n{question}\n\n参考上下文：\n{context}",
    },
    "free_question": {
        "system": (
            "你是课堂辅助 AI。"
            "请基于老师提供的白板和任务上下文回答问题，回复适合课堂直接使用。"
        ),
        "user_template": "{context}\n\n老师的问题：{question}",
    },
    "voice_explain": {
        "system": (
            "你是课堂 AI 副班。"
            "请基于老师当前整张白板的内容，生成一段适合课堂直接讲解的口语稿。"
            "要求："
            "1) 使用自然、口语化、便于老师直接念出的，根据老师要求使用中文或英文；"
            "2) 默认控制在 20 到 40 秒，最长不超过 60 秒；"
            "3) 只输出讲解稿正文，不要标题、编号或提示语；"
            '4) 不要出现"作为 AI""根据图片"等元话术。'
        ),
        "user_template": "当前白板上下文：\n{context}\n\n讲解要求：{question}",
    },
}

TEMPLATE_STYLE_INSTRUCTIONS = {
    "general": "回答风格：课堂通用，表达清楚、可直接口头使用。",
    "concise": "回答风格：高效精讲，优先给出结构化要点，句子更短。",
    "socratic": "回答风格：启发提问，先给关键结论，再给2-3个追问引导学生思考。",
    "encouraging": "回答风格：鼓励引导，语气积极，帮助学生建立信心。",
}


def resolve_template_style(template_id: str | None) -> str:
    key = (template_id or "general").strip().lower()
    return TEMPLATE_STYLE_INSTRUCTIONS.get(key, TEMPLATE_STYLE_INSTRUCTIONS["general"])


def build_context_text(context: dict) -> str:
    parts: list[str] = []
    if context.get("whiteboard_text"):
        parts.append(f"白板文本：\n{context['whiteboard_text']}")
    if context.get("task_title"):
        parts.append(f"当前任务：{context['task_title']}")
    if context.get("task_questions"):
        questions = "\n".join([str(item) for item in context["task_questions"] if item])
        if questions:
            parts.append(f"题目内容：\n{questions}")
    return "\n\n".join(parts)


def _extract_text(result) -> str:
    if not result:
        return ""
    if isinstance(result, list) and result:
        first = result[0]
        if isinstance(first, dict):
            if "text" in first:
                return first["text"]
            message = first.get("message", {})
            content = message.get("content", [])
            if isinstance(content, list) and content:
                first_content = content[0]
                if isinstance(first_content, dict) and "text" in first_content:
                    return first_content["text"]
            if isinstance(message.get("content"), str):
                return message["content"]
        return str(first)
    return str(result)


def _estimate_seconds(script: str) -> int:
    char_count = max(len(script.strip()), 1)
    estimated = math.ceil(char_count / 5)
    return max(20, min(60, estimated))


def _build_voice_title(context: dict, question: str | None) -> str:
    base = (context.get("task_title") or "").strip()
    if base:
        return f"{base}讲解"
    if question and question.strip():
        trimmed = question.strip()
        return trimmed[:18] if len(trimmed) > 18 else trimmed
    return "当前白板讲解"


def _voice_explain_instruction(question: str | None) -> str:
    if question and question.strip():
        return question.strip()
    return "请直接生成一段适合课堂口头讲解的说明。"


async def _log_ai_usage(context: dict, action: str) -> None:
    session_id = context.get("session_id")
    if not session_id:
        return
    try:
        async with async_session_maker() as db:
            result = await db.execute(select(LiveSession).where(LiveSession.id == session_id))
            session = result.scalar_one_or_none()
            if not session:
                return
            await log_activity(
                db,
                session.teacher_id,
                ActivityType.AI_ASSISTANT_USE,
                f"使用 AI 副班：{action}",
                entity_type="whiteboard_ai",
                extra_data={"action": action},
            )
    except Exception:
        logger.debug("[WhiteboardAI] failed to log activity", exc_info=True)


@router.post("/respond")
async def whiteboard_ai_respond(request: WhiteboardAiRequest):
    if request.action not in PROMPT_TEMPLATES:
        raise HTTPException(status_code=400, detail=f"Unsupported action: {request.action}")

    template = PROMPT_TEMPLATES[request.action]
    style_instruction = resolve_template_style(request.template_id)
    has_image = bool(request.image_base64)
    context_text = build_context_text(request.context or {})

    if not context_text and not has_image and not request.question:
        raise HTTPException(status_code=400, detail="请输入问题或提供白板内容")

    if request.action == "voice_explain":
        user_content = template["user_template"].format(
            context=context_text or "暂无白板文本，仅基于当前任务上下文讲解。",
            question=_voice_explain_instruction(request.question),
        )
    elif not context_text:
        user_content = f"老师的问题：{request.question or ''}"
    else:
        user_content = template["user_template"].format(
            context=context_text,
            question=request.question or "",
        )

    try:
        logger.info(
            "[WhiteboardAI] action=%s template_id=%s has_image=%s context_keys=%s",
            request.action,
            request.template_id,
            has_image,
            list((request.context or {}).keys()),
        )

        if request.action == "generate_image":
            if not (request.question or "").strip():
                raise HTTPException(status_code=400, detail="生成图片需要输入描述")

            gen_result = await call_dashscope_image_gen(request.question, request.image_base64)
            image_url = gen_result.get("image_url")
            if not image_url:
                code = gen_result.get("code")
                message = gen_result.get("message") or code or "图片生成失败"
                raise HTTPException(status_code=500, detail=message)

            async with httpx.AsyncClient(timeout=30) as img_client:
                img_resp = await img_client.get(image_url, follow_redirects=True)
                img_resp.raise_for_status()
                img_data = img_resp.content

            await _log_ai_usage(request.context or {}, request.action)
            return {"type": "image", "content": base64.b64encode(img_data).decode("utf-8")}

        messages = [{"role": "system", "content": f"{template['system']}\n\n{style_instruction}"}]
        if request.history:
            for item in request.history[-30:]:
                role = item.get("role")
                content = item.get("content", "")
                if role in ("user", "assistant") and content:
                    messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": user_content})

        if has_image:
            image_url = f"data:image/jpeg;base64,{request.image_base64}"
            result = await call_dashscope(messages, image_url=image_url)
        else:
            result = await call_dashscope(messages)

        content = _extract_text(result).strip()
        await _log_ai_usage(request.context or {}, request.action)

        if request.action == "voice_explain":
            return {
                "type": "voice_explain",
                "content": content,
                "parsed": {
                    "title": _build_voice_title(request.context or {}, request.question),
                    "script": content,
                    "estimated_seconds": _estimate_seconds(content),
                },
            }

        return {"type": "text", "content": content, "parsed": {"content": content}}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("[WhiteboardAI] error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="AI 服务调用失败")


@router.post("/speech-to-text")
async def speech_to_text(audio: UploadFile = File(...)):
    """Transcribe audio using DashScope qwen3-asr-flash (OpenAI compatible)."""
    try:
        from app.core.config import get_settings

        settings = get_settings()
        audio_bytes = await audio.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="音频数据为空")

        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        data_uri = f"data:audio/webm;base64,{audio_b64}"
        url = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.DASHSCOPE_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "qwen3-asr-flash",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_audio",
                            "input_audio": {"data": data_uri},
                        }
                    ],
                }
            ],
            "stream": False,
            "asr_options": {"enable_itn": False},
        }

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code != 200:
                detail = response.text[:500]
                logger.error("[SpeechToText] DashScope error %s: %s", response.status_code, detail)
                raise HTTPException(status_code=502, detail=f"DashScope 返回错误: {detail}")
            result = response.json()

        choices = result.get("choices", [])
        text = ""
        if choices:
            message = choices[0].get("message", {})
            text = message.get("content", "").strip()

        if not text:
            raise HTTPException(status_code=400, detail="语音识别失败，未检测到有效语音")

        return {"text": text}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("[SpeechToText] unhandled error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"语音识别异常: {exc}")
