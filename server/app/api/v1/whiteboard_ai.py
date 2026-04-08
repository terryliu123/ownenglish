"""白板 AI 助手接口。"""

import asyncio
import base64
import logging
from typing import Optional
from urllib.request import urlopen

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.dashscope_client import call_dashscope, call_dashscope_image_gen

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/whiteboard-ai")


class WhiteboardAiRequest(BaseModel):
    action: str
    question: Optional[str] = ""
    context: dict
    image_base64: Optional[str] = None


PROMPT_TEMPLATES = {
    "reference": {
        "system": (
            "你是一位课堂白板 AI 助手。"
            "你的任务是基于白板内容、题目和截图，帮助老师解释知识点、回答追问。"
            "请用准确、简洁、适合课堂表达的中文回答。"
        ),
        "user_template": "白板上下文：\n{context}\n\n老师的问题：{question}",
    },
    "generate_image": {
        "system": (
            "你是一位教学视觉助手。"
            "请根据老师的描述生成适合课堂展示的教学图片提示内容。"
        ),
        "user_template": "请根据以下描述生成课堂图片：\n{question}\n\n参考上下文：\n{context}",
    },
    "free_question": {
        "system": (
            "你是一位课堂辅助 AI。"
            "请基于老师提供的上下文回答问题，回答要简洁、可直接用于课堂。"
        ),
        "user_template": "{context}\n\n老师的问题：{question}",
    },
}


def build_context_text(context: dict) -> str:
    parts: list[str] = []
    if context.get("whiteboard_text"):
        parts.append(f"白板文本：{context['whiteboard_text']}")
    if context.get("task_title"):
        parts.append(f"当前任务：{context['task_title']}")
    if context.get("task_questions"):
        questions = "\n".join(context["task_questions"])
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


@router.post("/respond")
async def whiteboard_ai_respond(request: WhiteboardAiRequest):
    """白板 AI 助手主接口。"""
    if request.action not in PROMPT_TEMPLATES:
        raise HTTPException(status_code=400, detail=f"不支持的 action 类型：{request.action}")

    template = PROMPT_TEMPLATES[request.action]
    has_image = bool(request.image_base64)
    context_text = build_context_text(request.context)

    if request.action != "free_question" and not context_text and not has_image:
        raise HTTPException(status_code=400, detail="当前白板没有可供 AI 参考的内容")

    if request.action == "free_question" and not context_text:
        user_content = f"老师的问题：{request.question or ''}"
    else:
        user_content = template["user_template"].format(
            context=context_text or "[图片内容]",
            question=request.question or "",
        )

    try:
        logger.info(
            "[WhiteboardAI] action=%s has_image=%s context_keys=%s",
            request.action,
            has_image,
            list(request.context.keys()),
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

            def _download():
                with urlopen(image_url, timeout=30) as response:
                    return response.read()

            img_data = await asyncio.to_thread(_download)
            return {"type": "image", "content": base64.b64encode(img_data).decode("utf-8")}

        messages = [
            {"role": "system", "content": template["system"]},
            {"role": "user", "content": user_content},
        ]
        if has_image:
            image_url = f"data:image/jpeg;base64,{request.image_base64}"
            result = await call_dashscope(messages, image_url=image_url)
        else:
            result = await call_dashscope(messages)

        content = _extract_text(result).strip()
        return {"type": "text", "content": content, "parsed": {"content": content}}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("[WhiteboardAI] error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="AI 服务调用失败")
