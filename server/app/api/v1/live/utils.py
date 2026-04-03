"""Utility functions for live classroom API."""
import logging
from datetime import datetime, timezone
from typing import Any, Optional, List

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ActivityLog, ActivityType

logger = logging.getLogger(__name__)


async def log_activity(
    db: AsyncSession,
    user_id: str,
    activity_type: ActivityType,
    description: str,
    entity_type: str = None,
    entity_id: str = None,
    extra_data: dict = None
):
    """Log a user activity."""
    activity = ActivityLog(
        user_id=user_id,
        type=activity_type,
        description=description,
        entity_type=entity_type,
        entity_id=entity_id,
        extra_data=extra_data
    )
    db.add(activity)
    await db.commit()


def _unwrap_correct_answer(value):
    if isinstance(value, dict) and "value" in value:
        return value.get("value")
    return value


def _normalize_scalar_answer(value):
    if isinstance(value, str):
        return value.strip()
    return value


def _normalize_true_false_answer(value) -> Optional[bool]:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"true", "1", "yes", "y", "t", "对", "正确"}:
            return True
        if lowered in {"false", "0", "no", "n", "f", "错", "错误"}:
            return False
    return None


def _normalize_multiple_choice_answer(value) -> List[str]:
    if value is None:
        return []
    if isinstance(value, str):
        raw_values = value.split(",")
    elif isinstance(value, list):
        raw_values = value
    else:
        raw_values = [value]
    normalized = []
    for item in raw_values:
        text = str(item).strip().upper()
        if text:
            normalized.append(text)
    return sorted(normalized)


def _normalize_fill_blank_answer(value) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        raw_values = value
    else:
        raw_values = [value]
    return [str(item).strip().lower() for item in raw_values]


def _normalize_matching_answer(value) -> List[int]:
    """Normalize matching answer for comparison.

    Expected format: [leftIndexForRight0, leftIndexForRight1, ...]
    where the index position represents the right side index (original order),
    and the value represents the paired left side index.
    """
    if value is None:
        return []
    if isinstance(value, dict):
        # Handle dict format like {"0": 1, "1": 0} -> [1, 0]
        # Sort by key (right side index) to maintain order
        items = sorted(value.items(), key=lambda item: int(item[0]) if str(item[0]).isdigit() else 0)
        raw_values = [item[1] for item in items]
    elif isinstance(value, list):
        raw_values = value
    else:
        raw_values = [value]

    normalized: List[int] = []
    for item in raw_values:
        if item in ("", None):
            normalized.append(-1)
            continue
        try:
            normalized.append(int(item))
        except (TypeError, ValueError):
            normalized.append(-1)
    return normalized


def _answers_match(task_type: Optional[str], answer, correct_answer) -> Optional[bool]:
    correct_value = _unwrap_correct_answer(correct_answer)
    if correct_value is None:
        return None

    if task_type == "multiple_choice":
        return _normalize_multiple_choice_answer(answer) == _normalize_multiple_choice_answer(correct_value)

    if task_type == "true_false":
        normalized_answer = _normalize_true_false_answer(answer)
        normalized_correct = _normalize_true_false_answer(correct_value)
        if normalized_answer is None or normalized_correct is None:
            return None
        return normalized_answer == normalized_correct

    if task_type == "fill_blank":
        return _normalize_fill_blank_answer(answer) == _normalize_fill_blank_answer(correct_value)

    if task_type == "matching":
        return _normalize_matching_answer(answer) == _normalize_matching_answer(correct_value)

    if task_type == "sorting":
        student_values = _normalize_fill_blank_answer(answer)
        correct_values = _normalize_fill_blank_answer(correct_value)
        return student_values == correct_values

    if task_type == "reading":
        normalized_answer = str(_normalize_scalar_answer(answer) or "").strip().lower()
        normalized_correct = str(_normalize_scalar_answer(correct_value) or "").strip().lower()
        if not normalized_correct:
            return None
        return normalized_answer == normalized_correct

    return str(_normalize_scalar_answer(answer)) == str(_normalize_scalar_answer(correct_value))


def _parse_challenge_started_at(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value.replace(tzinfo=None)
    if isinstance(value, str):
        normalized = value.strip()
        if not normalized:
            return None
        if normalized.endswith("Z"):
            normalized = normalized[:-1] + "+00:00"
        try:
            return datetime.fromisoformat(normalized).replace(tzinfo=None)
        except ValueError:
            return None
    return None
