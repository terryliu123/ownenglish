"""Challenge/competition mode endpoints for live classroom."""
import asyncio
import logging
from copy import deepcopy
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.attributes import flag_modified

from app.db.session import get_db
from app.api.v1.auth import get_current_user
from app.core.websocket import manager
from app.models import (
    User, LiveChallengeSession, LiveTask, Class, ClassEnrollment, UserRole
)
from app.api.v1.live_challenges import (
    finalize_challenge_scoreboard_from_drafts,
    SUPPORTED_SINGLE_QUESTION_DUEL_TASK_TYPES,
    create_initial_scoreboard,
    rank_challenge_scoreboard,
    score_challenge_answers,
    serialize_challenge_session,
)
from .utils import _parse_challenge_started_at

logger = logging.getLogger(__name__)
router = APIRouter()


async def _load_challenge_participants(challenge: LiveChallengeSession, db: AsyncSession) -> list[dict]:
    participant_ids = challenge.participant_ids or []
    if not participant_ids:
        return []

    result = await db.execute(
        select(ClassEnrollment.student_id, User.name)
        .join(User, User.id == ClassEnrollment.student_id)
        .where(
            ClassEnrollment.class_id == challenge.class_id,
            ClassEnrollment.status == "active",
            ClassEnrollment.student_id.in_(participant_ids),
        )
    )
    return [
        {"student_id": student_id, "student_name": name}
        for student_id, name in result.all()
    ]


async def _serialize_challenge_runtime(
    challenge: LiveChallengeSession,
    db: AsyncSession,
) -> dict:
    result = await db.execute(
        select(LiveTask)
        .where(LiveTask.group_id == challenge.task_group_id)
        .order_by(LiveTask.order)
    )
    tasks = result.scalars().all()
    participants = await _load_challenge_participants(challenge, db)
    return serialize_challenge_session(challenge, tasks, participants)


async def _persist_challenge_scoreboard(
    challenge_id: str,
    scoreboard: list[dict],
    db: AsyncSession,
    status: Optional[str] = None,
    ended: bool = False,
    refresh: bool = True,
) -> Optional[LiveChallengeSession]:
    result = await db.execute(select(LiveChallengeSession).where(LiveChallengeSession.id == challenge_id))
    challenge = result.scalar_one_or_none()
    if not challenge:
        return None

    challenge.scoreboard = [dict(entry) for entry in scoreboard]
    flag_modified(challenge, "scoreboard")
    if status:
        challenge.status = status
    if ended:
        challenge.ended_at = datetime.now(timezone.utc)
    await db.commit()
    if refresh:
        await db.refresh(challenge)
    return challenge


def _get_challenge_entry(scoreboard: list[dict], student_id: str) -> Optional[dict]:
    return next((entry for entry in scoreboard if entry.get("student_id") == student_id), None)


def _is_single_question_duel_resolved(scoreboard: list[dict]) -> bool:
    if not scoreboard:
        return False
    if any((entry.get("correct_count") or 0) > 0 for entry in scoreboard):
        return True
    return all(
        bool(entry.get("submitted"))
        or bool(entry.get("eliminated_for_round"))
        or bool(entry.get("locked"))
        for entry in scoreboard
    )


def _build_single_question_duel_status(scoreboard: list[dict]) -> tuple[str, Optional[str]]:
    winner = next((entry for entry in scoreboard if (entry.get("correct_count") or 0) > 0), None)
    if winner:
        return "ended", winner.get("student_id")
    if _is_single_question_duel_resolved(scoreboard):
        return "ended", None
    return "active", None


@router.get("/live/challenges")
async def get_challenges(
    class_id: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all challenge sessions for a class."""
    # Verify access
    result = await db.execute(select(Class).where(Class.id == class_id))
    class_obj = result.scalar_one_or_none()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")

    if current_user.role == UserRole.TEACHER:
        if class_obj.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    else:
        enrollment_result = await db.execute(
            select(ClassEnrollment).where(
                ClassEnrollment.class_id == class_id,
                ClassEnrollment.student_id == current_user.id,
            )
        )
        if not enrollment_result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Not enrolled")

    result = await db.execute(
        select(LiveChallengeSession)
        .where(LiveChallengeSession.class_id == class_id)
        .order_by(LiveChallengeSession.created_at.desc())
    )
    challenges = result.scalars().all()

    return [
        {
            "id": c.id,
            "title": c.title,
            "mode": c.mode,
            "status": c.status,
            "participant_count": len(c.participant_ids or []),
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "started_at": c.started_at.isoformat() if c.started_at else None,
            "ended_at": c.ended_at.isoformat() if c.ended_at else None,
        }
        for c in challenges
    ]


@router.post("/live/challenges")
async def create_challenge(
    class_id: str,
    title: str,
    mode: str = "standard",
    task_group_id: Optional[str] = None,
    participant_ids: Optional[list] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new challenge session."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can create challenges")

    result = await db.execute(select(Class).where(Class.id == class_id))
    class_obj = result.scalar_one_or_none()
    if not class_obj or class_obj.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if task_group_id:
        result = await db.execute(
            select(LiveTask).where(LiveTask.group_id == task_group_id)
        )
        if not result.scalars().first():
            raise HTTPException(status_code=400, detail="Task group has no tasks")

    challenge = LiveChallengeSession(
        class_id=class_id,
        title=title,
        mode=mode,
        task_group_id=task_group_id,
        participant_ids=participant_ids or [],
        status="draft",
        scoreboard=[],
    )
    db.add(challenge)
    await db.commit()
    await db.refresh(challenge)

    return {
        "id": challenge.id,
        "title": challenge.title,
        "mode": challenge.mode,
        "status": challenge.status,
        "participant_count": len(challenge.participant_ids or []),
        "created_at": challenge.created_at.isoformat() if challenge.created_at else None,
    }


@router.get("/live/challenges/{challenge_id}")
async def get_challenge(
    challenge_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get challenge details with current scoreboard."""
    result = await db.execute(
        select(LiveChallengeSession).where(LiveChallengeSession.id == challenge_id)
    )
    challenge = result.scalar_one_or_none()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    # Verify access
    result = await db.execute(select(Class).where(Class.id == challenge.class_id))
    class_obj = result.scalar_one_or_none()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")

    if current_user.role == UserRole.TEACHER:
        if class_obj.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    else:
        if current_user.id not in (challenge.participant_ids or []):
            raise HTTPException(status_code=403, detail="Not a participant")

    payload = await _serialize_challenge_runtime(challenge, db)
    return payload


@router.delete("/live/challenges/{challenge_id}")
async def delete_challenge(
    challenge_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a challenge session."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can delete challenges")

    result = await db.execute(
        select(LiveChallengeSession).where(LiveChallengeSession.id == challenge_id)
    )
    challenge = result.scalar_one_or_none()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    result = await db.execute(select(Class).where(Class.id == challenge.class_id))
    class_obj = result.scalar_one_or_none()
    if not class_obj or class_obj.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    await db.delete(challenge)
    await db.commit()
    return {"success": True}


# WebSocket challenge handlers (to be used by main websocket handler)
async def handle_challenge_progress(class_id: str, challenge_id: str, student_id: str, data: dict, db: AsyncSession):
    """Handle challenge progress update from student."""
    room_challenge = manager.class_rooms.get(class_id, {}).get("current_challenge")
    if not room_challenge or room_challenge.get("id") != challenge_id:
        return
    if room_challenge.get("status") in {"ended", "cancelled"}:
        return

    current_index = int(data.get("current_index") or 0)
    answered_count = int(data.get("answered_count") or 0)
    submitted = bool(data.get("submitted"))
    started_at = _parse_challenge_started_at(data.get("started_at"))
    draft_answers = data.get("answers") if isinstance(data.get("answers"), list) else None

    await manager.update_challenge_progress(
        class_id,
        challenge_id,
        student_id,
        {
            "current_index": current_index,
            "answered_count": answered_count,
            "started_at": started_at.isoformat() if started_at else None,
            "answers": draft_answers,
            "submitted": submitted,
        },
    )

    current_state = manager.class_rooms[class_id].get("current_challenge") or {}
    scoreboard = list(current_state.get("scoreboard") or [])
    if current_state.get("status") not in {"ended", "cancelled"}:
        await _persist_challenge_scoreboard(challenge_id, scoreboard, db, status="active")


async def handle_challenge_submit(
    websocket: WebSocket,
    class_id: str,
    student_id: str,
    data: dict,
    db: AsyncSession
):
    """Handle challenge submission from student."""
    challenge_id = data.get("challenge_id")
    answers = data.get("answers", [])
    client_started_at = _parse_challenge_started_at(data.get("started_at"))
    if not challenge_id:
        await websocket.send_json({"type": "error", "message": "Challenge ID required"})
        return

    result = await db.execute(select(LiveChallengeSession).where(LiveChallengeSession.id == challenge_id))
    challenge = result.scalar_one_or_none()
    if not challenge or challenge.class_id != class_id:
        await websocket.send_json({"type": "error", "message": "Challenge not found"})
        return

    if challenge.status in {"ended", "cancelled"}:
        ended_payload = await _serialize_challenge_runtime(challenge, db)
        current_scoreboard = deepcopy(list(challenge.scoreboard or []))
        ended_payload["scoreboard"] = current_scoreboard
        ended_payload["status"] = challenge.status
        await websocket.send_json({
            "type": "challenge_ended",
            "challenge": ended_payload,
            "scoreboard": current_scoreboard,
            "status": challenge.status,
        })
        return

    # Use cached challenge payload from room state when available to avoid DB queries
    room_challenge = manager.class_rooms.get(class_id, {}).get("current_challenge")
    if room_challenge and room_challenge.get("id") == challenge_id:
        challenge_payload = room_challenge
    else:
        challenge_payload = await _serialize_challenge_runtime(challenge, db)
    if student_id not in (challenge.participant_ids or []):
        await websocket.send_json({"type": "error", "message": "Not a challenge participant"})
        return

    scoreboard = list(challenge.scoreboard or [])
    existing_entry = _get_challenge_entry(scoreboard, student_id)
    if existing_entry and (
        existing_entry.get("submitted")
        or existing_entry.get("eliminated_for_round")
        or existing_entry.get("locked")
    ):
        await websocket.send_json({
            "type": "challenge_scoreboard_updated",
            "challenge_id": challenge.id,
            "scoreboard": deepcopy(scoreboard),
            "status": challenge.status or "active",
        })
        return

    score = score_challenge_answers(challenge_payload["tasks"], answers)
    if score["answered_count"] <= 0:
        await websocket.send_json({"type": "error", "message": "No challenge answers submitted"})
        return
    participant_name_map = {
        str(participant.get("student_id")): participant.get("student_name") or ""
        for participant in (challenge_payload.get("participants") or [])
    }
    entry_started_at = _parse_challenge_started_at(existing_entry.get("started_at")) if existing_entry else None
    entry_started_at = entry_started_at or client_started_at
    if not entry_started_at:
        entry_started_at = challenge.started_at.replace(tzinfo=None) if challenge.started_at else datetime.now(timezone.utc).replace(tzinfo=None)
    total_time_ms = max(
        0,
        int((datetime.now(timezone.utc).replace(tzinfo=None) - entry_started_at).total_seconds() * 1000),
    )

    if not existing_entry:
        existing_entry = {
            "student_id": student_id,
            "student_name": participant_name_map.get(student_id, ""),
            "answered_count": 0,
            "correct_count": 0,
            "total_tasks": score["total_count"],
            "current_index": 0,
            "total_time_ms": None,
            "started_at": None,
            "submitted": False,
            "locked": False,
            "eliminated_for_round": False,
            "first_correct_at": None,
            "current_task_id": challenge_payload.get("current_task_id"),
            "rank": None,
        }
        scoreboard.append(existing_entry)

    challenge_status = "active"
    if challenge.mode == "single_question_duel":
        is_correct = score["correct_count"] > 0
        existing_entry["answered_count"] = max(1, score["answered_count"])
        existing_entry["correct_count"] = 1 if is_correct else 0
        existing_entry["total_tasks"] = 1
        existing_entry["current_index"] = 1
        existing_entry["submitted"] = True
        existing_entry["total_time_ms"] = total_time_ms
        existing_entry["started_at"] = entry_started_at.isoformat()
        existing_entry["student_name"] = existing_entry.get("student_name") or participant_name_map.get(student_id, "")
        existing_entry["locked"] = True
        existing_entry["eliminated_for_round"] = not is_correct
        if is_correct:
            existing_entry["first_correct_at"] = datetime.now(timezone.utc).isoformat()
            for entry in scoreboard:
                if entry.get("student_id") != student_id:
                    entry["locked"] = True
        scoreboard = rank_challenge_scoreboard(scoreboard)
        challenge_status, _ = _build_single_question_duel_status(scoreboard)
    else:
        existing_entry["answered_count"] = score["answered_count"]
        existing_entry["correct_count"] = score["correct_count"]
        existing_entry["total_tasks"] = score["total_count"]
        existing_entry["current_index"] = score["total_count"]
        existing_entry["submitted"] = True
        existing_entry["total_time_ms"] = total_time_ms
        existing_entry["started_at"] = entry_started_at.isoformat()
        existing_entry["student_name"] = existing_entry.get("student_name") or participant_name_map.get(student_id, "")
        scoreboard = rank_challenge_scoreboard(scoreboard)
        all_submitted = bool(scoreboard) and all(entry.get("submitted") for entry in scoreboard)
        challenge_status = "ended" if all_submitted else "active"

    should_end = challenge_status == "ended"
    if should_end:
        await manager.end_challenge(class_id, challenge.id, scoreboard, status="ended")
        _bg_scoreboard = deepcopy(scoreboard)
        _bg_challenge_id = challenge.id

        async def _bg_persist():
            from app.db.session import async_session_maker
            async with async_session_maker() as bg_db:
                await _persist_challenge_scoreboard(
                    _bg_challenge_id,
                    _bg_scoreboard,
                    bg_db,
                    status="ended",
                    ended=True,
                    refresh=False,
                )
                _ = bg_db

        asyncio.create_task(_bg_persist())
    else:
        await manager.update_challenge_scoreboard(class_id, challenge.id, scoreboard, status="active")
        _bg_scoreboard = deepcopy(scoreboard)
        _bg_challenge_id = challenge.id

        async def _bg_persist():
            from app.db.session import async_session_maker
            async with async_session_maker() as bg_db:
                await _persist_challenge_scoreboard(
                    _bg_challenge_id,
                    _bg_scoreboard,
                    bg_db,
                    status="active",
                    ended=False,
                    refresh=False,
                )

        asyncio.create_task(_bg_persist())
