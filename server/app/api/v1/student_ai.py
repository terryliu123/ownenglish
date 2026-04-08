"""学生端 AI 助手接口。"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.core.dashscope_client import call_dashscope
from app.db.session import get_db
from app.models import Class, User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/student-ai")

DEFAULT_AI_SETTINGS = {
    "enabled": False,
    "system_prompt": (
        "你是一位面向学生的课堂学习助手。"
        "你只能帮助学生理解题意、提示解题方向、解释相关概念，不能直接代做题目。"
        "请用简洁、清楚、鼓励性的中文回答。"
    ),
    "max_output_length": 500,
    "show_reasoning": False,
    "photo_qa_enabled": True,
    "free_question_enabled": True,
}


class StudentAiRequest(BaseModel):
    action: str
    question: Optional[str] = ""
    context: dict
    image_base64: Optional[str] = None


def _parse_settings(raw) -> dict:
    if not raw:
        return DEFAULT_AI_SETTINGS.copy()
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            return DEFAULT_AI_SETTINGS.copy()
        return {**DEFAULT_AI_SETTINGS, **parsed}
    return {**DEFAULT_AI_SETTINGS, **raw}


def _extract_text_from_dashscope_result(result) -> str:
    if not result:
        return ""
    if isinstance(result, list) and result:
        first = result[0]
        if isinstance(first, dict):
            message = first.get("message", {})
            content = message.get("content", [])
            if isinstance(content, list) and content:
                first_content = content[0]
                if isinstance(first_content, dict) and "text" in first_content:
                    return first_content["text"]
            if "text" in first:
                return first["text"]
            if isinstance(message.get("content"), str):
                return message["content"]
        return str(first)
    if isinstance(result, dict):
        if "text" in result:
            return result["text"]
        message = result.get("message", {})
        content = message.get("content", [])
        if isinstance(content, list) and content:
            first_content = content[0]
            if isinstance(first_content, dict) and "text" in first_content:
                return first_content["text"]
        if isinstance(content, str):
            return content
    return str(result)


@router.post("/respond")
async def student_ai_respond(
    request: StudentAiRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """学生端 AI 问答主接口。"""
    class_id = request.context.get("class_id") if request.context else None
    if not class_id:
        raise HTTPException(status_code=400, detail="缺少 class_id")

    class_result = await db.execute(select(Class).where(Class.id == class_id))
    class_obj = class_result.scalar_one_or_none()
    if not class_obj:
        raise HTTPException(status_code=404, detail="班级不存在")

    ai_settings = _parse_settings(class_obj.ai_settings)
    if not ai_settings.get("enabled", False):
        raise HTTPException(status_code=403, detail="学生端 AI 未开启")

    if request.action == "photo_qa" and not ai_settings.get("photo_qa_enabled", True):
        raise HTTPException(status_code=403, detail="拍照问答未开启")
    if request.action == "free_question" and not ai_settings.get("free_question_enabled", True):
        raise HTTPException(status_code=403, detail="自由提问未开启")

    question = (request.question or "").strip()
    if request.action == "free_question" and not question:
        raise HTTPException(status_code=400, detail="请输入问题")
    if request.action == "photo_qa" and (not question or not request.image_base64):
        raise HTTPException(status_code=400, detail="拍照问答需要图片和问题")

    system_prompt = ai_settings.get("system_prompt", DEFAULT_AI_SETTINGS["system_prompt"])
    max_output_length = ai_settings.get("max_output_length", 500)

    if request.action == "photo_qa":
        user_content = f"学生上传了一张学习材料图片。\n学生的问题：{question}\n请基于图片内容回答。"
    else:
        user_content = f"学生的问题：{question}\n请直接回答，并优先给出思路与提示。"

    try:
        logger.info(
            "[StudentAI] class=%s user=%s action=%s has_image=%s",
            class_id,
            current_user.id,
            request.action,
            bool(request.image_base64),
        )

        if request.image_base64:
            image_url = f"data:image/jpeg;base64,{request.image_base64}"
            result = await call_dashscope(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                image_url=image_url,
            )
        else:
            result = await call_dashscope(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ]
            )

        content = _extract_text_from_dashscope_result(result).strip()
        if len(content) > max_output_length:
            content = content[:max_output_length] + "..."

        return {"type": "text", "content": content}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("[StudentAI] call failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="AI 服务调用失败")
