from __future__ import annotations

import logging
import os
import uuid
from pathlib import Path

import httpx
from fastapi import HTTPException

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

SERVER_BASE_DIR = Path(__file__).resolve().parents[2]
WHITEBOARD_AI_AUDIO_DIR = SERVER_BASE_DIR / "uploads" / "whiteboard-ai"
WHITEBOARD_AI_AUDIO_DIR.mkdir(parents=True, exist_ok=True)

TTS_API_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"


async def synthesize_whiteboard_ai_audio(text: str) -> str:
    normalized_text = (text or "").strip()
    if not normalized_text:
        raise HTTPException(status_code=400, detail="Voice explain text is empty")

    if not settings.DASHSCOPE_API_KEY:
        raise HTTPException(status_code=500, detail="DASHSCOPE_API_KEY is not configured")

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            payload = {
                "model": settings.DASHSCOPE_TTS_MODEL,
                "input": {
                    "text": normalized_text,
                },
                "parameters": {
                    "voice": settings.DASHSCOPE_TTS_VOICE,
                    "stream": False,
                },
            }
            headers = {
                "Authorization": f"Bearer {settings.DASHSCOPE_API_KEY}",
                "Content-Type": "application/json",
            }

            resp = await client.post(TTS_API_URL, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()

            audio_info = data.get("output", {}).get("audio", {})
            audio_url = audio_info.get("url", "")
            if not audio_url:
                raise HTTPException(status_code=502, detail="TTS service returned no audio URL")

            # Ensure https for the download URL
            if audio_url.startswith("http://"):
                audio_url = "https://" + audio_url[len("http://"):]

            audio_resp = await client.get(audio_url, timeout=30, follow_redirects=True)
            audio_resp.raise_for_status()
            audio_data = audio_resp.content

            if not audio_data:
                raise HTTPException(status_code=502, detail="TTS audio download returned empty")

            # URL contains .wav extension; save as wav
            filename = f"{uuid.uuid4().hex}.wav"
            file_path = WHITEBOARD_AI_AUDIO_DIR / filename
            file_path.write_bytes(audio_data)
            return filename

    except HTTPException:
        raise
    except httpx.HTTPStatusError as exc:
        logger.error("[WhiteboardAI][TTS] HTTP error: %s %s", exc.response.status_code, exc.response.text[:300])
        raise HTTPException(status_code=500, detail="语音讲解生成失败")
    except Exception as exc:
        logger.error("[WhiteboardAI][TTS] synthesis failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="语音讲解生成失败")


def resolve_whiteboard_ai_audio_path(filename: str) -> Path:
    safe_name = os.path.basename(filename)
    file_path = WHITEBOARD_AI_AUDIO_DIR / safe_name
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Audio file not found")
    return file_path
