"""WebSocket handlers for live classroom.

This module contains WebSocket connection handlers that are used by the main live.py.
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import WebSocket, WebSocketDisconnect, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.websocket import manager
from app.core.presence import presence_manager
from app.core.security import decode_token
from app.db.session import get_db, async_session_maker
from app.models import (
    User, Class, ClassEnrollment, UserRole, LiveSession, LiveTask,
    LiveTaskGroup, LiveTaskGroupSubmission, LiveChallengeSession, LiveSubmission
)
from app.api.v1.live_challenges import (
    finalize_challenge_scoreboard_from_drafts,
    rank_challenge_scoreboard,
    score_challenge_answers,
    serialize_challenge_session,
)
from .utils import _parse_challenge_started_at, _answers_match

logger = logging.getLogger(__name__)


async def get_user_from_token(token: str, db: AsyncSession) -> User:
    """Validate token and get user."""
    payload = decode_token(token)
    if not payload:
        raise Exception("Invalid token")

    user_id = payload.get("sub")
    if not user_id:
        raise Exception("Invalid token payload")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise Exception("User not found or inactive")

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


def _serialize_live_task_runtime(task: LiveTask) -> dict:
    return {
        "task_id": task.id,
        "type": task.type,
        "question": task.question,
        "countdown_seconds": task.countdown_seconds,
        "correct_answer": task.correct_answer,
    }


async def _hydrate_room_runtime_state(class_id: str, db: AsyncSession) -> Optional[dict]:
    """Hydrate room runtime state from database."""
    from copy import deepcopy

    room = manager.class_rooms.get(class_id)
    if not room:
        return None

    current_challenge = room.get("current_challenge")
    if current_challenge:
        return {"kind": "challenge", "payload": current_challenge}

    current_task_group = room.get("current_task_group")
    if current_task_group:
        return {"kind": "task_group", "payload": current_task_group}

    current_task = room.get("current_task")
    if current_task:
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
        return {"kind": "challenge", "payload": challenge_payload}

    # Check for active session
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
    else:
        await manager.create_room(class_id, teacher_id, websocket)
        logger.info(f"[WebSocket] Created new room for class {class_id}")

    await _hydrate_room_runtime_state(class_id, db)

    # Ensure LiveSession exists only if there's an active task group
    current_task_group = manager.class_rooms[class_id].get("current_task_group")
    current_challenge = manager.class_rooms[class_id].get("current_challenge")
    current_task = manager.class_rooms[class_id].get("current_task")
    if current_task_group:
        result = await db.execute(
            select(LiveSession).where(
                LiveSession.class_id == class_id,
                LiveSession.group_id == current_task_group["group_id"],
                LiveSession.status == "active",
            )
        )
        session = result.scalar_one_or_none()
        if not session:
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
    elif not current_challenge and not current_task:
        # No active task group, check if we need to clean up orphaned sessions
        result = await db.execute(
            select(LiveSession).where(
                LiveSession.class_id == class_id,
                LiveSession.status == "active",
            )
        )
        orphaned_sessions = result.scalars().all()
        for orphaned in orphaned_sessions:
            orphaned.status = "ended"
            orphaned.ended_at = datetime.now(timezone.utc)
        if orphaned_sessions:
            await db.commit()
            logger.info(f"[WebSocket] Cleaned up {len(orphaned_sessions)} orphaned LiveSessions")

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
            })
        elif manager.class_rooms[class_id].get("current_task_group"):
            current_group = manager.class_rooms[class_id]["current_task_group"]
            await websocket.send_json({
                "type": "new_task_group",
                "group_id": current_group["group_id"],
                "title": current_group["title"],
                "tasks": current_group["tasks"],
                "total_countdown": current_group["total_countdown"],
            })
        elif manager.class_rooms[class_id]["current_task"]:
            await websocket.send_json({
                "type": "current_task",
                "task": manager.class_rooms[class_id]["current_task"],
            })

        while True:
            data = await websocket.receive_json()
            msg_type = data.get('type')
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

    except WebSocketDisconnect:
        logger.info(f"[WebSocket] Teacher {teacher_id} disconnected from class {class_id}")
    except Exception as e:
        logger.error(f"[WebSocket] Teacher connection error: {e}", exc_info=True)


async def handle_student_connection(websocket: WebSocket, class_id: str, student_id: str, db: AsyncSession):
    """Handle student WebSocket connection."""
    logger.info(f"[WebSocket] Student {student_id} attempting to join room {class_id}")
    joined = await manager.join_room(class_id, student_id, websocket)
    if not joined:
        logger.warning(f"[WebSocket] Room not found for student {student_id}: {class_id}")
        await websocket.close(code=4002, reason="Classroom not found or not active")
        return

    logger.info(f"[WebSocket] Student {student_id} joined room {class_id}")

    # 获取学生姓名
    student_result = await db.execute(select(User).where(User.id == student_id))
    student = student_result.scalar_one_or_none()
    student_name = student.name if student else student_id

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

        current_challenge = manager.class_rooms[class_id].get("current_challenge")
        if current_challenge:
            await websocket.send_json({
                "type": "challenge_started",
                "challenge": current_challenge,
                "is_participant": student_id in (current_challenge.get("participant_ids") or []),
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

        task.status = "active"
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
        tasks_data = data.get("tasks", [])
        total_countdown = data.get("total_countdown", 300)

        if not group_id or not tasks_data:
            await websocket.send_json({"type": "error", "message": "Group ID and tasks required"})
            return

        result = await db.execute(
            select(LiveTaskGroup).where(LiveTaskGroup.id == group_id)
        )
        group = result.scalar_one_or_none()
        if not group:
            await websocket.send_json({"type": "error", "message": "Task group not found"})
            return

        group.status = "draft"
        await db.commit()

        # Create LiveSession record
        result = await db.execute(
            select(LiveSession).where(
                LiveSession.class_id == class_id,
                LiveSession.status == "active",
            )
        )
        existing_session = result.scalar_one_or_none()
        if existing_session:
            existing_session.status = "ended"
            existing_session.ended_at = datetime.now(timezone.utc)

        new_session = LiveSession(
            class_id=class_id,
            group_id=group_id,
            topic=group.title,
            status="active"
        )
        db.add(new_session)
        await db.commit()
        await db.refresh(new_session)
        logger.info(f"[WebSocket] Created LiveSession {new_session.id} for task group {group_id}")

        task_list = []
        for task_data in tasks_data:
            task_list.append({
                "task_id": task_data.get("task_id") or task_data.get("id"),
                "type": task_data.get("type"),
                "question": task_data.get("question"),
                "countdown_seconds": task_data.get("countdown_seconds", 30),
                "correct_answer": task_data.get("correct_answer"),
            })

        await manager.publish_task_group(
            class_id,
            group_id,
            group.title,
            task_list,
            total_countdown
        )

        await websocket.send_json({
            "type": "task_group_published",
            "group_id": group_id,
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

        result = await db.execute(
            select(LiveSession).where(
                LiveSession.class_id == class_id,
                LiveSession.group_id == group_id,
                LiveSession.status == "active",
            )
        )
        session = result.scalar_one_or_none()
        if session:
            session.status = "ended"
            session.ended_at = datetime.now(timezone.utc)
            await db.commit()
            logger.info(f"[WebSocket] Ended LiveSession {session.id} for task group {group_id}")

        await manager.end_task_group(class_id, group_id)

        await websocket.send_json({
            "type": "task_group_ended",
            "group_id": group_id,
        })

    elif msg_type == "start_challenge":
        challenge_id = data.get("challenge_id")
        if not challenge_id:
            await websocket.send_json({"type": "error", "message": "Challenge ID required"})
            return

        await _hydrate_room_runtime_state(class_id, db)
        room = manager.class_rooms.get(class_id, {})
        active_challenge = room.get("current_challenge")
        if active_challenge and active_challenge.get("id") != challenge_id and active_challenge.get("status") not in {"ended", "cancelled"}:
            await websocket.send_json({"type": "error", "message": "Another challenge is already active"})
            return
        if room.get("current_task_group"):
            await websocket.send_json({"type": "error", "message": "A task group is already active"})
            return
        if room.get("current_task"):
            await websocket.send_json({"type": "error", "message": "A task is already active"})
            return

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
            })
            return
        if challenge.status in {"ended", "cancelled"}:
            ended_payload = await _serialize_challenge_runtime(challenge, db)
            await websocket.send_json({
                "type": "challenge_ended",
                "challenge": ended_payload,
                "scoreboard": deepcopy(list(challenge.scoreboard or [])),
                "status": challenge.status,
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

        challenge_payload = await _serialize_challenge_runtime(challenge, db)
        await manager.start_challenge(class_id, challenge_payload)

        await websocket.send_json({
            "type": "challenge_started",
            "challenge": challenge_payload,
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

        room_challenge_exists = (
            manager.class_rooms.get(class_id, {}).get("current_challenge") is not None
        )
        if room_challenge_exists:
            await manager.end_challenge(class_id, challenge.id, scoreboard, status="ended")
        else:
            ended_payload_direct = deepcopy(challenge_payload)
            ended_payload_direct["scoreboard"] = deepcopy(scoreboard)
            ended_payload_direct["status"] = "ended"
            direct_msg = {
                "type": "challenge_ended",
                "challenge": ended_payload_direct,
                "scoreboard": deepcopy(scoreboard),
                "status": "ended",
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

        ended_payload = deepcopy(challenge_payload)
        ended_payload["scoreboard"] = deepcopy(scoreboard)
        ended_payload["status"] = "ended"
        await websocket.send_json({
            "type": "challenge_ended",
            "challenge": ended_payload,
            "scoreboard": deepcopy(scoreboard),
            "status": "ended",
        })

    elif msg_type == "end_session":
        result = await db.execute(
            select(LiveSession).where(
                LiveSession.class_id == class_id,
                LiveSession.status == "active",
            )
        )
        session = result.scalar_one_or_none()
        if session:
            session.status = "ended"
            session.ended_at = datetime.now(timezone.utc)
            await db.commit()

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

    elif msg_type == "ping":
        await websocket.send_json({"type": "pong"})


async def handle_student_message(websocket: WebSocket, class_id: str, student_id: str, data: dict, db: AsyncSession):
    """Handle messages from student."""
    import asyncio
    from uuid import uuid4

    msg_type = data.get("type")

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

        room_challenge = manager.class_rooms.get(class_id, {}).get("current_challenge")
        if room_challenge and room_challenge.get("id") == challenge_id:
            challenge_payload = room_challenge
        else:
            challenge_payload = await _serialize_challenge_runtime(challenge, db)
        if student_id not in (challenge.participant_ids or []):
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
        if should_end:
            await manager.end_challenge(class_id, challenge.id, scoreboard, status="ended")
            _bg_scoreboard = deepcopy(scoreboard)
            _bg_challenge_id = challenge.id

            async def _bg_persist():
                async with async_session_maker() as bg_db:
                    challenge = await bg_db.get(LiveChallengeSession, _bg_challenge_id)
                    if challenge:
                        challenge.scoreboard = [dict(entry) for entry in _bg_scoreboard]
                        from sqlalchemy.orm.attributes import flag_modified
                        flag_modified(challenge, "scoreboard")
                        challenge.status = "ended"
                        challenge.ended_at = datetime.now(timezone.utc)
                        await bg_db.commit()

            asyncio.create_task(_bg_persist())
        else:
            await manager.update_challenge_scoreboard(class_id, challenge.id, scoreboard, status="active")
            _bg_scoreboard = deepcopy(scoreboard)
            _bg_challenge_id = challenge.id

            async def _bg_persist():
                async with async_session_maker() as bg_db:
                    challenge = await bg_db.get(LiveChallengeSession, _bg_challenge_id)
                    if challenge:
                        challenge.scoreboard = [dict(entry) for entry in _bg_scoreboard]
                        from sqlalchemy.orm.attributes import flag_modified
                        flag_modified(challenge, "scoreboard")
                        await bg_db.commit()

            asyncio.create_task(_bg_persist())

    elif msg_type == "submit_answer":
        current_task = manager.class_rooms[class_id]["current_task"]
        if not current_task:
            await websocket.send_json({"type": "error", "message": "No active task"})
            return

        task_id = current_task.get("task_id")
        answer = data.get("answer")
        start_time = data.get("start_time")

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
        group_id = data.get("group_id")
        answers = data.get("answers", [])
        session_id = data.get("session_id")

        current_group = manager.class_rooms[class_id].get("current_task_group")
        if not current_group:
            await websocket.send_json({"type": "error", "message": "No active task group"})
            return

        if current_group.get("group_id") != group_id:
            await websocket.send_json({"type": "error", "message": "Task group mismatch"})
            return

        if not session_id:
            active_session_result = await db.execute(
                select(LiveSession.id).where(
                    LiveSession.class_id == class_id,
                    LiveSession.group_id == group_id,
                    LiveSession.status == "active",
                )
            )
            session_id = active_session_result.scalar_one_or_none()

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
        await manager.submit_task_group_answer(class_id, group_id, student_id, answers)

    elif msg_type == "get_current_task":
        await _hydrate_room_runtime_state(class_id, db)

        current_challenge = manager.class_rooms[class_id].get("current_challenge")
        if current_challenge:
            await websocket.send_json({
                "type": "challenge_started",
                "challenge": current_challenge,
                "is_participant": student_id in (current_challenge.get("participant_ids") or []),
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

        await websocket.send_json({
            "type": "share_request_sent",
            "share_id": share_id,
            "status": "pending",
        })

    elif msg_type == "ping":
        await websocket.send_json({"type": "pong"})
