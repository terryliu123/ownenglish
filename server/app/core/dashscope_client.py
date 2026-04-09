"""阿里百炼 DashScope API 客户端"""
import asyncio
import base64
import json
import logging
from typing import List, Optional, Union

import httpx
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
    """同步调用百炼 API（含重试）"""
    if not settings.DASHSCOPE_API_KEY:
        raise HTTPException(status_code=500, detail="DASHSCOPE_API_KEY is not configured")

    url = settings.DASHSCOPE_API_URL
    headers = {
        "Authorization": f"Bearer {settings.DASHSCOPE_API_KEY}",
        "Content-Type": "application/json",
    }

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

    max_retries = 2
    for attempt in range(max_retries + 1):
        try:
            with httpx.Client(timeout=settings.DASHSCOPE_TIMEOUT_SECONDS) as client:
                resp = client.post(url, json=payload, headers=headers)
                resp.raise_for_status()
                result = resp.json()
                if "output" in result and "choices" in result["output"]:
                    return result["output"]["choices"]
                return result
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text
            logger.error(f"DashScope HTTP error: {detail}")
            raise HTTPException(status_code=502, detail=f"DashScope request failed: {detail}")
        except (httpx.ConnectError, httpx.ReadError, httpx.WriteError, httpx.PoolTimeout, httpx.ConnectTimeout, httpx.ReadTimeout, OSError) as exc:
            if attempt < max_retries:
                import time
                logger.warning("DashScope network error (attempt %d/%d): %s, retrying...", attempt + 1, max_retries + 1, exc)
                time.sleep(1 * (attempt + 1))
                continue
            logger.error(f"DashScope network error: {exc}")
            raise HTTPException(status_code=502, detail=f"DashScope network error: {exc}")
        except Exception as exc:
            logger.error(f"DashScope error: {exc}")
            raise HTTPException(status_code=500, detail=f"DashScope error: {exc}")


async def call_dashscope(messages: List[dict], image_url: Optional[str] = None) -> dict:
    """异步调用百炼 API"""
    if not settings.DASHSCOPE_API_KEY:
        raise HTTPException(status_code=500, detail="DASHSCOPE_API_KEY is not configured")

    url = settings.DASHSCOPE_API_URL
    headers = {
        "Authorization": f"Bearer {settings.DASHSCOPE_API_KEY}",
        "Content-Type": "application/json",
    }

    # 构建请求体
    if image_url:
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
        formatted_messages = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
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

    max_retries = 2
    for attempt in range(max_retries + 1):
        try:
            async with httpx.AsyncClient(timeout=settings.DASHSCOPE_TIMEOUT_SECONDS) as client:
                resp = await client.post(url, json=payload, headers=headers)
                resp.raise_for_status()
                result = resp.json()
                if "output" in result and "choices" in result["output"]:
                    return result["output"]["choices"]
                return result
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text
            logger.error(f"DashScope HTTP error: {detail}")
            raise HTTPException(status_code=502, detail=f"DashScope request failed: {detail}")
        except (httpx.ConnectError, httpx.ReadError, httpx.WriteError, httpx.PoolTimeout, httpx.ConnectTimeout, httpx.ReadTimeout, OSError) as exc:
            if attempt < max_retries:
                logger.warning("DashScope network error (attempt %d/%d): %s, retrying...", attempt + 1, max_retries + 1, exc)
                await asyncio.sleep(1 * (attempt + 1))
                continue
            logger.error(f"DashScope network error: {exc}")
            raise HTTPException(status_code=502, detail=f"DashScope network error: {exc}")
        except Exception as exc:
            logger.error(f"DashScope error: {exc}")
            raise HTTPException(status_code=500, detail=f"DashScope error: {exc}")


def call_dashscope_image_gen_sync(prompt: str, ref_image_base64: Optional[str] = None) -> dict:
    """调用百炼 wan2.7-image 模型进行图片生成（异步模式）"""
    if not settings.DASHSCOPE_API_KEY:
        raise HTTPException(status_code=500, detail="DASHSCOPE_API_KEY is not configured")

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
    headers = {
        "Authorization": f"Bearer {settings.DASHSCOPE_API_KEY}",
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable"
    }

    try:
        with httpx.Client(timeout=120) as client:
            resp = client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            result = resp.json()
            logger.info(f"[DashScope ImageGen] async response: {str(result)[:500]}")
            return result
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text
        logger.error(f"DashScope ImageGen HTTP error: {detail}")
        raise HTTPException(status_code=502, detail=f"DashScope image generation failed: {detail}")
    except (httpx.ConnectError, httpx.ReadError, httpx.WriteError, httpx.PoolTimeout, httpx.ConnectTimeout, httpx.ReadTimeout, OSError) as exc:
        logger.error(f"DashScope ImageGen network error: {exc}")
        raise HTTPException(status_code=502, detail=f"DashScope network error: {exc}")
    except Exception as exc:
        logger.error(f"DashScope ImageGen error: {exc}")
        raise HTTPException(status_code=500, detail=f"DashScope image generation error: {exc}")


async def call_dashscope_image_gen(prompt: str, ref_image_base64: Optional[str] = None) -> dict:
    """异步调用百炼 wan2.7-image 模型进行图片生成（异步模式+轮询）"""
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
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(status_url, headers=headers)
                resp.raise_for_status()
                status_result = resp.json()
                logger.info(f"[DashScope ImageGen] poll full: {status_result}")
                output = status_result.get("output", {})
                task_status = output.get("task_status")
                if task_status == "SUCCEEDED":
                    choices = output.get("choices")
                    if choices:
                        message = choices[0].get("message", {})
                        content = message.get("content", [])
                        if content and isinstance(content, list):
                            first_content = content[0]
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
