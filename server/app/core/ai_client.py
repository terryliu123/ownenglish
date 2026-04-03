import asyncio
import json
import re
from typing import List
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import HTTPException

from app.core.config import get_settings


settings = get_settings()


def extract_json_object(raw_text: str) -> dict:
    cleaned = (raw_text or "").strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("AI response did not contain a JSON object")

    return json.loads(cleaned[start:end + 1])


def call_siliconflow_sync(messages: List[dict], temperature: float = 0.0) -> dict:
    if not settings.SILICONFLOW_API_KEY:
        raise HTTPException(status_code=500, detail="SILICONFLOW_API_KEY is not configured")

    payload = {
        "model": settings.SILICONFLOW_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": 4000,
        "response_format": {"type": "json_object"},
        "seed": 42,
    }

    body = json.dumps(payload).encode("utf-8")
    request = Request(
        settings.SILICONFLOW_API_URL,
        data=body,
        headers={
            "Authorization": f"Bearer {settings.SILICONFLOW_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=settings.SILICONFLOW_TIMEOUT_SECONDS) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise HTTPException(status_code=502, detail=f"SiliconFlow request failed: {detail or exc.reason}") from exc
    except URLError as exc:
        raise HTTPException(status_code=502, detail=f"SiliconFlow network error: {exc.reason}") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Unexpected SiliconFlow error") from exc


async def call_siliconflow(messages: List[dict], temperature: float = 0.0) -> dict:
    return await asyncio.to_thread(call_siliconflow_sync, messages, temperature)
