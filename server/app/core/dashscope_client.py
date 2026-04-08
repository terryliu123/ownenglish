"""阿里百炼 DashScope API 客户端"""
import asyncio
import base64
import json
import logging
from typing import List, Optional, Union
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import HTTPException
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def encode_image_base64(image_data: Union[str, bytes]) -> str:
    """将图片数据转为 base64 字符串"""
    if isinstance(image_data, str):
        # 可能是 URL 或 base64 字符串
        if image_data.startswith('data:image'):
            # data:image/png;base64,xxx
            return image_data.split(',', 1)[1]
        return image_data
    return base64.b64encode(image_data).decode('utf-8')


def call_dashscope_sync(messages: List[dict], image_url: Optional[str] = None) -> dict:
    """同步调用百炼 API"""
    if not settings.DASHSCOPE_API_KEY:
        raise HTTPException(status_code=500, detail="DASHSCOPE_API_KEY is not configured")

    url = settings.DASHSCOPE_API_URL

    # 构建请求体
    if image_url:
        # 图片输入模式 - 提取 system prompt 并添加到 text 中
        system_prompt = ""
        user_text = ""
        for msg in messages:
            if msg.get("role") == "system":
                system_prompt = msg.get("content", "")
            else:
                user_text = msg.get("content", "")

        text_content = user_text
        if system_prompt:
            text_content = f"{system_prompt}\n\n{user_text}"

        payload = {
            "model": settings.DASHSCOPE_MODEL,
            "input": {
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"image": image_url},
                            {"text": text_content}
                        ]
                    }
                ]
            },
            "parameters": {"max_tokens": 2000}
        }
    else:
        # 文本模式 - 正确处理 system 和 user 消息
        formatted_messages = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "system":
                formatted_messages.append({
                    "role": "system",
                    "content": [{"text": content}]
                })
            else:
                formatted_messages.append({
                    "role": role,
                    "content": [{"text": content}]
                })

        payload = {
            "model": settings.DASHSCOPE_MODEL,
            "input": {
                "messages": formatted_messages
            },
            "parameters": {"max_tokens": 2000}
        }

    body = json.dumps(payload).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {settings.DASHSCOPE_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        request = Request(url, data=body, headers=headers, method="POST")
        with urlopen(request, timeout=settings.DASHSCOPE_TIMEOUT_SECONDS) as response:
            result = json.loads(response.read().decode("utf-8"))
            if "output" in result and "choices" in result["output"]:
                return result["output"]["choices"]
            return result
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        logger.error(f"DashScope HTTP error: {detail}")
        raise HTTPException(status_code=502, detail=f"DashScope request failed: {detail or exc.reason}")
    except URLError as exc:
        logger.error(f"DashScope URL error: {exc.reason}")
        raise HTTPException(status_code=502, detail=f"DashScope network error: {exc.reason}")
    except Exception as exc:
        logger.error(f"DashScope error: {exc}")
        raise HTTPException(status_code=500, detail=f"DashScope error: {exc}")


async def call_dashscope(messages: List[dict], image_url: Optional[str] = None) -> dict:
    """异步调用百炼 API"""
    return await asyncio.to_thread(call_dashscope_sync, messages, image_url)


def call_dashscope_image_gen_sync(prompt: str, ref_image_base64: Optional[str] = None) -> dict:
    """调用百炼 wan2.7-image 模型进行图片生成（异步模式）"""
    if not settings.DASHSCOPE_API_KEY:
        raise HTTPException(status_code=500, detail="DASHSCOPE_API_KEY is not configured")

    # 异步模式 URL
    url = "https://dashscope.aliyuncs.com/api/v1/services/aigc/image-generation/generation"

    payload = {
        "model": "wan2.7-image",
        "input": {
            "messages": [
                {
                    "role": "user",
                    "content": [{"text": prompt}]
                }
            ]
        },
        "parameters": {
            "size": "2K",
            "n": 1
        }
    }

    body = json.dumps(payload).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {settings.DASHSCOPE_API_KEY}",
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable"
    }

    try:
        request = Request(url, data=body, headers=headers, method="POST")
        with urlopen(request, timeout=120) as response:
            result = json.loads(response.read().decode("utf-8"))
            logger.info(f"[DashScope ImageGen] async response: {str(result)[:500]}")
            return result
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        logger.error(f"DashScope ImageGen HTTP error: {detail}")
        raise HTTPException(status_code=502, detail=f"DashScope image generation failed: {detail or exc.reason}")
    except URLError as exc:
        logger.error(f"DashScope ImageGen URL error: {exc.reason}")
        raise HTTPException(status_code=502, detail=f"DashScope network error: {exc.reason}")
    except Exception as exc:
        logger.error(f"DashScope ImageGen error: {exc}")
        raise HTTPException(status_code=500, detail=f"DashScope image generation error: {exc}")


async def call_dashscope_image_gen(prompt: str, ref_image_base64: Optional[str] = None) -> dict:
    """异步调用百炼 wan2.7-image 模型进行图片生成（异步模式+轮询）"""
    import time
    result = await asyncio.to_thread(call_dashscope_image_gen_sync, prompt, ref_image_base64)
    # 异步模式返回 task_id，需要轮询获取结果
    task_id = result.get("output", {}).get("task_id")
    if not task_id:
        return result
    # 轮询任务状态
    status_url = f"https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}"
    headers = {
        "Authorization": f"Bearer {settings.DASHSCOPE_API_KEY}",
        "Content-Type": "application/json",
    }
    for _ in range(60):  # 最多等60秒
        await asyncio.sleep(2)
        try:
            req = Request(status_url, headers=headers, method="GET")
            with urlopen(req, timeout=30) as resp:
                status_result = json.loads(resp.read().decode("utf-8"))
                logger.info(f"[DashScope ImageGen] poll full: {status_result}")
                output = status_result.get("output", {})
                task_status = output.get("task_status")
                if task_status == "SUCCEEDED":
                    # wan2.7-image 返回格式: output.choices[0].message.content[0].image 或 content[0] 直接是URL字符串
                    choices = output.get("choices")
                    if choices:
                        message = choices[0].get("message", {})
                        content = message.get("content", [])
                        if content and isinstance(content, list):
                            first_content = content[0]
                            # content[0] 可能是 {"image": "url", "type": "image"} 或直接是 "url" 字符串
                            if isinstance(first_content, dict):
                                image_url = first_content.get("image") or first_content.get("url")
                            elif isinstance(first_content, str):
                                image_url = first_content
                            else:
                                image_url = None
                            if image_url:
                                return {"image_url": image_url}
                    raise HTTPException(status_code=500, detail=f"图片生成成功但无URL: {output}")
                elif task_status in ("FAILED", "CANCELLED"):
                    raise HTTPException(status_code=500, detail=f"图片生成失败: {task_status}")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[DashScope ImageGen] poll error: {e}")
            raise HTTPException(status_code=500, detail=f"轮询图片状态失败: {e}")
    raise HTTPException(status_code=500, detail="图片生成超时")


def build_vision_prompt(system: str, user_content: str) -> List[dict]:
    """构建视觉模型的对话格式"""
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user_content}
    ]
