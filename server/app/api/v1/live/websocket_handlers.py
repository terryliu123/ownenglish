"""WebSocket handlers for live classroom.

This module contains WebSocket connection handlers that are used by the main live.py.
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import WebSocket, WebSocketDisconnect, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.websocket import manager, sanitize_danmu_preset_phrases
from app.core.presence import presence_manager
from app.core.security import decode_token
from app.db.session import get_db, async_session_maker
from app.models import (
    User, Class, ClassEnrollment, UserRole, LiveSession, LiveTask,
    LiveTaskGroup, LiveTaskGroupSubmission, LiveChallengeSession, LiveSubmission,
    LiveSessionEvent
)
from app.api.v1.live_challenges import (
    finalize_challenge_scoreboard_from_drafts,
    rank_challenge_scoreboard,
    score_challenge_answers,
    serialize_challenge_session,
)
from .utils import _parse_challenge_started_at, _answers_match
from .classroom_sessions import _get_next_session_number
from .schemas import WS_TEACHER_MESSAGE_SCHEMAS, WS_STUDENT_MESSAGE_SCHEMAS
from .logging_utils import log_live_transport
from pydantic import ValidationError

logger = logging.getLogger(__name__)

# Background task tracking
import asyncio
_background_tasks: set = set()


def _track_background_task(coro):
    """Create a tracked asyncio task that logs errors and self-removes on completion."""
    task = asyncio.create_task(coro)
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
    return task


async def _hydrate_room_task_history(class_id: str, db: AsyncSession, active_session: Optional[LiveSession]) -> None:
    """Restore ended task-group history for the active classroom session into room memory."""
    room = manager.class_rooms.get(class_id)
    if not room or not active_session:
        return

    current_group_id = room.get("current_task_group", {}).get("group_id") if room.get("current_task_group") else None

    ended_group_rows = await db.execute(
        select(
            LiveTask.group_id,
            func.count(LiveTask.id),
            func.max(LiveTask.order),
        )
        .where(
            LiveTask.session_id == active_session.id,
            LiveTask.group_id.is_not(None),
            LiveTask.status == "ended",
        )
        .group_by(LiveTask.group_id)
    )
    ended_groups = ended_group_rows.all()
    if not ended_groups:
        return

    group_ids = [row[0] for row in ended_groups if row[0] and row[0] != current_group_id]
    if not group_ids:
        return

    group_result = await db.execute(
        select(LiveTaskGroup).where(LiveTaskGroup.id.in_(group_ids))
    )
    groups_by_id = {group.id: group for group in group_result.scalars().all()}

    submission_rows = await db.execute(
        select(
            LiveTaskGroupSubmission.group_id,
            func.count(func.distinct(LiveTaskGroupSubmission.student_id)),
        )
        .where(
            LiveTaskGroupSubmission.session_id == active_session.id,
            LiveTaskGroupSubmission.group_id.in_(group_ids),
        )
        .group_by(LiveTaskGroupSubmission.group_id)
    )
    submissions_by_group = {group_id: count for group_id, count in submission_rows.all()}

    restored_history = []
    for group_id, task_count, _max_order in ended_groups:
        if not group_id or group_id == current_group_id:
            continue
        group = groups_by_id.get(group_id)
        restored_history.append(
            {
                "type": "task_group",
                "session_id": active_session.id,
                "group_id": group_id,
                "title": group.title if group else "课堂任务",
                "task_count": int(task_count or 0),
                "published_at": group.updated_at.isoformat() if group and group.updated_at else None,
                "status": "ended",
                "submissions": int(submissions_by_group.get(group_id, 0) or 0),
                "ended_at": group.updated_at.isoformat() if group and group.updated_at else None,
            }
        )

    existing = {
        f"{entry.get('session_id') or active_session.id}:{entry.get('group_id')}"
        for entry in room.get("published_tasks_history", [])
    }
    for entry in restored_history:
        key = f"{entry.get('session_id') or active_session.id}:{entry.get('group_id')}"
        if key not in existing:
            room.setdefault("published_tasks_history", []).append(entry)


async def get_user_from_token(token: str, db: AsyncSession) -> User:
    """Validate token and get user."""
    if not token:
        raise Exception("Token is required")

    payload = decode_token(token)
    if not payload:
        # decode_token returns None for both expired and malformed tokens
        # Try to distinguish by peeking at the token
        try:
            import jwt as pyjwt
            from app.core.config import settings
            # Decode without verification to check exp claim
            unverified = pyjwt.decode(token, options={"verify_signature": False, "verify_exp": False})
            exp = unverified.get("exp")
            if exp:
                from datetime import datetime as _dt, timezone as _tz
                if _dt.fromtimestamp(exp, tz=_tz.utc) < _dt.now(_tz.utc):
                    raise Exception("Token expired, please log in again")
        except Exception:
            pass
        raise Exception("Invalid token")

    user_id = payload.get("sub")
    if not user_id:
        raise Exception("Invalid token payload")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise Exception("User not found")
    if not user.is_active:
        raise Exception("User account is disabled")

    return user


async def get_db_session():
    """Get database session for WebSocket."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


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


def _extract_challenge_runtime_fields(challenge_payload: Optional[dict]) -> dict:
    if not challenge_payload:
        return {}
    return {
        "participant_ids": challenge_payload.get("participant_ids"),
        "current_round": challenge_payload.get("current_round"),
        "current_task_id": challenge_payload.get("current_task_id"),
        "round_status": challenge_payload.get("round_status"),
        "winner_student_id": challenge_payload.get("winner_student_id"),
        "lead_student_id": challenge_payload.get("lead_student_id"),
    }



async def _load_danmu_config(class_id: str, db: AsyncSession, active_session) -> None:
    """Load saved danmu_config from session into room memory."""
    room = manager.class_rooms.get(class_id)
    if not room:
        return

    session = active_session
    if not session:
        # Try to find most recent session for this class
        result = await db.execute(
            select(LiveSession).where(
                LiveSession.class_id == class_id,
            ).order_by(LiveSession.ended_at.desc().nullslast(), LiveSession.started_at.desc())
        )
        session = result.scalars().first()

    if session and session.danmu_config:
        config = session.danmu_config
        room["danmu_enabled"] = config.get("enabled", False)
        room["danmu_show_student"] = config.get("showStudent", True)
        room["danmu_show_source"] = config.get("showSource", False)
        room["danmu_speed"] = config.get("speed", "medium")
        room["danmu_density"] = config.get("density", "medium")
        room["danmu_area"] = config.get("area", "bottom")
        room["danmu_bg_color"] = config.get("bgColor")
        room["danmu_preset_phrases"] = sanitize_danmu_preset_phrases(config.get("presetPhrases"))
        logger.info(f"[Danmu] Loaded config from session {session.id}: enabled={config.get('enabled')}")
    else:
        # Default config
        room["danmu_enabled"] = False
        room["danmu_show_student"] = True
        room["danmu_show_source"] = False
        room["danmu_speed"] = "medium"
        room["danmu_density"] = "medium"
        room["danmu_area"] = "bottom"
        room["danmu_preset_phrases"] = sanitize_danmu_preset_phrases(None)
        logger.info(f"[Danmu] Using default config for class {class_id}")


async def _get_active_live_session(class_id: str, db: AsyncSession) -> Optional[LiveSession]:
    result = await db.execute(
        select(LiveSession)
        .where(
            LiveSession.class_id == class_id,
            LiveSession.status == "active",
        )
        .order_by(LiveSession.started_at.desc())
    )
    sessions = result.scalars().all()
    if len(sessions) > 1:
        logger.warning(
            "[live.runtime] multiple_active_sessions class_id=%s session_ids=%s",
            class_id,
            [session.id for session in sessions],
        )
    return sessions[0] if sessions else None


def _serialize_live_task_runtime(task: LiveTask) -> dict:
    return {
        "task_id": task.id,
        "type": task.type,
        "question": task.question,
        "countdown_seconds": task.countdown_seconds,
        "correct_answer": task.correct_answer,
    }


def _extract_task_title(question: object) -> str:
    if not isinstance(question, dict):
        return ""

    text_field = question.get("text", "")
    if isinstance(text_field, str):
        if text_field:
            return text_field
    elif isinstance(text_field, dict):
        content = text_field.get("content")
        if isinstance(content, list) and content:
            first = content[0]
            if isinstance(first, dict):
                nested = first.get("content")
                if isinstance(nested, list) and nested:
                    node = nested[0]
                    if isinstance(node, dict):
                        text = node.get("text")
                        if isinstance(text, str):
                            return text

    prompt = question.get("prompt")
    if isinstance(prompt, str) and prompt:
        return prompt

    if "passage" in question:
        return "阅读题"

    return ""


async def _hydrate_room_runtime_state(class_id: str, db: AsyncSession) -> Optional[dict]:
    """Hydrate room runtime state from database."""
    from copy import deepcopy

    room = manager.class_rooms.get(class_id)
    if not room:
        return None

    current_challenge = room.get("current_challenge")
    if current_challenge:
        logger.info("[live.runtime] reuse_in_memory_challenge class_id=%s challenge_id=%s", class_id, current_challenge.get("id"))
        return {"kind": "challenge", "payload": current_challenge}

    current_task_group = room.get("current_task_group")
    if current_task_group:
        # Re-sync submission counts from DB (students may have submitted while teacher was disconnected)
        group_id = current_task_group.get("group_id")
        live_session_id = room.get("live_session_id")
        try:
            stmt = select(LiveTaskGroupSubmission.student_id).where(
                LiveTaskGroupSubmission.group_id == group_id,
            )
            if live_session_id:
                stmt = stmt.where(LiveTaskGroupSubmission.session_id == live_session_id)
            submissions_result = await db.execute(stmt)
            submitted_students = {sid for sid in submissions_result.scalars().all()}
            room["task_group_submissions"][group_id] = submitted_students
            # Update history entry submission count
            for entry in room.get("published_tasks_history", []):
                if entry.get("group_id") == group_id:
                    entry["submissions"] = len(submitted_students)
                    break
            logger.info("[live.runtime] resync_task_group_submissions class_id=%s group_id=%s count=%s", class_id, group_id, len(submitted_students))
        except Exception:
            logger.warning("[live.runtime] failed_to_resync_submissions class_id=%s group_id=%s", class_id, group_id)
        logger.info("[live.runtime] reuse_in_memory_task_group class_id=%s group_id=%s", class_id, current_task_group.get("group_id"))
        return {"kind": "task_group", "payload": current_task_group}

    current_task = room.get("current_task")
    if current_task:
        logger.info("[live.runtime] reuse_in_memory_task class_id=%s task_id=%s", class_id, current_task.get("task_id"))
        return {"kind": "task", "payload": current_task}

    # Check for active challenge
    challenge_result = await db.execute(
        select(LiveChallengeSession)
        .where(
            LiveChallengeSession.class_id == class_id,
            LiveChallengeSession.status == "active",
        )
        .order_by(LiveChallengeSession.started_at.desc(), LiveChallengeSession.created_at.desc())
    )
    active_challenge = challenge_result.scalars().first()
    recently_ended = room.get("_recently_ended_challenges", set())
    if active_challenge and active_challenge.id not in recently_ended:
        challenge_payload = await _serialize_challenge_runtime(active_challenge, db)
        room["current_challenge"] = challenge_payload
        room["current_task_group"] = None
        room["current_task"] = None
        logger.info("[live.runtime] hydrate_active_challenge class_id=%s challenge_id=%s", class_id, active_challenge.id)
        return {"kind": "challenge", "payload": challenge_payload}

    # Check for active session with group_id (interaction_management mode)
    session_result = await db.execute(
        select(LiveSession)
        .where(
            LiveSession.class_id == class_id,
            LiveSession.status == "active",
        )
        .order_by(LiveSession.started_at.desc())
    )
    active_session = session_result.scalars().first()
    if active_session and active_session.group_id:
        group_result = await db.execute(
            select(LiveTaskGroup)
            .options(selectinload(LiveTaskGroup.tasks))
            .where(LiveTaskGroup.id == active_session.group_id)
        )
        active_group = group_result.scalar_one_or_none()
        if active_group:
            ordered_tasks = sorted(list(active_group.tasks or []), key=lambda item: item.order or 0)
            task_list = [_serialize_live_task_runtime(task) for task in ordered_tasks]
            submissions_result = await db.execute(
                select(LiveTaskGroupSubmission.student_id).where(
                    LiveTaskGroupSubmission.group_id == active_group.id,
                    LiveTaskGroupSubmission.session_id == active_session.id,
                )
            )
            submitted_students = {student_id for student_id in submissions_result.scalars().all()}
            room["task_group_submissions"][active_group.id] = submitted_students
            task_group_payload = {
                "group_id": active_group.id,
                "title": active_group.title,
                "tasks": task_list,
                "total_countdown": sum(task.get("countdown_seconds", 0) for task in task_list),
                "published_at": (
                    active_session.started_at.isoformat()
                    if active_session.started_at
                    else datetime.now(timezone.utc).isoformat()
                ),
                "status": "active",
            }
            room["current_task_group"] = task_group_payload
            room["current_task"] = None
            room["current_challenge"] = None
            if not any(
                history_entry.get("type") == "task_group"
                and history_entry.get("group_id") == active_group.id
                and history_entry.get("status") == "active"
                for history_entry in room.get("published_tasks_history", [])
            ):
                room["published_tasks_history"].append(
                    {
                        "type": "task_group",
                        "group_id": active_group.id,
                        "title": active_group.title,
                        "task_count": len(task_list),
                        "published_at": task_group_payload["published_at"],
                        "status": "active",
                        "submissions": len(submitted_students),
                    }
                )
            logger.info("[live.runtime] hydrate_active_task_group class_id=%s group_id=%s session_id=%s", class_id, active_group.id, active_session.id)
            return {
                "kind": "task_group",
                "payload": task_group_payload,
                "session": active_session,
            }

    # Check for active task group via LiveTask (whiteboard mode - LiveSession has no group_id)
    if active_session:
        # Find active tasks associated with this session
        active_tasks_result = await db.execute(
            select(LiveTask)
            .where(
                LiveTask.session_id == active_session.id,
                LiveTask.status == "active",
                LiveTask.group_id.isnot(None)
            )
            .order_by(LiveTask.order.asc())
        )
        active_tasks = active_tasks_result.scalars().all()
        if active_tasks:
            # Get the group from the first task
            first_task = active_tasks[0]
            group_id = first_task.group_id
            group_result = await db.execute(
                select(LiveTaskGroup)
                .options(selectinload(LiveTaskGroup.tasks))
                .where(LiveTaskGroup.id == group_id)
            )
            active_group = group_result.scalar_one_or_none()
            if active_group:
                ordered_tasks = sorted(list(active_group.tasks or []), key=lambda item: item.order or 0)
                task_list = [_serialize_live_task_runtime(task) for task in ordered_tasks]
                # Query submissions - for whiteboard mode, session_id might be null in LiveTaskGroupSubmission
                submissions_result = await db.execute(
                    select(LiveTaskGroupSubmission.student_id).where(
                        LiveTaskGroupSubmission.group_id == active_group.id,
                    )
                )
                submitted_students = {student_id for student_id in submissions_result.scalars().all()}
                room["task_group_submissions"][active_group.id] = submitted_students
                task_group_payload = {
                    "group_id": active_group.id,
                    "title": active_group.title,
                    "tasks": task_list,
                    "total_countdown": sum(task.get("countdown_seconds", 0) for task in task_list),
                    "published_at": (
                        active_session.started_at.isoformat()
                        if active_session.started_at
                        else datetime.now(timezone.utc).isoformat()
                    ),
                    "status": "active",
                }
                room["current_task_group"] = task_group_payload
                room["current_task"] = None
                room["current_challenge"] = None
                logger.info("[live.runtime] hydrate_active_task_group_whiteboard class_id=%s group_id=%s session_id=%s submitted_students=%s", class_id, active_group.id, active_session.id, len(submitted_students))
                return {
                    "kind": "task_group",
                    "payload": task_group_payload,
                    "session": active_session,
                }

    # Check for active task
    from sqlalchemy import or_
    task_result = await db.execute(
        select(LiveTask)
        .outerjoin(LiveTaskGroup, LiveTask.group_id == LiveTaskGroup.id)
        .outerjoin(LiveSession, LiveTask.session_id == LiveSession.id)
        .where(LiveTask.status == "active")
        .where(
            or_(
                LiveTaskGroup.class_id == class_id,
                LiveSession.class_id == class_id,
            )
        )
        .order_by(LiveTask.order.asc(), LiveTask.id.asc())
    )
    active_task = task_result.scalars().first()
    if active_task:
        task_payload = _serialize_live_task_runtime(active_task)
        submissions_result = await db.execute(
            select(LiveSubmission.student_id).where(LiveSubmission.task_id == active_task.id)
        )
        room["task_submissions"][active_task.id] = {
            student_id for student_id in submissions_result.scalars().all()
        }
        room["current_task"] = task_payload
        room["current_task_group"] = None
        room["current_challenge"] = None
        logger.info("[live.runtime] hydrate_active_task class_id=%s task_id=%s", class_id, active_task.id)
        return {"kind": "task", "payload": task_payload}

    return None


async def handle_teacher_connection(websocket: WebSocket, class_id: str, teacher_id: str, db: AsyncSession):
    """Handle teacher WebSocket connection."""
    logger.info(f"[WebSocket] Handling teacher connection: {teacher_id} for class {class_id}")
    room_info = manager.get_room_info(class_id)
    is_reconnect = room_info and manager.is_teacher_in_room(class_id, teacher_id)
    session = None
    if is_reconnect:
        manager.class_rooms[class_id]["teacher_ws"] = websocket
        logger.info(f"[WebSocket] Updated existing room for class {class_id}")
        logger.info("[live.runtime] teacher_reconnect_restore class_id=%s teacher_id=%s", class_id, teacher_id)
    else:
        await manager.create_room(class_id, teacher_id, websocket)
        logger.info(f"[WebSocket] Created new room for class {class_id}")

    await _hydrate_room_runtime_state(class_id, db)

    # Ensure LiveSession exists only if there's an active task group
    current_task_group = manager.class_rooms[class_id].get("current_task_group")
    current_challenge = manager.class_rooms[class_id].get("current_challenge")
    current_task = manager.class_rooms[class_id].get("current_task")
    if current_task_group:
        # First try to find session by group_id, then fall back to any active session
        result = await db.execute(
            select(LiveSession).where(
                LiveSession.class_id == class_id,
                LiveSession.group_id == current_task_group["group_id"],
                LiveSession.status == "active",
            )
        )
        session = result.scalars().first()
        if not session:
            # Try any active session for this class (e.g., created by teacher via API)
            session = await _get_active_live_session(class_id, db)
        if not session:
            # Only create a new session if no active session exists at all
            session = LiveSession(
                class_id=class_id,
                group_id=current_task_group["group_id"],
                topic=current_task_group["title"],
                status="active"
            )
            db.add(session)
            await db.commit()
            await db.refresh(session)
            logger.info(f"[WebSocket] Created LiveSession on reconnect: {session.id}")
        else:
            # Reuse existing session — update its group_id if needed
            if not session.group_id:
                session.group_id = current_task_group["group_id"]
                await db.commit()
                logger.info("[WebSocket] Reused existing LiveSession %s for task_group %s", session.id, current_task_group["group_id"])
    elif not current_challenge and not current_task:
        # No active task group — try to find existing active session (created by teacher via API).
        # Do NOT end sessions here; only the teacher's explicit "结束本节课" action should end a session.
        session = await _get_active_live_session(class_id, db)
        if session:
            logger.info("[live.runtime] reuse_existing_session class_id=%s session_id=%s", class_id, session.id)
        else:
            # No active session — teacher needs to click "开始本节课" first.
            # Students will be blocked from joining until a session is created.
            logger.info("[live.runtime] no_active_session class_id=%s — teacher needs to start session", class_id)

    manager.set_room_live_session_id(class_id, session.id if session else None)
    await _hydrate_room_task_history(class_id, db, session)

    # Clean up stale challenge state on reconnect
    if is_reconnect:
        room = manager.class_rooms.get(class_id)
        if room:
            stale_challenge = room.get("current_challenge")
            if stale_challenge:
                challenge_id = stale_challenge.get("id")
                if challenge_id:
                    challenge_check = await db.execute(
                        select(LiveChallengeSession.status).where(LiveChallengeSession.id == challenge_id)
                    )
                    challenge_status = challenge_check.scalar_one_or_none()
                    if challenge_status != "active":
                        logger.info("[live.runtime] cleanup_stale_challenge class_id=%s challenge_id=%s status=%s", class_id, challenge_id, challenge_status)
                        room["current_challenge"] = None

    # Load saved danmu_config from session (active or most recent)
    await _load_danmu_config(class_id, db, session)

    try:
        # Send full room state including task history
        room_state = manager.get_room_state(class_id)
        await websocket.send_json({
            "type": "connected",
            "class_id": class_id,
            "session_id": session.id if session else None,
            "role": "teacher",
            "room_info": manager.get_room_info(class_id),
            "room_state": room_state,
            "is_reconnect": is_reconnect,
        })
        logger.info(f"[WebSocket] Sent connected message to teacher {teacher_id}")

        if manager.class_rooms[class_id].get("current_challenge"):
            await websocket.send_json({
                "type": "challenge_started",
                "challenge": manager.class_rooms[class_id]["current_challenge"],
                **_extract_challenge_runtime_fields(manager.class_rooms[class_id]["current_challenge"]),
            })
        elif manager.class_rooms[class_id].get("current_task_group"):
            current_group = manager.class_rooms[class_id]["current_task_group"]
            await websocket.send_json({
                "type": "new_task_group",
                "group_id": current_group["group_id"],
                "title": current_group["title"],
                "tasks": current_group["tasks"],
                "total_countdown": current_group["total_countdown"],
                "session_id": current_group.get("session_id") or manager.class_rooms[class_id].get("live_session_id"),
                "live_session_id": current_group.get("live_session_id") or manager.class_rooms[class_id].get("live_session_id"),
            })
        elif manager.class_rooms[class_id]["current_task"]:
            await websocket.send_json({
                "type": "current_task",
                "task": manager.class_rooms[class_id]["current_task"],
            })

        while True:
            try:
                data = await websocket.receive_json()
                msg_type = data.get('type')
                manager.touch_teacher(teacher_id)
                print(f"[DEBUG] Received message from teacher: msg_type={msg_type}")
                logger.info(f"[WebSocket] Received message from teacher: {msg_type}")
                try:
                    await handle_teacher_message(websocket, class_id, teacher_id, data, db)
                except WebSocketDisconnect:
                    raise
                except Exception as e:
                    logger.error(f"[WebSocket] Error handling teacher message ({msg_type}): {e}", exc_info=True)
                    try:
                        await websocket.send_json({"type": "error", "message": f"处理消息失败: {e}"})
                    except Exception:
                        pass
            except Exception as e:
                logger.error(f"[WebSocket] Error receiving message: {e}", exc_info=True)
                break

    except WebSocketDisconnect:
        logger.info(f"[WebSocket] Teacher {teacher_id} disconnected from class {class_id}")
        room = manager.class_rooms.get(class_id)
        if room and room.get("teacher_id") == teacher_id and room.get("teacher_ws") is websocket:
            room["teacher_ws"] = None
        manager.teacher_connections.pop(teacher_id, None)
    except Exception as e:
        logger.error(f"[WebSocket] Teacher connection error: {e}", exc_info=True)
        room = manager.class_rooms.get(class_id)
        if room and room.get("teacher_id") == teacher_id and room.get("teacher_ws") is websocket:
            room["teacher_ws"] = None
        manager.teacher_connections.pop(teacher_id, None)


async def handle_student_connection(websocket: WebSocket, class_id: str, student_id: str, db: AsyncSession):
    """Handle student WebSocket connection."""
    logger.info(f"[WebSocket] Student {student_id} attempting to join room {class_id}")
    joined = await manager.join_room(class_id, student_id, websocket)
    if not joined:
        logger.warning(f"[WebSocket] Room not found for student {student_id}: {class_id}")
        await websocket.close(code=4002, reason="Classroom not found or not active")
        return

    logger.info(f"[WebSocket] Student {student_id} joined room {class_id}")
    manager.touch_student(student_id)

    # 获取学生姓名
    student_result = await db.execute(select(User).where(User.id == student_id))
    student = student_result.scalar_one_or_none()
    student_name = student.name if student else student_id

    # 获取当前活跃的课堂会话并记录事件
    try:
        active_session = await _get_active_live_session(class_id, db)

        # 如果没有活跃的课堂会话，拒绝学生加入（教师需要先"开始本节课"）
        if not active_session:
            logger.warning(f"[WebSocket] Student {student_id} rejected: no active session for class {class_id}")
            await websocket.close(code=4003, reason="Class session not started yet")
            return

        event = LiveSessionEvent(
            live_session_id=active_session.id,
            event_type="student_joined",
            payload_json={
                "student_id": student_id,
                "student_name": student_name
            }
        )
        db.add(event)
        await db.commit()
        logger.info(f"[WebSocket] Recorded student_joined event for session {active_session.id}")
    except Exception as e:
        logger.error(f"[WebSocket] Failed to record student_joined event: {e}")

    try:
        await websocket.send_json({
            "type": "connected",
            "class_id": class_id,
            "role": "student",
            "room_info": manager.get_room_info(class_id),
        })

        logger.info(f"[WebSocket] Sending student_joined to teacher for room {class_id}")
        await manager.send_to_teacher(class_id, {
            "type": "student_joined",
            "student_id": student_id,
            "student_name": student_name,
            "student_count": manager.get_student_count(class_id),
        })

        await _hydrate_room_runtime_state(class_id, db)
        logger.info("[live.runtime] student_restore class_id=%s student_id=%s", class_id, student_id)

        current_challenge = manager.class_rooms[class_id].get("current_challenge")
        if current_challenge:
            await websocket.send_json({
                "type": "challenge_started",
                "challenge": current_challenge,
                "is_participant": student_id in (current_challenge.get("participant_ids") or []),
                **_extract_challenge_runtime_fields(current_challenge),
            })
        # Send current task group if active (new group mode)
        elif (current_group := manager.class_rooms[class_id].get("current_task_group")):
            # Check if student already submitted
            group_id = current_group["group_id"]
            has_submitted = student_id in manager.class_rooms[class_id].get("task_group_submissions", {}).get(group_id, set())

            await websocket.send_json({
                "type": "new_task_group",
                "group_id": group_id,
                "title": current_group["title"],
                "tasks": current_group["tasks"],
                "total_countdown": current_group["total_countdown"],
                "has_submitted": has_submitted,
                "session_id": current_group.get("session_id") or manager.class_rooms[class_id].get("live_session_id"),
                "live_session_id": current_group.get("live_session_id") or manager.class_rooms[class_id].get("live_session_id"),
            })

            # If already submitted, also send the submission confirmation
            if has_submitted:
                await websocket.send_json({
                    "type": "task_group_submission_received",
                    "group_id": group_id,
                    "status": "ok",
                })
        elif manager.class_rooms[class_id]["current_task"]:
            # Fall back to single task mode (backward compatible)
            current_task = manager.class_rooms[class_id]["current_task"]
            task_id = current_task.get("task_id")
            has_submitted = student_id in manager.class_rooms[class_id].get("task_submissions", {}).get(task_id, set())

            await websocket.send_json({
                "type": "new_task",
                "task": current_task,
                "has_submitted": has_submitted,
            })

            if has_submitted:
                await websocket.send_json({
                    "type": "submission_received",
                    "task_id": task_id,
                    "status": "ok",
                })

        while True:
            data = await websocket.receive_json()
            manager.touch_student(student_id)
            await handle_student_message(websocket, class_id, student_id, data, db)

    except WebSocketDisconnect:
        logger.info(f"Student {student_id} disconnected from class {class_id}")
        await manager.leave_room(class_id, student_id)
        await manager.send_to_teacher(class_id, {
            "type": "student_left",
            "student_id": student_id,
            "student_count": manager.get_student_count(class_id),
        })
    except Exception as e:
        logger.error(f"Student connection error: {e}")
    finally:
        await manager.leave_room(class_id, student_id)


async def handle_teacher_message(websocket: WebSocket, class_id: str, teacher_id: str, data: dict, db: AsyncSession):
    """Handle messages from teacher."""
    from copy import deepcopy
    from uuid import uuid4
    from sqlalchemy.orm.attributes import flag_modified

    msg_type = data.get("type")
    print(f"[DEBUG] handle_teacher_message: msg_type={msg_type} class_id={class_id}")
    logger.info("[WebSocket] handle_teacher_message: msg_type=%s class_id=%s", msg_type, class_id)

    # Validate message schema for critical types
    schema_cls = WS_TEACHER_MESSAGE_SCHEMAS.get(msg_type)
    if schema_cls:
        try:
            schema_cls(**data)
        except ValidationError as ve:
            logger.warning("[WebSocket] Invalid teacher message schema: type=%s errors=%s", msg_type, ve.errors())
            await websocket.send_json({"type": "error", "message": f"消息格式错误: {ve.errors()}"})
            return

    room = manager.class_rooms.get(class_id, {})

    if msg_type == "publish_task":
        # Publish single task (backward compatible)
        task_id = data.get("task_id")
        if not task_id:
            await websocket.send_json({"type": "error", "message": "Task ID required"})
            return

        result = await db.execute(select(LiveTask).where(LiveTask.id == task_id))
        task = result.scalar_one_or_none()
        if not task:
            await websocket.send_json({"type": "error", "message": "Task not found"})
            return

        # Get current active classroom session (auto-create if not exists)
        active_session = await _get_active_live_session(class_id, db)

        # Auto-create session if not exists (for whiteboard mode)
        if not active_session:
            await websocket.send_json({"type": "error", "message": "请先开始本节课"})
            return
            # Get class info for teacher_id
            class_result = await db.execute(select(Class).where(Class.id == class_id))
            class_obj = class_result.scalar_one_or_none()
            teacher_id = class_obj.teacher_id if class_obj else room.get("teacher_id")

            active_session = LiveSession(
                class_id=class_id,
                teacher_id=teacher_id,
                title=f"第{await _get_next_session_number(db, class_id)}节课",
                entry_mode="whiteboard",
                status="active",
                started_at=datetime.now(timezone.utc)
            )
            db.add(active_session)
            await db.flush()
            logger.info(f"[WebSocket] Auto-created session {active_session.id} for class {class_id}")

            # Record session_started event
            session_event = LiveSessionEvent(
                live_session_id=active_session.id,
                event_type="session_started",
                payload_json={
                    "class_id": class_id,
                    "teacher_id": teacher_id,
                    "entry_mode": "whiteboard",
                    "auto_created": True
                }
            )
            db.add(session_event)
            await db.commit()

        manager.set_room_live_session_id(class_id, active_session.id)

        task.status = "active"
        task.session_id = active_session.id
        await db.commit()

        task_title = _extract_task_title(task.question)
        event = LiveSessionEvent(
            live_session_id=active_session.id,
            event_type="task_published",
            payload_json={
                "task_id": task.id,
                "task_type": task.type,
                "task_title": task_title,
            }
        )
        db.add(event)
        await db.commit()

        task_response = {
            "task_id": task.id,
            "type": task.type,
            "question": task.question,
            "countdown_seconds": task.countdown_seconds,
            "correct_answer": task.correct_answer,
            "session_id": active_session.id,
            "live_session_id": active_session.id,
        }
        await manager.publish_task(class_id, task_response)

        await websocket.send_json({
            "type": "task_published",
            "task": task_response,
            "live_session_id": active_session.id,
        })
        return

        task.status = "active"
        task.session_id = active_session.id
        await db.commit()

        # Record event
        # Extract task title from question (handle rich text object)
        task_title = ""
        if isinstance(task.question, dict):
            text_field = task.question.get("text", "")
            if isinstance(text_field, str):
                task_title = text_field
            elif isinstance(text_field, dict):
                # Rich text object - extract plain text
                task_title = text_field.get("content", [{}])[0].get("content", [{}])[0].get("text", "") if text_field.get("content") else ""
            if not task_title:
                task_title = task.question.get("prompt", "") or "未命名任务"

        event = LiveSessionEvent(
            live_session_id=active_session.id,
            event_type="task_published",
            payload_json={
                "task_id": task.id,
                "task_type": task.type,
                "task_title": task_title or "未命名任务"
            }
        )
        db.add(event)
        await db.commit()

        task_response = {
            "task_id": task.id,
            "type": task.type,
            "question": task.question,
            "countdown_seconds": task.countdown_seconds,
            "correct_answer": task.correct_answer,
        }
        await manager.publish_task(class_id, task_response)

        await websocket.send_json({
            "type": "task_published",
            "task": task_response,
        })

    elif msg_type == "publish_task_group":
        # Publish entire task group
        group_id = data.get("group_id")
        total_countdown = data.get("total_countdown", 300)

        if not group_id:
            await websocket.send_json({"type": "error", "message": "Group ID required"})
            return

        result = await db.execute(
            select(LiveTaskGroup)
            .options(selectinload(LiveTaskGroup.tasks))
            .where(LiveTaskGroup.id == group_id)
        )
        group = result.scalar_one_or_none()
        if not group:
            await websocket.send_json({"type": "error", "message": "Task group not found"})
            return

        # Get current active classroom session (auto-create if not exists)
        active_session = await _get_active_live_session(class_id, db)

        # Auto-create session if not exists (for whiteboard mode)
        if not active_session:
            await websocket.send_json({"type": "error", "message": "请先开始本节课"})
            return
            # Get class info for teacher_id
            class_result = await db.execute(select(Class).where(Class.id == class_id))
            class_obj = class_result.scalar_one_or_none()
            teacher_id = class_obj.teacher_id if class_obj else room.get("teacher_id")

            active_session = LiveSession(
                class_id=class_id,
                teacher_id=teacher_id,
                title=f"第{await _get_next_session_number(db, class_id)}节课",
                entry_mode="whiteboard",
                status="active",
                started_at=datetime.now(timezone.utc)
            )
            db.add(active_session)
            await db.flush()
            logger.info(f"[WebSocket] Auto-created session {active_session.id} for class {class_id}")

            # Record session_started event
            session_event = LiveSessionEvent(
                live_session_id=active_session.id,
                event_type="session_started",
                payload_json={
                    "class_id": class_id,
                    "teacher_id": teacher_id,
                    "entry_mode": "whiteboard",
                    "auto_created": True
                }
            )
            db.add(session_event)
            await db.commit()

        manager.set_room_live_session_id(class_id, active_session.id)

        ordered_tasks = sorted(group.tasks or [], key=lambda item: item.order or 0)
        if not ordered_tasks:
            await websocket.send_json({"type": "error", "message": "该任务组没有题目"})
            return

        task_list = []
        task_ids = []
        task_details = []
        calculated_total_countdown = 0
        for task in ordered_tasks:
            task.session_id = active_session.id
            task.status = "active"
            task_ids.append(task.id)
            task_title = _extract_task_title(task.question)
            task_details.append({
                "task_id": task.id,
                "task_type": task.type,
                "task_title": task_title,
            })
            countdown_seconds = int(task.countdown_seconds or 30)
            calculated_total_countdown += countdown_seconds
            task_list.append({
                "task_id": task.id,
                "type": task.type,
                "question": task.question,
                "countdown_seconds": countdown_seconds,
                "correct_answer": task.correct_answer,
            })

        if not isinstance(total_countdown, int) or total_countdown <= 0:
            total_countdown = calculated_total_countdown + 30

        active_session.group_id = group.id
        await db.commit()

        event = LiveSessionEvent(
            live_session_id=active_session.id,
            event_type="task_published",
            payload_json={
                "group_id": group_id,
                "group_title": group.title,
                "task_count": len(task_list),
                "task_ids": task_ids,
                "session_id": active_session.id,
                "tasks": task_details,
            }
        )
        db.add(event)
        await db.commit()

        await manager.publish_task_group(
            class_id,
            group_id,
            group.title,
            task_list,
            total_countdown
        )
        await manager.save_snapshot(class_id)

        _room = manager.class_rooms.get(class_id, {})
        logger.info(
            "[WebSocket] publish_task_group complete: class_id=%s group_id=%s session_id=%s task_count=%s room_group=%s",
            class_id,
            group_id,
            active_session.id,
            len(task_list),
            _room.get("current_task_group", {}).get("group_id") if _room.get("current_task_group") else None,
        )

        await websocket.send_json({
            "type": "task_group_published",
            "group_id": group_id,
            "title": group.title,
            "tasks": task_list,
            "task_count": len(task_list),
            "session_id": active_session.id,
            "live_session_id": active_session.id,
        })
        return

        task_list = []
        task_ids = []
        task_details = []  # Store detailed task info for event
        for task_data in tasks_data:
            task_id = task_data.get("task_id") or task_data.get("id")
            task_ids.append(task_id)
            task_type = task_data.get("type", "unknown")
            question = task_data.get("question", {})
            # Extract task title from question (handle rich text object)
            task_title = ""
            if isinstance(question, dict):
                text_field = question.get("text", "")
                if isinstance(text_field, str):
                    task_title = text_field
                elif isinstance(text_field, dict):
                    # Rich text object - extract plain text
                    task_title = text_field.get("content", [{}])[0].get("content", [{}])[0].get("text", "") if text_field.get("content") else ""
                if not task_title:
                    task_title = question.get("prompt", "")
                if not task_title and "passage" in question:
                    task_title = "阅读题"
            task_details.append({
                "task_id": task_id,
                "task_type": task_type,
                "task_title": task_title or "未命名任务"
            })
            task_list.append({
                "task_id": task_id,
                "type": task_type,
                "question": question,
                "countdown_seconds": task_data.get("countdown_seconds", 30),
                "correct_answer": task_data.get("correct_answer"),
            })

        # Update tasks to associate with session
        if active_session and task_ids:
            logger.info(f"[WebSocket] Publishing task group: associating {len(task_ids)} tasks with session {active_session.id}")
            for i, task_id in enumerate(task_ids):
                task_result = await db.execute(
                    select(LiveTask).where(LiveTask.id == task_id)
                )
                task = task_result.scalar_one_or_none()
                if task:
                    task.session_id = active_session.id
                    task.status = "active"
                    logger.info(f"[WebSocket] Associated task {task_id} with session {active_session.id}, group_id={group_id}")
            await db.commit()

            # Record event with detailed task info (always record when there's an active session)
            event = LiveSessionEvent(
                live_session_id=active_session.id,
                event_type="task_published",
                payload_json={
                    "group_id": group_id,
                    "group_title": group.title,
                    "task_count": len(task_list),
                    "task_ids": task_ids,
                    "session_id": active_session.id,
                    "tasks": task_details
                }
            )
            db.add(event)
            await db.commit()
        else:
            logger.warning(f"[WebSocket] Cannot associate tasks: active_session={active_session is not None}, task_ids={task_ids}")

        await manager.publish_task_group(
            class_id,
            group_id,
            group.title,
            task_list,
            total_countdown
        )

        logger.info(f"[WebSocket] publish_task_group complete: class_id={class_id}, group_id={group_id}, task_count={len(task_list)}, teacher_id={teacher_id}")
        _room = manager.class_rooms.get(class_id, {})
        logger.info(f"[WebSocket] Room state after publish: current_task_group={_room.get('current_task_group', {}).get('group_id') if _room.get('current_task_group') else None}, task_group_submissions={_room.get('task_group_submissions', {})}")

        await websocket.send_json({
            "type": "task_group_published",
            "group_id": group_id,
            "title": group.title,
            "tasks": task_list,
            "task_count": len(task_list),
        })

    elif msg_type == "end_task":
        task_id = data.get("task_id")
        correct_answer = data.get("correct_answer")

        result = await db.execute(select(LiveTask).where(LiveTask.id == task_id))
        task = result.scalar_one_or_none()
        if task:
            task.status = "ended"
            if correct_answer:
                task.correct_answer = correct_answer
            await db.commit()

        await manager.end_task(class_id, task_id, correct_answer or {})

    elif msg_type == "end_task_group":
        group_id = data.get("group_id")

        result = await db.execute(
            select(LiveTaskGroup).where(LiveTaskGroup.id == group_id)
        )
        group = result.scalar_one_or_none()
        if group:
            group.status = "draft"
            await db.commit()

        # End LiveTasks associated with this group
        tasks_result = await db.execute(
            select(LiveTask).where(LiveTask.group_id == group_id, LiveTask.status == "active")
        )
        ended_tasks = tasks_result.scalars().all()
        for task in ended_tasks:
            task.status = "ended"
        if ended_tasks:
            await db.commit()
            logger.info("[WebSocket] Ended %d LiveTasks for group %s", len(ended_tasks), group_id)

        # Try to find LiveSession by group_id and end the task group association
        # Note: We do NOT end the LiveSession itself here - that's done when
        # the teacher clicks "结束本节课" via the classroom session API.
        result = await db.execute(
            select(LiveSession).where(
                LiveSession.class_id == class_id,
                LiveSession.group_id == group_id,
                LiveSession.status == "active",
            )
        )
        session = result.scalar_one_or_none()

        # Clear the group_id on the session so it's ready for the next task group
        if session:
            session.group_id = None
            await db.commit()
            logger.info("[WebSocket] Cleared group_id on LiveSession %s for task group %s", session.id, group_id)

        await manager.end_task_group(class_id, group_id)
        await manager.save_snapshot(class_id)

        await websocket.send_json({
            "type": "task_group_ended",
            "group_id": group_id,
        })

    elif msg_type == "start_challenge":
        challenge_id = data.get("challenge_id")
        print(f"[DEBUG] start_challenge received: challenge_id={challenge_id} class_id={class_id}")
        logger.info("[live.challenge] start_challenge received: challenge_id=%s class_id=%s", challenge_id, class_id)
        if not challenge_id:
            await websocket.send_json({"type": "error", "message": "Challenge ID required"})
            return

        await _hydrate_room_runtime_state(class_id, db)
        room = manager.class_rooms.get(class_id, {})
        logger.info("[live.challenge] room state: has_room=%s student_count=%s", bool(room), len(room.get("student_wss", {})))
        active_challenge = room.get("current_challenge")
        if active_challenge and active_challenge.get("id") != challenge_id and active_challenge.get("status") not in {"ended", "cancelled"}:
            logger.warning(
                "[live.challenge] start_blocked_active_conflict class_id=%s active_challenge_id=%s requested_challenge_id=%s",
                class_id,
                active_challenge.get("id"),
                challenge_id,
            )
            await websocket.send_json({"type": "error", "message": "Another challenge is already active"})
            return
        # Clear stale task_group / task state from previous interactions.
        # In whiteboard mode, end_task_group may not fully clean up DB state, so
        # _hydrate_room_runtime_state can reload an already-ended task_group.
        # When the teacher explicitly starts a challenge, treat prior state as stale.
        stale_task_group = room.get("current_task_group")
        if stale_task_group:
            stale_group_id = stale_task_group.get("group_id")
            logger.info(
                "[live.challenge] clearing stale task_group before start_challenge class_id=%s group_id=%s",
                class_id, stale_group_id,
            )
            room["current_task_group"] = None
            if stale_group_id:
                room.get("task_group_submissions", {}).pop(stale_group_id, None)
            # End stale LiveTasks in DB
            if stale_group_id:
                stale_tasks_result = await db.execute(
                    select(LiveTask).where(LiveTask.group_id == stale_group_id, LiveTask.status == "active")
                )
                stale_tasks_list = stale_tasks_result.scalars().all()
                for task in stale_tasks_list:
                    task.status = "ended"
                if stale_tasks_list:
                    await db.commit()

        stale_task = room.get("current_task")
        if stale_task:
            stale_task_id = stale_task.get("task_id")
            logger.info(
                "[live.challenge] clearing stale task before start_challenge class_id=%s task_id=%s",
                class_id, stale_task_id,
            )
            room["current_task"] = None
            if stale_task_id:
                room.get("task_submissions", {}).pop(stale_task_id, None)
            if stale_task_id:
                stale_db_task = await db.get(LiveTask, stale_task_id)
                if stale_db_task and stale_db_task.status == "active":
                    stale_db_task.status = "ended"
                    await db.commit()

        room.pop("_recently_ended_challenges", None)

        result = await db.execute(select(LiveChallengeSession).where(LiveChallengeSession.id == challenge_id))
        challenge = result.scalar_one_or_none()
        if not challenge or challenge.class_id != class_id:
            await websocket.send_json({"type": "error", "message": "Challenge not found"})
            return

        if challenge.status == "active":
            challenge_payload = await _serialize_challenge_runtime(challenge, db)
            await manager.start_challenge(class_id, challenge_payload)
            await websocket.send_json({
                "type": "challenge_started",
                "challenge": challenge_payload,
                **_extract_challenge_runtime_fields(challenge_payload),
            })
            return
        if challenge.status in {"ended", "cancelled"}:
            ended_payload = await _serialize_challenge_runtime(challenge, db)
            await websocket.send_json({
                "type": "challenge_ended",
                "challenge": ended_payload,
                "scoreboard": deepcopy(list(challenge.scoreboard or [])),
                "status": challenge.status,
                **_extract_challenge_runtime_fields(ended_payload),
            })
            return

        challenge.status = "active"
        challenge.started_at = challenge.started_at or datetime.now(timezone.utc)
        group_result = await db.execute(select(LiveTaskGroup).where(LiveTaskGroup.id == challenge.task_group_id))
        challenge_group = group_result.scalar_one_or_none()
        if challenge_group:
            challenge_group.status = "draft"
        await db.commit()
        await db.refresh(challenge)

        # Ensure live_session_id is set on the challenge (fallback if not set during creation)
        if not challenge.live_session_id:
            active_session = await _get_active_live_session(class_id, db)
            if active_session:
                challenge.live_session_id = active_session.id
                await db.commit()
                logger.info("[live.challenge] linked challenge %s to session %s", challenge.id, active_session.id)

        challenge_payload = await _serialize_challenge_runtime(challenge, db)
        logger.info("[live.challenge] calling manager.start_challenge for class_id=%s challenge_id=%s", class_id, challenge.id)
        await manager.start_challenge(class_id, challenge_payload)
        await manager.save_snapshot(class_id)
        logger.info("[live.challenge] manager.start_challenge completed")

        # Record challenge_started event
        if challenge.live_session_id:
            event = LiveSessionEvent(
                live_session_id=challenge.live_session_id,
                event_type="challenge_started",
                payload_json={
                    "challenge_id": challenge.id,
                    "challenge_title": challenge.title,
                    "challenge_type": challenge.mode,
                    "participant_count": len(challenge.participant_ids or [])
                }
            )
            db.add(event)
            await db.commit()
        else:
            logger.warning("[live.challenge] no live_session for challenge %s — event not recorded", challenge.id)

        await websocket.send_json({
            "type": "challenge_started",
            "challenge": challenge_payload,
            **_extract_challenge_runtime_fields(challenge_payload),
        })

    elif msg_type == "end_challenge":
        challenge_id = data.get("challenge_id")
        if not challenge_id:
            await websocket.send_json({"type": "error", "message": "Challenge ID required"})
            return

        result = await db.execute(select(LiveChallengeSession).where(LiveChallengeSession.id == challenge_id))
        challenge = result.scalar_one_or_none()
        if not challenge or challenge.class_id != class_id:
            await websocket.send_json({"type": "error", "message": "Challenge not found"})
            return

        room_challenge_data = manager.class_rooms.get(class_id, {}).get("current_challenge")
        if room_challenge_data and room_challenge_data.get("id") == challenge_id:
            challenge_payload = room_challenge_data
        else:
            challenge_payload = await _serialize_challenge_runtime(challenge, db)
        scoreboard = finalize_challenge_scoreboard_from_drafts(
            challenge_payload["tasks"],
            list(challenge.scoreboard or []),
            ended_at=datetime.now(timezone.utc),
        )
        scoreboard = rank_challenge_scoreboard(scoreboard)
        ended_payload_runtime = deepcopy(challenge_payload)
        ended_payload_runtime["scoreboard"] = deepcopy(scoreboard)
        ended_payload_runtime["status"] = "ended"
        challenge_fields = _extract_challenge_runtime_fields(ended_payload_runtime)

        room_challenge_exists = (
            manager.class_rooms.get(class_id, {}).get("current_challenge") is not None
        )
        if room_challenge_exists:
            await manager.end_challenge(
                class_id,
                challenge.id,
                scoreboard,
                status="ended",
                challenge_fields=challenge_fields,
            )
        else:
            direct_msg = {
                "type": "challenge_ended",
                "challenge": ended_payload_runtime,
                "scoreboard": deepcopy(scoreboard),
                "status": "ended",
                **challenge_fields,
            }
            await manager.broadcast_to_students(class_id, direct_msg)
            await manager.send_to_teacher(class_id, direct_msg)
            room = manager.class_rooms.get(class_id, {})
            room.setdefault("_recently_ended_challenges", set()).add(challenge_id)

        challenge.scoreboard = [dict(entry) for entry in scoreboard]
        flag_modified(challenge, "scoreboard")
        challenge.status = "ended"
        challenge.ended_at = datetime.now(timezone.utc)
        await db.commit()

        # Record challenge_ended event
        if challenge.live_session_id:
            event = LiveSessionEvent(
                live_session_id=challenge.live_session_id,
                event_type="challenge_ended",
                payload_json={
                    "challenge_id": challenge.id,
                    "challenge_title": challenge.title,
                    "challenge_type": challenge.mode,
                    "participant_count": len(challenge.participant_ids or []),
                    "scoreboard_summary": {
                        "total_participants": len(scoreboard),
                    }
                }
            )
            db.add(event)
            await db.commit()

        await websocket.send_json({
            "type": "challenge_ended",
            "challenge": ended_payload_runtime,
            "scoreboard": deepcopy(scoreboard),
            "status": "ended",
            **challenge_fields,
        })
        await manager.save_snapshot(class_id)

    elif msg_type == "end_session":
        # 只发送下课通知，不自动结束会话记录
        # 会话记录应该通过 API /live/sessions/{id}/end 显式结束
        await manager.save_snapshot(class_id)
        await manager.close_room(class_id)

    elif msg_type == "get_room_info":
        await websocket.send_json({
            "type": "room_info",
            "room_info": manager.get_room_info(class_id),
        })

    elif msg_type == "approve_share":
        share_id = data.get("share_id")
        if not share_id:
            return
        room = manager.class_rooms.get(class_id)
        share = room.get("pending_shares", {}).get(share_id) if room else None
        if not share:
            return
        teacher_comment = data.get("teacher_comment")
        broadcast_data = {
            "type": "classroom_share",
            "share_id": share_id,
            "content_type": share.get("content_type", "text"),
            "content": share.get("content"),
            "image_url": share.get("image_url"),
            "shared_by": share.get("student_name", ""),
            "teacher_comment": teacher_comment,
        }
        await manager.approve_and_broadcast(class_id, share_id, broadcast_data)

    elif msg_type == "reject_share":
        share_id = data.get("share_id")
        if not share_id:
            return
        await manager.reject_share(class_id, share_id)

    elif msg_type == "danmu_config":
        # Teacher configures danmu settings
        enabled = data.get("enabled", False)
        show_student = data.get("showStudent", True)
        show_source = data.get("showSource", False)
        speed = data.get("speed", "medium")
        density = data.get("density", "medium")
        area = data.get("area", "bottom")
        bg_color = data.get("bgColor")
        preset_phrases = sanitize_danmu_preset_phrases(data.get("presetPhrases"))

        await manager.update_danmu_config(
            class_id,
            enabled=enabled,
            show_student=show_student,
            show_source=show_source,
            speed=speed,
            density=density,
            area=area,
            bg_color=bg_color,
            preset_phrases=preset_phrases,
        )

        # Persist to database (active session or most recent session for this class)
        config_json = {
            "enabled": enabled,
            "showStudent": show_student,
            "showSource": show_source,
            "speed": speed,
            "density": density,
            "area": area,
            "bgColor": bg_color,
            "presetPhrases": preset_phrases,
        }
        session = await _get_active_live_session(class_id, db)
        if session:
            session.danmu_config = config_json
            await db.commit()
            logger.info(f"[Danmu] Config saved to session {session.id}")
        else:
            # No active session — save to most recent ended session for this class
            recent_result = await db.execute(
                select(LiveSession).where(
                    LiveSession.class_id == class_id,
                ).order_by(LiveSession.ended_at.desc().nullslast(), LiveSession.started_at.desc())
            )
            recent_session = recent_result.scalars().first()
            if recent_session:
                recent_session.danmu_config = config_json
                await db.commit()
                logger.info(f"[Danmu] Config saved to recent session {recent_session.id}")

        await websocket.send_json({
            "type": "danmu_config_ack",
            "enabled": enabled,
        })

    elif msg_type == "danmu_trigger":
        # Teacher triggers a preset or custom danmu
        content = data.get("content", "").strip()
        if not content:
            await websocket.send_json({"type": "error", "message": "弹幕内容不能为空"})
            return

        # Get active session for this class
        active_session = await _get_active_live_session(class_id, db)
        if not active_session:
            await websocket.send_json({"type": "error", "message": "无活跃课堂"})
            return

        # Store preset danmu in database
        from app.models import DanmuRecord
        danmu = DanmuRecord(
            session_id=active_session.id,
            class_id=class_id,
            sender_id=teacher_id,
            sender_name="老师",
            content=content,
            is_preset=True,
        )
        db.add(danmu)
        await db.commit()

        # Broadcast to big screen regardless of show_student setting (preset always shows)
        room = manager.class_rooms.get(class_id)
        if room and room.get("danmu_enabled"):
            import random
            row = random.randint(0, 3)
            await manager.broadcast_danmu(
                class_id,
                content=content,
                row=row,
                show_source=room.get("danmu_show_source", False),
                source_name="老师",
            )

        await websocket.send_json({
            "type": "danmu_trigger_ack",
            "content": content,
        })

    elif msg_type == "danmu_clear":
        # Teacher clears all danmu on screen
        await manager.clear_danmu(class_id)
        await websocket.send_json({"type": "danmu_clear_ack"})

    elif msg_type == "atmosphere_effect":
        # Teacher triggers atmosphere effect
        effect = data.get("effect")
        valid_effects = ["cheer", "fireworks", "stars", "hearts", "flame"]
        if effect not in valid_effects:
            await websocket.send_json({"type": "error", "message": "无效的氛围效果"})
            return
        payload = {"type": "atmosphere_effect", "effect": effect}
        await manager.broadcast_to_students(class_id, payload)
        await manager.send_to_teacher(class_id, payload)
        await websocket.send_json({"type": "atmosphere_effect_ack", "effect": effect})

    elif msg_type == "ping":
        manager.touch_teacher(teacher_id)
        logger.debug(
            "[live.ws] heartbeat role=teacher class_id=%s teacher_id=%s",
            class_id,
            teacher_id,
        )
        await websocket.send_json({"type": "pong"})

    elif msg_type == "token_refresh":
        # P0-2: WS token refresh for teacher
        new_token = data.get("token")
        if not new_token:
            await websocket.send_json({"type": "error", "message": "Token required"})
            return
        try:
            async with async_session_maker() as token_db:
                refreshed_user = await get_user_from_token(new_token, token_db)
            if refreshed_user.id != teacher_id:
                await websocket.send_json({"type": "error", "message": "Token user mismatch"})
                return
            await websocket.send_json({"type": "token_refresh_ack", "status": "ok"})
            logger.info("[live.ws] teacher token refreshed: %s", teacher_id)
        except Exception as e:
            await websocket.send_json({"type": "error", "message": f"Token refresh failed: {e}"})


async def handle_student_message(websocket: WebSocket, class_id: str, student_id: str, data: dict, db: AsyncSession):
    """Handle messages from student."""
    import asyncio
    from uuid import uuid4

    msg_type = data.get("type")
    logger.info(f"[STUDENT_MSG] student={student_id} type={msg_type} keys={list(data.keys())}")

    # Validate message schema for critical types
    schema_cls = WS_STUDENT_MESSAGE_SCHEMAS.get(msg_type)
    if schema_cls:
        try:
            schema_cls(**data)
        except ValidationError as ve:
            logger.warning("[WebSocket] Invalid student message schema: type=%s errors=%s", msg_type, ve.errors())
            await websocket.send_json({"type": "error", "message": f"消息格式错误: {ve.errors()}"})
            return

    if msg_type == "challenge_progress":
        challenge_id = data.get("challenge_id")
        if not challenge_id:
            await websocket.send_json({"type": "error", "message": "Challenge ID required"})
            return

        room_challenge = manager.class_rooms.get(class_id, {}).get("current_challenge")
        if not room_challenge or room_challenge.get("id") != challenge_id:
            await _hydrate_room_runtime_state(class_id, db)
            room_challenge = manager.class_rooms[class_id].get("current_challenge")
            if not room_challenge or room_challenge.get("id") != challenge_id:
                logger.warning("[live.challenge] progress_restore_failed class_id=%s challenge_id=%s student_id=%s", class_id, challenge_id, student_id)
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
            challenge = await db.get(LiveChallengeSession, challenge_id)
            if challenge:
                challenge.scoreboard = [dict(entry) for entry in scoreboard]
                from sqlalchemy.orm.attributes import flag_modified
                flag_modified(challenge, "scoreboard")
                await db.commit()

    elif msg_type == "submit_challenge":
        from copy import deepcopy
        _client_msg_id = data.get("msg_id")
        challenge_id = data.get("challenge_id")
        answers = data.get("answers", [])
        client_started_at = _parse_challenge_started_at(data.get("started_at"))
        log_live_transport(
            logger,
            "challenge_submit_requested",
            class_id=class_id,
            challenge_id=challenge_id,
            student_id=student_id,
            answer_count=len(answers),
            transport="ws",
        )
        if not challenge_id:
            await websocket.send_json({"type": "error", "message": "Challenge ID required"})
            return

        result = await db.execute(select(LiveChallengeSession).where(LiveChallengeSession.id == challenge_id))
        challenge = result.scalar_one_or_none()
        if not challenge or challenge.class_id != class_id:
            logger.warning("[live.challenge] submit_failed_not_found class_id=%s challenge_id=%s student_id=%s", class_id, challenge_id, student_id)
            await websocket.send_json({"type": "error", "message": "Challenge not found"})
            return

        if challenge.status in {"ended", "cancelled"}:
            logger.info("[live.challenge] submit_after_end class_id=%s challenge_id=%s student_id=%s status=%s", class_id, challenge.id, student_id, challenge.status)
            ended_payload = await _serialize_challenge_runtime(challenge, db)
            current_scoreboard = deepcopy(list(challenge.scoreboard or []))
            ended_payload["scoreboard"] = current_scoreboard
            ended_payload["status"] = challenge.status
            await websocket.send_json({
                "type": "challenge_ended",
                "challenge": ended_payload,
                "scoreboard": current_scoreboard,
                "status": challenge.status,
                **_extract_challenge_runtime_fields(ended_payload),
            })
            return

        room_challenge = manager.class_rooms.get(class_id, {}).get("current_challenge")
        if room_challenge and room_challenge.get("id") == challenge_id:
            challenge_payload = room_challenge
        else:
            challenge_payload = await _serialize_challenge_runtime(challenge, db)
        if student_id not in (challenge.participant_ids or []):
            logger.warning("[live.challenge] submit_failed_not_participant class_id=%s challenge_id=%s student_id=%s", class_id, challenge.id, student_id)
            await websocket.send_json({"type": "error", "message": "Not a challenge participant"})
            return

        scoreboard = list(challenge.scoreboard or [])

        def _get_challenge_entry(scoreboard: list[dict], student_id: str) -> Optional[dict]:
            return next((entry for entry in scoreboard if entry.get("student_id") == student_id), None)

        existing_entry = _get_challenge_entry(scoreboard, student_id)
        if existing_entry and (
            existing_entry.get("submitted")
            or existing_entry.get("eliminated_for_round")
            or existing_entry.get("locked")
        ):
            log_live_transport(
                logger,
                "challenge_submit_duplicate",
                class_id=class_id,
                challenge_id=challenge.id,
                student_id=student_id,
                transport="ws",
            )
            logger.info("[live.challenge] submit_duplicate class_id=%s challenge_id=%s student_id=%s", class_id, challenge.id, student_id)
            await websocket.send_json({
                "type": "challenge_scoreboard_updated",
                "challenge_id": challenge.id,
                "scoreboard": deepcopy(scoreboard),
                "status": challenge.status or "active",
                **_extract_challenge_runtime_fields(challenge_payload),
            })
            return

        score = score_challenge_answers(challenge_payload["tasks"], answers)
        if score["answered_count"] <= 0:
            logger.warning("[live.challenge] submit_failed_no_answers class_id=%s challenge_id=%s student_id=%s", class_id, challenge.id, student_id)
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
        challenge.scoreboard = [dict(entry) for entry in scoreboard]
        challenge.status = challenge_status
        if should_end:
            challenge.ended_at = datetime.now(timezone.utc)
        runtime_payload = await _serialize_challenge_runtime(challenge, db)
        runtime_payload["scoreboard"] = deepcopy(scoreboard)
        runtime_payload["status"] = challenge_status
        challenge_fields = _extract_challenge_runtime_fields(runtime_payload)

        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(challenge, "scoreboard")
        await db.commit()
        log_live_transport(
            logger,
            "challenge_submitted",
            class_id=class_id,
            challenge_id=challenge.id,
            live_session_id=challenge.live_session_id,
            student_id=student_id,
            status=challenge_status,
            answer_count=len(answers),
            transport="ws",
        )

        # Send ACK only after durable persistence succeeds
        if _client_msg_id:
            try:
                await websocket.send_json({"type": "ack", "msg_id": _client_msg_id})
            except Exception:
                logger.warning("[WebSocket] Failed to send challenge ACK to student student_id=%s", student_id)

        if should_end:
            await manager.end_challenge(
                class_id,
                challenge.id,
                scoreboard,
                status="ended",
                challenge_fields=challenge_fields,
            )
        else:
            await manager.update_challenge_scoreboard(
                class_id,
                challenge.id,
                scoreboard,
                status="active",
                challenge_fields=challenge_fields,
            )

    elif msg_type == "submit_answer":
        current_task = manager.class_rooms[class_id]["current_task"]
        if not current_task:
            await websocket.send_json({"type": "error", "message": "No active task"})
            return

        task_id = current_task.get("task_id")
        answer = data.get("answer")
        start_time = data.get("start_time")

        # 检查学生是否已经提交过此任务 - 防重复提交
        existing_submission = await db.execute(
            select(LiveSubmission).where(
                LiveSubmission.task_id == task_id,
                LiveSubmission.student_id == student_id,
            ).limit(1)
        )
        if existing_submission.scalar_one_or_none():
            await websocket.send_json({
                "type": "submission_received",
                "task_id": task_id,
                "status": "already_submitted",
            })
            return

        response_time_ms = None
        if start_time:
            try:
                start_dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
                response_time_ms = int((datetime.now(timezone.utc).replace(tzinfo=None) - start_dt.replace(tzinfo=None)).total_seconds() * 1000)
            except Exception:
                pass

        correct_answer = current_task.get("question", {}).get("correct_answer")
        is_correct = None
        if correct_answer is not None:
            is_correct = (answer == correct_answer)

        submission = LiveSubmission(
            task_id=task_id,
            student_id=student_id,
            answer=answer,
            is_correct=is_correct,
            response_time_ms=response_time_ms,
        )
        db.add(submission)
        await db.commit()

        await manager.submit_answer(class_id, task_id, student_id, answer)

    elif msg_type == "submit_task_group":
        _client_msg_id = data.get("msg_id")
        group_id = data.get("group_id")
        answers = data.get("answers", [])
        session_id = data.get("session_id")
        log_live_transport(
            logger,
            "task_group_submit_requested",
            class_id=class_id,
            group_id=group_id,
            session_id=session_id,
            student_id=student_id,
            answer_count=len(answers),
            transport="ws",
        )

        logger.info(f"[WebSocket] submit_task_group received: student_id={student_id}, class_id={class_id}, group_id={group_id}, answers_count={len(answers)}")
        if class_id not in manager.class_rooms:
            logger.error(f"[WebSocket] submit_task_group: class_id={class_id} not in class_rooms!")
            await websocket.send_json({"type": "error", "message": "Classroom not found"})
            return
        current_group = manager.class_rooms[class_id].get("current_task_group")
        if not current_group:
            await websocket.send_json({"type": "error", "message": "No active task group"})
            return

        if current_group.get("group_id") != group_id:
            await websocket.send_json({"type": "error", "message": "Task group mismatch"})
            return

        # 检查学生是否已经提交过此任务组 - 防重复提交
        logger.info(f"[WebSocket] Checking duplicate submission: student_id={student_id}, group_id={group_id}, provided_session_id={session_id}")

        if not session_id:
            session_id = current_group.get("session_id") or manager.class_rooms[class_id].get("live_session_id")

        if not session_id:
            # 首先尝试通过 LiveSession 的 group_id 关联查询
            active_session_result = await db.execute(
                select(LiveSession.id).where(
                    LiveSession.class_id == class_id,
                    LiveSession.group_id == group_id,
                    LiveSession.status == "active",
                )
            )
            session_id = active_session_result.scalars().first()
            logger.info(f"[WebSocket] Resolved session_id from LiveSession (by group_id): {session_id}")

            # 如果查不到，尝试通过 LiveTask 关联查询（白板模式 LiveSession 没有 group_id）
            if not session_id:
                task_session_result = await db.execute(
                    select(LiveTask.session_id).where(
                        LiveTask.group_id == group_id,
                        LiveTask.status == "active"
                    ).distinct()
                )
                session_ids = task_session_result.scalars().all()
                if session_ids:
                    # 找到对应的 LiveSession
                    live_session_result = await db.execute(
                        select(LiveSession.id).where(
                            LiveSession.id.in_(session_ids),
                            LiveSession.class_id == class_id,
                            LiveSession.status == "active"
                        )
                    )
                    session_id = live_session_result.scalars().first()
                    logger.info(f"[WebSocket] Resolved session_id from LiveTask: {session_id}")

        existing_submission_stmt = select(LiveTaskGroupSubmission).where(
            LiveTaskGroupSubmission.group_id == group_id,
            LiveTaskGroupSubmission.student_id == student_id,
        )
        if session_id:
            existing_submission_stmt = existing_submission_stmt.where(
                LiveTaskGroupSubmission.session_id == session_id,
            )

        existing_submission = await db.execute(existing_submission_stmt.limit(1))
        if existing_submission.scalar_one_or_none():
            log_live_transport(
                logger,
                "task_group_submit_duplicate",
                class_id=class_id,
                group_id=group_id,
                session_id=session_id,
                student_id=student_id,
                transport="ws",
            )
            logger.warning(f"[WebSocket] Duplicate submission detected: student_id={student_id}, group_id={group_id}, session_id={session_id}")
            await websocket.send_json({
                "type": "task_group_submission_received",
                "group_id": group_id,
                "status": "already_submitted",
            })
            # Get actual submission count from database (room state may be stale after teacher refresh)
            from sqlalchemy import func
            count_result = await db.execute(
                select(func.count(LiveTaskGroupSubmission.id)).where(
                    LiveTaskGroupSubmission.group_id == group_id,
                    LiveTaskGroupSubmission.session_id == session_id if session_id else True,
                )
            )
            actual_count = count_result.scalar() or 0
            # Notify teacher about duplicate submission attempt with actual count
            await manager.submit_task_group_answer(class_id, group_id, student_id, answers, is_duplicate=True, db_submission_count=actual_count)
            return

        for ans in answers:
            task_id = ans.get("task_id")
            answer = ans.get("answer")
            start_time = ans.get("start_time")

            response_time_ms = None
            if start_time:
                try:
                    start_dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
                    response_time_ms = int((datetime.now(timezone.utc).replace(tzinfo=None) - start_dt.replace(tzinfo=None)).total_seconds() * 1000)
                except Exception:
                    pass

            correct_answer = None
            is_correct = None
            task_type = None
            for task in current_group.get("tasks", []):
                if task.get("task_id") == task_id:
                    correct_answer = task.get("correct_answer") or task.get("question", {}).get("correct_answer")
                    task_type = task.get("type")
                    is_correct = _answers_match(task_type, answer, correct_answer)
                    break

            logger.info(f"[WebSocket] Saving submission: student_id={student_id}, task_id={task_id}, group_id={group_id}, session_id={session_id}, is_correct={is_correct}")

            submission = LiveSubmission(
                task_id=task_id,
                student_id=student_id,
                answer=answer,
                is_correct=is_correct,
                response_time_ms=response_time_ms,
            )
            db.add(submission)

            group_submission = LiveTaskGroupSubmission(
                group_id=group_id,
                session_id=session_id,
                student_id=student_id,
                task_id=task_id,
                answer=answer,
                is_correct=is_correct,
                response_time_ms=response_time_ms,
            )
            db.add(group_submission)

        await db.commit()
        log_live_transport(
            logger,
            "task_group_submitted",
            class_id=class_id,
            group_id=group_id,
            session_id=session_id,
            student_id=student_id,
            answer_count=len(answers),
            transport="ws",
        )
        logger.info(f"[WebSocket] Task group submission committed: student_id={student_id}, group_id={group_id}, answer_count={len(answers)}")

        # Send ACK after successful persistence
        if _client_msg_id:
            try:
                await websocket.send_json({"type": "ack", "msg_id": _client_msg_id})
            except Exception:
                logger.warning("[WebSocket] Failed to send ACK to student student_id=%s", student_id)

        # Notify student of successful persistence
        try:
            await websocket.send_json({
                "type": "task_group_submission_received",
                "group_id": group_id,
                "status": "ok",
            })
        except Exception:
            logger.warning("[WebSocket] Failed to confirm submission to student student_id=%s", student_id)

        # Broadcast to teacher with retry
        try:
            await manager.submit_task_group_answer(class_id, group_id, student_id, answers)
        except Exception:
            logger.warning("[WebSocket] Teacher broadcast failed, retrying in 1s: group_id=%s student_id=%s", group_id, student_id)
            try:
                await asyncio.sleep(1)
                await manager.submit_task_group_answer(class_id, group_id, student_id, answers)
            except Exception:
                logger.error("[WebSocket] Teacher broadcast retry also failed: group_id=%s student_id=%s (data persisted)", group_id, student_id)

    elif msg_type == "get_current_task":
        await _hydrate_room_runtime_state(class_id, db)

        current_challenge = manager.class_rooms[class_id].get("current_challenge")
        if current_challenge:
            await websocket.send_json({
                "type": "challenge_started",
                "challenge": current_challenge,
                "is_participant": student_id in (current_challenge.get("participant_ids") or []),
                **_extract_challenge_runtime_fields(current_challenge),
            })
            return

        current_group = manager.class_rooms[class_id].get("current_task_group")
        if current_group:
            group_id = current_group["group_id"]
            has_submitted = student_id in manager.class_rooms[class_id].get("task_group_submissions", {}).get(group_id, set())

            await websocket.send_json({
                "type": "new_task_group",
                "group_id": group_id,
                "title": current_group["title"],
                "tasks": current_group["tasks"],
                "total_countdown": current_group["total_countdown"],
                "has_submitted": has_submitted,
                "session_id": current_group.get("session_id") or manager.class_rooms[class_id].get("live_session_id"),
                "live_session_id": current_group.get("live_session_id") or manager.class_rooms[class_id].get("live_session_id"),
            })

            if has_submitted:
                await websocket.send_json({
                    "type": "task_group_submission_received",
                    "group_id": group_id,
                    "status": "ok",
                })
            return

        current_task = manager.class_rooms[class_id]["current_task"]
        if current_task:
            task_id = current_task.get("task_id")
            has_submitted = student_id in manager.class_rooms[class_id].get("task_submissions", {}).get(task_id, set())

            await websocket.send_json({
                "type": "new_task",
                "task": current_task,
                "has_submitted": has_submitted,
            })

            if has_submitted:
                await websocket.send_json({
                    "type": "submission_received",
                    "task_id": task_id,
                    "status": "ok",
                })
        else:
            await websocket.send_json({"type": "no_active_task"})

    elif msg_type == "student_share_request":
        content_type = data.get("content_type", "text")
        content = data.get("content", "")
        image_url = data.get("image_url")

        if not content and not image_url:
            await websocket.send_json({"type": "error", "message": "分享内容不能为空"})
            return

        if not manager._check_share_rate_limit(class_id, student_id):
            await websocket.send_json({"type": "error", "message": "分享频率过高，请稍后再试"})
            return

        share_id = str(uuid4())

        student = await db.get(User, student_id)
        student_name = student.name if student else student_id

        share_data = {
            "type": "student_share_request",
            "share_id": share_id,
            "student_id": student_id,
            "student_name": student_name,
            "content_type": content_type,
            "content": content,
            "image_url": image_url,
        }
        await manager.add_pending_share(class_id, share_id, share_data)

        # Record share event in session
        live_session_id = manager.class_rooms.get(class_id, {}).get("live_session_id")
        if live_session_id:
            db.add(LiveSessionEvent(
                live_session_id=live_session_id,
                event_type="share_requested",
                payload_json={
                    "share_id": share_id,
                    "student_id": student_id,
                    "student_name": student_name,
                    "content_type": content_type,
                },
            ))
            await db.commit()

        await websocket.send_json({
            "type": "share_request_sent",
            "share_id": share_id,
            "status": "pending",
        })

    elif msg_type == "danmu_send":
        # Student sends a danmu
        content = data.get("content", "").strip()
        logger.info(f"[DANMU_DEBUG] student={student_id} class={class_id} content={content!r}")
        if not content:
            await websocket.send_json({"type": "error", "message": "弹幕内容不能为空"})
            return
        if len(content) > 200:
            await websocket.send_json({"type": "error", "message": "弹幕内容过长"})
            return

        # Backend rate limit check (1 danmu per 10s)
        if not manager._check_danmu_rate_limit(class_id, student_id):
            await websocket.send_json({"type": "error", "message": "发送太频繁，请稍后再试"})
            return

        # Sensitive word check (local + third-party)
        from app.services.sensitive_word import check_sensitive_word
        check_result = await check_sensitive_word(content)
        if check_result["blocked"]:
            await websocket.send_json({"type": "error", "message": "内容包含敏感词"})
            return

        # Get active session for this class
        active_session = await _get_active_live_session(class_id, db)
        if not active_session:
            await websocket.send_json({"type": "error", "message": "无活跃课堂"})
            return

        # Get student name
        student_result = await db.execute(select(User).where(User.id == student_id))
        student = student_result.scalar_one_or_none()
        sender_name = student.name if student else student_id

        # Store danmu in database
        from app.models import DanmuRecord
        danmu = DanmuRecord(
            session_id=active_session.id,
            class_id=class_id,
            sender_id=student_id,
            sender_name=sender_name,
            content=content,
            is_preset=False,
        )
        db.add(danmu)
        await db.commit()
        await db.refresh(danmu)

        # Broadcast to big screen if enabled
        room = manager.class_rooms.get(class_id)
        logger.info(f"[DANMU_DEBUG] room_exists={bool(room)} danmu_enabled={room.get('danmu_enabled') if room else 'N/A'} danmu_show_student={room.get('danmu_show_student') if room else 'N/A'}")
        if room and room.get("danmu_enabled"):
            if room.get("danmu_show_student"):
                # Assign a row (0-3)
                import random
                row = random.randint(0, 3)
                await manager.broadcast_danmu(
                    class_id,
                    content=content,
                    row=row,
                    show_source=room.get("danmu_show_source", False),
                    source_name=sender_name,
                )

        # Silent success (no explicit feedback to student)

    elif msg_type == "ping":
        manager.touch_student(student_id)
        logger.debug(
            "[live.ws] heartbeat role=student class_id=%s student_id=%s",
            class_id,
            student_id,
        )
        await websocket.send_json({"type": "pong"})

    elif msg_type == "token_refresh":
        new_token = data.get("token")
        if not new_token:
            await websocket.send_json({"type": "error", "message": "Token required"})
            return
        try:
            async with async_session_maker() as token_db:
                refreshed_user = await get_user_from_token(new_token, token_db)
            if refreshed_user.id != student_id:
                await websocket.send_json({"type": "error", "message": "Token user mismatch"})
                return
            await websocket.send_json({"type": "token_refresh_ack", "status": "ok"})
            logger.info("[live.ws] student token refreshed: %s", student_id)
        except Exception as e:
            await websocket.send_json({"type": "error", "message": f"Token refresh failed: {e}"})
