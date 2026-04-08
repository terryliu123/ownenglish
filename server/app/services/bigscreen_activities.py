from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


SUPPORTED_CONTENT_TYPES = {"matching", "sorting", "classification"}
SUPPORTED_ACTIVITY_TYPES = {"duel"}
SUPPORTED_PARTICIPANT_MODES = {"student_vs_student", "team_vs_team", "anonymous_side"}
SUPPORTED_STATUSES = {"draft", "active", "archived"}
SUPPORTED_SESSION_STATUSES = {"pending", "running", "paused", "ended", "cancelled"}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def normalize_string_list(value: Any) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise ValueError("invalid_list")
    return [str(item).strip() for item in value if str(item).strip()]


def validate_bigscreen_content_payload(content_type: str, payload: Any) -> dict[str, Any]:
    if content_type not in SUPPORTED_CONTENT_TYPES:
        raise ValueError("unsupported_content_type")
    if not isinstance(payload, dict):
        raise ValueError("invalid_payload")

    prompt = str(payload.get("prompt") or "").strip() or None

    if content_type == "matching":
        pairs = payload.get("pairs")
        if not isinstance(pairs, list) or len(pairs) < 2:
            raise ValueError("matching_pairs_required")
        normalized_pairs: list[dict[str, str]] = []
        for pair in pairs:
            if not isinstance(pair, dict):
                raise ValueError("invalid_matching_pair")
            left = str(pair.get("left") or "").strip()
            right = str(pair.get("right") or "").strip()
            if not left or not right:
                raise ValueError("invalid_matching_pair")
            normalized_pairs.append({"left": left, "right": right})
        return {"prompt": prompt, "pairs": normalized_pairs}

    if content_type == "sorting":
        items = payload.get("items")
        if not isinstance(items, list) or len(items) < 2:
            raise ValueError("sorting_items_required")
        normalized_items: list[dict[str, str]] = []
        for index, item in enumerate(items, start=1):
            if not isinstance(item, dict):
                raise ValueError("invalid_sorting_item")
            item_id = str(item.get("id") or f"item-{index}").strip()
            text = str(item.get("text") or "").strip()
            if not text:
                raise ValueError("invalid_sorting_item")
            normalized_items.append({"id": item_id, "text": text})
        return {"prompt": prompt, "items": normalized_items}

    categories = payload.get("categories")
    items = payload.get("items")
    if not isinstance(categories, list) or len(categories) < 2:
        raise ValueError("classification_categories_required")
    if not isinstance(items, list) or len(items) < 2:
        raise ValueError("classification_items_required")

    normalized_categories: list[dict[str, str]] = []
    category_keys: set[str] = set()
    for index, category in enumerate(categories, start=1):
        if not isinstance(category, dict):
            raise ValueError("invalid_classification_category")
        key = str(category.get("key") or f"category-{index}").strip()
        label = str(category.get("label") or "").strip()
        if not key or not label:
            raise ValueError("invalid_classification_category")
        if key in category_keys:
            raise ValueError("duplicate_classification_category")
        category_keys.add(key)
        normalized_categories.append({"key": key, "label": label})

    normalized_items: list[dict[str, str]] = []
    for index, item in enumerate(items, start=1):
        if not isinstance(item, dict):
            raise ValueError("invalid_classification_item")
        item_id = str(item.get("id") or f"item-{index}").strip()
        text = str(item.get("text") or "").strip()
        category_key = str(item.get("category_key") or "").strip()
        if not text or category_key not in category_keys:
            raise ValueError("invalid_classification_item")
        normalized_items.append({"id": item_id, "text": text, "category_key": category_key})

    return {
        "prompt": prompt,
        "categories": normalized_categories,
        "items": normalized_items,
    }


def build_initial_scoreboard(participant_sides: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "side_id": str(side.get("id") or ""),
            "label": str(side.get("label") or ""),
            "score": 0,
            "round_wins": 0,
            "completed_count": 0,
            "total_time_ms": 0,
        }
        for side in participant_sides
    ]


def resolve_lead_side_id(scoreboard: list[dict[str, Any]]) -> str | None:
    if not scoreboard:
        return None
    ranked = sorted(
        scoreboard,
        key=lambda item: (
            -(int(item.get("round_wins") or 0)),
            -(int(item.get("score") or 0)),
            int(item.get("total_time_ms") or 0),
            str(item.get("label") or ""),
        ),
    )
    if len(ranked) < 2:
        return str(ranked[0].get("side_id") or "") or None
    first = ranked[0]
    second = ranked[1]
    first_key = (
        int(first.get("round_wins") or 0),
        int(first.get("score") or 0),
        -int(first.get("total_time_ms") or 0),
    )
    second_key = (
        int(second.get("round_wins") or 0),
        int(second.get("score") or 0),
        -int(second.get("total_time_ms") or 0),
    )
    if first_key == second_key:
        return None
    return str(first.get("side_id") or "") or None


def resolve_winner_side_id(scoreboard: list[dict[str, Any]]) -> str | None:
    return resolve_lead_side_id(scoreboard)
