"""REST endpoints and helpers for live classroom challenges."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.db.session import get_db
from app.models import (
    Class,
    ClassEnrollment,
    LiveChallengeSession,
    LiveTask,
    LiveTaskGroup,
    TeacherProfile,
    User,
    UserRole,
)

router = APIRouter(tags=["Live Challenges"])

SUPPORTED_CHALLENGE_MODES = {"single_question_duel", "duel", "class_challenge"}
SUPPORTED_CHALLENGE_TASK_TYPES = {
    "single_choice",
    "multiple_choice",
    "fill_blank",
    "true_false",
    "matching",
    "sorting",
    "image_understanding",
}
SUPPORTED_SINGLE_QUESTION_DUEL_TASK_TYPES = {
    "single_choice",
    "true_false",
    "image_understanding",
    "error_correction",
}


class LiveChallengeCreateRequest(BaseModel):
    class_id: str
    task_group_id: str
    mode: str = Field(..., pattern="^(single_question_duel|duel|class_challenge)$")
    participant_ids: List[str] = Field(default_factory=list)
    task_id: Optional[str] = None


def _unwrap_correct_answer(value: Any) -> Any:
    if isinstance(value, dict) and "value" in value:
        return value.get("value")
    return value


def _normalize_scalar_answer(value: Any) -> str:
    return str(value or "").strip()


_CHOICE_PREFIX_RE = re.compile(r"^([A-Z])(?:\b|[\s\.:：、\)\]】>\-])")


def _normalize_choice_like_answer(value: Any) -> str:
    normalized = _normalize_scalar_answer(value).upper()
    if not normalized:
        return ""
    if len(normalized) == 1 and normalized.isalpha():
        return normalized
    match = _CHOICE_PREFIX_RE.match(normalized)
    if match:
        return match.group(1)
    return normalized


def _normalize_multiple_choice(value: Any) -> list[str]:
    if isinstance(value, list):
        return sorted(str(item).strip().upper() for item in value if str(item).strip())
    if isinstance(value, str):
        return sorted(part.strip().upper() for part in value.split(",") if part.strip())
    return []


def _normalize_true_false(value: Any) -> Optional[bool]:
    if isinstance(value, bool):
        return value
    normalized = str(value or "").strip().lower()
    if normalized in {"true", "1", "yes", "correct", "对", "正确"}:
        return True
    if normalized in {"false", "0", "no", "incorrect", "错", "错误"}:
        return False
    return None


def _normalize_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value]
    if isinstance(value, str):
        return [part.strip() for part in value.split(",") if part.strip()]
    return []


def _has_submitted_value(value: Any) -> bool:
    if isinstance(value, list):
        return any(str(item).strip() not in {"", "-1"} for item in value)
    if isinstance(value, bool):
        return True
    return str(value or "").strip() not in {"", "-1"}


def _parse_iso_datetime(value: Any) -> Optional[datetime]:
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


def answers_match(task_type: str, answer: Any, correct_answer: Any) -> bool:
    correct_value = _unwrap_correct_answer(correct_answer)
    if correct_value in (None, "", []):
        return False

    if task_type == "multiple_choice":
        return _normalize_multiple_choice(answer) == _normalize_multiple_choice(correct_value)
    if task_type == "true_false":
        return _normalize_true_false(answer) == _normalize_true_false(correct_value)
    if task_type in {"matching", "sorting"}:
        return _normalize_list(answer) == _normalize_list(correct_value)
    if task_type in {"single_choice", "image_understanding", "error_correction", "scenario"}:
        return _normalize_choice_like_answer(answer) == _normalize_choice_like_answer(correct_value)
    return _normalize_scalar_answer(answer) == _normalize_scalar_answer(correct_value)


def score_challenge_answers(tasks: list[dict], answers: list[dict]) -> dict:
    answer_map = {str(item.get("task_id")): item.get("answer") for item in answers if item.get("task_id")}
    correct_count = 0
    answered_count = 0
    total_count = len(tasks)

    for task in tasks:
        task_id = str(task.get("task_id") or task.get("id") or "")
        if not task_id or task_id not in answer_map:
            continue
        answered_count += 1
        if answers_match(str(task.get("type") or ""), answer_map[task_id], task.get("correct_answer")):
            correct_count += 1

    raw_answered_count = sum(
        1 for item in answers
        if item.get("task_id") and _has_submitted_value(item.get("answer"))
    )
    answered_count = max(answered_count, raw_answered_count)

    return {
        "correct_count": correct_count,
        "answered_count": answered_count,
        "total_count": total_count,
    }


def finalize_challenge_scoreboard_from_drafts(
    tasks: list[dict],
    scoreboard: list[dict],
    *,
    ended_at: Optional[datetime] = None,
) -> list[dict]:
    finalized: list[dict] = []
    # Use offset-naive UTC time to match _parse_iso_datetime output
    reference_time = (ended_at or datetime.now(timezone.utc)).replace(tzinfo=None)

    for entry in scoreboard:
        next_entry = dict(entry)
        if next_entry.get("submitted"):
            finalized.append(next_entry)
            continue

        draft_answers = next_entry.get("draft_answers")
        if not isinstance(draft_answers, list) or not draft_answers:
            finalized.append(next_entry)
            continue

        score = score_challenge_answers(tasks, draft_answers)
        if score["answered_count"] <= 0:
            finalized.append(next_entry)
            continue

        started_at = _parse_iso_datetime(next_entry.get("started_at"))
        total_time_ms = None
        if started_at:
            total_time_ms = max(0, int((reference_time - started_at).total_seconds() * 1000))

        next_entry["answered_count"] = score["answered_count"]
        next_entry["correct_count"] = score["correct_count"]
        next_entry["total_tasks"] = score["total_count"]
        next_entry["current_index"] = score["total_count"]
        next_entry["submitted"] = True
        next_entry["total_time_ms"] = total_time_ms
        finalized.append(next_entry)

    return finalized


def rank_challenge_scoreboard(scoreboard: list[dict]) -> list[dict]:
    ranked = sorted(
        scoreboard,
        key=lambda item: (
            -(item.get("correct_count") or 0),
            item.get("total_time_ms") if item.get("submitted") else 10**12,
            item.get("student_name") or "",
        ),
    )
    for index, item in enumerate(ranked, start=1):
        item["rank"] = index
    return ranked


def create_initial_scoreboard(
    participants: list[dict],
    total_tasks: int,
    *,
    current_task_id: Optional[str] = None,
) -> list[dict]:
    return [
        {
            "student_id": participant["student_id"],
            "student_name": participant["student_name"],
            "answered_count": 0,
            "correct_count": 0,
            "total_tasks": total_tasks,
            "current_index": 0,
            "total_time_ms": None,
            "started_at": None,
            "submitted": False,
            "locked": False,
            "eliminated_for_round": False,
            "first_correct_at": None,
            "current_task_id": current_task_id,
            "rank": None,
        }
        for participant in participants
    ]


def serialize_challenge_session(
    challenge: LiveChallengeSession,
    tasks: Optional[list[LiveTask]] = None,
    participants: Optional[list[dict]] = None,
) -> dict:
    scoreboard = list(challenge.scoreboard or [])
    task_list = list(tasks or [])
    current_task_id = next(
        (
            entry.get("current_task_id")
            for entry in scoreboard
            if entry.get("current_task_id")
        ),
        None,
    )
    if challenge.mode == "single_question_duel" and current_task_id:
        task_list = [task for task in task_list if task.id == current_task_id]

    ranked_scoreboard = rank_challenge_scoreboard([dict(entry) for entry in scoreboard]) if scoreboard else []
    current_round = 1
    round_status = "active" if challenge.status == "active" else challenge.status
    winner_student_id = None
    lead_student_id = None

    if ranked_scoreboard:
        top_entry = ranked_scoreboard[0]
        second_entry = ranked_scoreboard[1] if len(ranked_scoreboard) > 1 else None
        if not second_entry:
            lead_student_id = top_entry.get("student_id")
        else:
            top_score = (
                top_entry.get("correct_count") or 0,
                -(top_entry.get("total_time_ms") or 10**12),
            )
            second_score = (
                second_entry.get("correct_count") or 0,
                -(second_entry.get("total_time_ms") or 10**12),
            )
            if top_score != second_score:
                lead_student_id = top_entry.get("student_id")

        if challenge.mode == "single_question_duel":
            winning_entry = next(
                (entry for entry in ranked_scoreboard if (entry.get("correct_count") or 0) > 0),
                None,
            )
            if winning_entry:
                winner_student_id = winning_entry.get("student_id")
                lead_student_id = winning_entry.get("student_id")
                round_status = "won" if challenge.status == "ended" else "active"
            elif challenge.status == "ended":
                round_status = "draw"
            elif any(entry.get("eliminated_for_round") for entry in ranked_scoreboard):
                round_status = "waiting"
        else:
            current_round = min(
                max(
                    1,
                    max((int(entry.get("current_index") or 0) for entry in ranked_scoreboard), default=0) + 1,
                ),
                max(1, len(task_list)),
            )
            if challenge.status == "ended":
                if lead_student_id:
                    winner_student_id = lead_student_id
                    round_status = "won"
                else:
                    round_status = "draw"

    if not current_task_id and task_list:
        if challenge.mode == "single_question_duel":
            current_task_id = task_list[0].id
        else:
            unresolved_indexes = [
                min(max(int(entry.get("current_index") or 0), 0), len(task_list) - 1)
                for entry in ranked_scoreboard
                if not entry.get("submitted")
            ]
            current_index = unresolved_indexes[0] if unresolved_indexes else min(len(task_list) - 1, max(current_round - 1, 0))
            current_task_id = task_list[current_index].id

    return {
        "id": challenge.id,
        "class_id": challenge.class_id,
        "task_group_id": challenge.task_group_id,
        "mode": challenge.mode,
        "title": challenge.title,
        "participant_ids": challenge.participant_ids or [],
        "participants": participants or [],
        "scoreboard": ranked_scoreboard,
        "status": challenge.status,
        "started_at": challenge.started_at.isoformat() if challenge.started_at else None,
        "ended_at": challenge.ended_at.isoformat() if challenge.ended_at else None,
        "tasks": [
            {
                "task_id": task.id,
                "type": task.type,
                "question": task.question,
                "countdown_seconds": task.countdown_seconds,
                "order": task.order,
                "correct_answer": task.correct_answer,
            }
            for task in task_list
        ],
        "total_countdown": sum((task.countdown_seconds or 0) for task in task_list),
        "current_round": current_round,
        "current_task_id": current_task_id,
        "round_status": round_status,
        "winner_student_id": winner_student_id,
        "lead_student_id": lead_student_id,
    }


async def _validate_teacher_and_class(class_id: str, current_user: User, db: AsyncSession) -> tuple[TeacherProfile, Class]:
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers can manage challenges")

    result = await db.execute(select(TeacherProfile).where(TeacherProfile.user_id == current_user.id))
    teacher = result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher profile not found")

    result = await db.execute(select(Class).where(Class.id == class_id))
    class_obj = result.scalar_one_or_none()
    if not class_obj or class_obj.teacher_id != teacher.user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found or not authorized")

    return teacher, class_obj


async def _load_participants(class_id: str, participant_ids: list[str], db: AsyncSession) -> list[dict]:
    if not participant_ids:
        return []

    result = await db.execute(
        select(ClassEnrollment.student_id, User.name)
        .join(User, User.id == ClassEnrollment.student_id)
        .where(
            ClassEnrollment.class_id == class_id,
            ClassEnrollment.status == "active",
            ClassEnrollment.student_id.in_(participant_ids),
        )
    )
    rows = result.all()
    participants = [{"student_id": student_id, "student_name": name} for student_id, name in rows]
    if len(participants) != len(set(participant_ids)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Some participants are not active students in this class")
    return participants


@router.post("/live/challenges")
async def create_live_challenge(
    payload: LiveChallengeCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _, _class = await _validate_teacher_and_class(payload.class_id, current_user, db)

    result = await db.execute(
        select(LiveTaskGroup).where(
            LiveTaskGroup.id == payload.task_group_id,
            LiveTaskGroup.class_id == payload.class_id,
        )
    )
    task_group = result.scalar_one_or_none()
    if not task_group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task group not found")

    result = await db.execute(
        select(LiveTask)
        .where(LiveTask.group_id == task_group.id)
        .order_by(LiveTask.order)
    )
    tasks = result.scalars().all()
    if not tasks:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task group has no tasks")

    if payload.mode == "single_question_duel":
        if not payload.task_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Single-question duel requires a task_id")
        selected_task = next((task for task in tasks if task.id == payload.task_id), None)
        if not selected_task:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected task is not in this task group")
        if selected_task.type not in SUPPORTED_SINGLE_QUESTION_DUEL_TASK_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported single-question duel task type: {selected_task.type}",
            )
        tasks = [selected_task]
    else:
        unsupported = [task.type for task in tasks if task.type not in SUPPORTED_CHALLENGE_TASK_TYPES]
        if unsupported:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported challenge task types: {', '.join(sorted(set(unsupported)))}",
            )

    if payload.mode in {"single_question_duel", "duel"}:
        participant_ids = list(dict.fromkeys(payload.participant_ids))
        if len(participant_ids) != 2:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Duel mode requires exactly two participants")
    else:
        if payload.participant_ids:
            participant_ids = list(dict.fromkeys(payload.participant_ids))
        else:
            result = await db.execute(
                select(ClassEnrollment.student_id)
                .where(
                    ClassEnrollment.class_id == payload.class_id,
                    ClassEnrollment.status == "active",
                )
            )
            participant_ids = [student_id for (student_id,) in result.all()]
        if not participant_ids:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Class challenge requires at least one participant")

    participants = await _load_participants(payload.class_id, participant_ids, db)
    mode_label = {
        "single_question_duel": "单题双人抢答",
        "duel": "双人 PK",
        "class_challenge": "全班挑战",
    }[payload.mode]
    title = f"{task_group.title} - {mode_label}"
    scoreboard = create_initial_scoreboard(
        participants,
        len(tasks),
        current_task_id=tasks[0].id if payload.mode == "single_question_duel" and tasks else None,
    )

    challenge = LiveChallengeSession(
        class_id=payload.class_id,
        task_group_id=task_group.id,
        mode=payload.mode,
        title=title,
        participant_ids=participant_ids,
        scoreboard=scoreboard,
        status="draft",
    )
    db.add(challenge)
    await db.commit()
    await db.refresh(challenge)

    return serialize_challenge_session(challenge, tasks, participants)


@router.get("/live/classes/{class_id}/challenges")
async def list_live_challenges(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _validate_teacher_and_class(class_id, current_user, db)
    result = await db.execute(
        select(LiveChallengeSession)
        .where(LiveChallengeSession.class_id == class_id)
        .order_by(LiveChallengeSession.created_at.desc())
    )
    challenges = result.scalars().all()
    return [
        {
            "id": challenge.id,
            "task_group_id": challenge.task_group_id,
            "mode": challenge.mode,
            "title": challenge.title,
            "participant_ids": challenge.participant_ids or [],
            "scoreboard": challenge.scoreboard or [],
            "status": challenge.status,
            "started_at": challenge.started_at.isoformat() if challenge.started_at else None,
            "ended_at": challenge.ended_at.isoformat() if challenge.ended_at else None,
        }
        for challenge in challenges
    ]
