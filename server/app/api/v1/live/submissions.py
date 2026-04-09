"""Student submissions management endpoints."""
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, select, func, delete

from app.core.websocket import manager
from app.db.session import get_db
from app.api.v1.auth import get_current_user
from app.models import (
    User, LiveTask, LiveTaskGroup, LiveTaskGroupSubmission, LiveSubmission,
    LiveChallengeSession, LiveSessionEvent, Class, UserRole
)
from .logging_utils import log_live_transport

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/live/task-groups/{group_id}/submissions")
async def get_task_group_submissions(
    group_id: str,
    session_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取任务组的所有学生提交详情（用于查看明细）"""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can view submissions")

    # 验证任务组存在且属于该教师的班级
    result = await db.execute(
        select(LiveTaskGroup, Class)
        .join(Class, LiveTaskGroup.class_id == Class.id)
        .where(LiveTaskGroup.id == group_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Task group not found")

    task_group, class_obj = row
    if class_obj.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this class")

    # 获取所有提交记录
    submission_query = (
        select(LiveTaskGroupSubmission, User.name.label("student_name"))
        .join(User, LiveTaskGroupSubmission.student_id == User.id)
        .where(LiveTaskGroupSubmission.group_id == group_id)
    )
    if session_id:
        submission_query = submission_query.where(LiveTaskGroupSubmission.session_id == session_id)

    result = await db.execute(
        submission_query.order_by(LiveTaskGroupSubmission.student_id, LiveTaskGroupSubmission.submitted_at)
    )
    submissions = result.all()

    # 如果按 session_id 查询不到数据，尝试查询所有提交（兼容白板模式历史数据）
    if session_id and not submissions:
        fallback_query = (
            select(LiveTaskGroupSubmission, User.name.label("student_name"))
            .join(User, LiveTaskGroupSubmission.student_id == User.id)
            .where(LiveTaskGroupSubmission.group_id == group_id)
            .order_by(LiveTaskGroupSubmission.student_id, LiveTaskGroupSubmission.submitted_at)
        )
        result = await db.execute(fallback_query)
        submissions = result.all()

    # 如果提供了 session_id，根据 student_joined 事件过滤学生
    if session_id:
        joined_events_result = await db.execute(
            select(LiveSessionEvent)
            .where(
                and_(
                    LiveSessionEvent.live_session_id == session_id,
                    LiveSessionEvent.event_type == "student_joined"
                )
            )
        )
        joined_events = joined_events_result.scalars().all()
        joined_student_ids = set()
        for event in joined_events:
            student_id = event.payload_json.get("student_id") if event.payload_json else None
            if student_id:
                joined_student_ids.add(student_id)

        # 过滤提交：只保留在当前 session 加入过的学生
        if joined_student_ids:
            submissions = [
                (sub, name) for sub, name in submissions
                if sub.student_id in joined_student_ids
            ]

    # 按学生分组整理数据，只保留每道题最新的一次提交
    student_submissions = {}
    for sub, student_name in submissions:
        if sub.student_id not in student_submissions:
            student_submissions[sub.student_id] = {
                "student_id": sub.student_id,
                "student_name": student_name,
                "submission_map": {},
            }
        student_submissions[sub.student_id]["submission_map"][sub.task_id] = {
            "task_id": sub.task_id,
            "answer": sub.answer,
            "is_correct": sub.is_correct,
            "response_time_ms": sub.response_time_ms,
            "submitted_at": sub.submitted_at.isoformat() if sub.submitted_at else None,
        }

    # 计算每个学生的统计信息
    for student_id, data in student_submissions.items():
        subs = list(data.pop("submission_map").values())
        subs.sort(key=lambda item: item["submitted_at"] or "")
        data["submissions"] = subs
        correct_count = sum(1 for s in subs if s["is_correct"])
        data["correct_count"] = correct_count
        data["total_count"] = len(subs)
        data["score"] = round(correct_count / len(subs) * 100) if subs else 0

    return {
        "group_id": group_id,
        "session_id": session_id,
        "students": list(student_submissions.values()),
    }


@router.get("/live/task-groups/{group_id}/my-submissions")
async def get_my_task_group_submissions(
    group_id: str,
    session_id: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current student's submissions for a task group (used to restore state after refresh)."""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can access this")

    # Build query
    query = (
        select(LiveTaskGroupSubmission)
        .where(
            LiveTaskGroupSubmission.group_id == group_id,
            LiveTaskGroupSubmission.student_id == current_user.id,
        )
    )
    if session_id:
        query = query.where(LiveTaskGroupSubmission.session_id == session_id)

    result = await db.execute(query.order_by(LiveTaskGroupSubmission.submitted_at))
    submissions = result.scalars().all()

    return {
        "group_id": group_id,
        "session_id": session_id,
        "has_submitted": len(submissions) > 0,
        "submissions": [
            {
                "task_id": s.task_id,
                "answer": s.answer,
                "is_correct": s.is_correct,
                "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
            }
            for s in submissions
        ],
    }


@router.delete("/live/task-groups/{group_id}/submissions", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task_group_submissions(
    group_id: str,
    session_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除任务组的所有提交记录（教师操作，用于重置学生作答数据）"""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can delete submissions")

    # 验证任务组存在且属于该教师的班级
    result = await db.execute(
        select(LiveTaskGroup, Class)
        .join(Class, LiveTaskGroup.class_id == Class.id)
        .where(LiveTaskGroup.id == group_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Task group not found")

    task_group, class_obj = row
    if class_obj.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this class")

    # 删除提交记录
    query = delete(LiveTaskGroupSubmission).where(LiveTaskGroupSubmission.group_id == group_id)
    if session_id:
        query = query.where(LiveTaskGroupSubmission.session_id == session_id)

    await db.execute(query)
    await db.commit()

    logger.info(f"[Submissions] Teacher {current_user.id} deleted submissions for group {group_id}, session {session_id}")


# ── P0-4: HTTP fallback submission endpoints ──

class TaskGroupSubmitRequest(BaseModel):
    group_id: str
    class_id: Optional[str] = None
    answers: list[dict]  # [{task_id, answer}]
    session_id: Optional[str] = None


class ChallengeSubmitRequest(BaseModel):
    challenge_id: str
    answers: list[dict]  # [{task_id, answer}]
    started_at: Optional[str] = None


@router.post("/live/submit/task-group")
async def http_submit_task_group(
    body: TaskGroupSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """HTTP fallback for task group submission when WebSocket is disconnected."""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can submit")
    student_id = current_user.id
    group_id = body.group_id
    log_live_transport(
        logger,
        "task_group_submit_requested",
        class_id=body.class_id,
        group_id=group_id,
        session_id=body.session_id,
        student_id=student_id,
        transport="http-fallback",
    )

    # Find session_id and class_id
    class_id = body.class_id or await _find_class_id_for_student(student_id, db, allow_enrollment_fallback=False)
    session_id = body.session_id
    if not session_id and class_id:
        from app.api.v1.live.websocket_handlers import _get_active_live_session
        active_session = await _get_active_live_session(class_id, db)
        session_id = active_session.id if active_session else None
    if not class_id:
        raise HTTPException(status_code=400, detail="Class context required for HTTP fallback submission")

    # Duplicate check — include session_id when available
    dedup_stmt = select(LiveTaskGroupSubmission).where(
        LiveTaskGroupSubmission.group_id == group_id,
        LiveTaskGroupSubmission.student_id == student_id,
    )
    if session_id:
        dedup_stmt = dedup_stmt.where(LiveTaskGroupSubmission.session_id == session_id)
    existing = await db.execute(dedup_stmt.limit(1))
    if existing.scalar_one_or_none():
        log_live_transport(
            logger,
            "task_group_submit_duplicate",
            class_id=class_id,
            group_id=group_id,
            session_id=session_id,
            student_id=student_id,
            transport="http-fallback",
        )
        return {"status": "already_submitted", "group_id": group_id}

    # Find the task group to get correct answers
    group_result = await db.execute(
        select(LiveTaskGroup).where(LiveTaskGroup.id == group_id)
    )
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Task group not found")

    task_result = await db.execute(
        select(LiveTask).where(LiveTask.group_id == group_id).order_by(LiveTask.order)
    )
    tasks = {t.id: t for t in task_result.scalars().all()}

    from app.api.v1.live.utils import _answers_match

    for ans in body.answers:
        task_id = ans.get("task_id")
        answer = ans.get("answer")
        task = tasks.get(task_id)
        correct_answer = task.correct_answer if task else None
        is_correct = _answers_match(task.type if task else None, answer, correct_answer) if task else None

        db.add(LiveSubmission(
            task_id=task_id, student_id=student_id, answer=answer, is_correct=is_correct,
        ))
        db.add(LiveTaskGroupSubmission(
            group_id=group_id, session_id=session_id, student_id=student_id,
            task_id=task_id, answer=answer, is_correct=is_correct,
        ))

    await db.commit()

    # Notify via WebSocket if room exists
    await manager.submit_task_group_answer(class_id, group_id, student_id, body.answers)
    log_live_transport(
        logger,
        "task_group_submitted",
        class_id=class_id,
        group_id=group_id,
        session_id=session_id,
        student_id=student_id,
        answer_count=len(body.answers),
        transport="http-fallback",
    )

    return {"status": "ok", "group_id": group_id}


@router.post("/live/submit/challenge")
async def http_submit_challenge(
    body: ChallengeSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """HTTP fallback for challenge submission when WebSocket is disconnected."""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can submit")

    student_id = current_user.id
    challenge_id = body.challenge_id

    result = await db.execute(
        select(LiveChallengeSession).where(LiveChallengeSession.id == challenge_id)
    )
    challenge = result.scalar_one_or_none()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    if challenge.status in {"ended", "cancelled"}:
        return {"status": "already_ended", "challenge_id": challenge_id}
    if student_id not in (challenge.participant_ids or []):
        raise HTTPException(status_code=403, detail="Not a participant")

    # Check existing submission
    scoreboard = list(challenge.scoreboard or [])
    existing = next((e for e in scoreboard if e.get("student_id") == student_id), None)
    if existing and existing.get("submitted"):
        return {"status": "already_submitted", "challenge_id": challenge_id}

    # Score answers
    from app.api.v1.live_challenges import score_challenge_answers
    from app.api.v1.live.websocket_handlers import _serialize_challenge_runtime

    challenge_payload = await _serialize_challenge_runtime(challenge, db)
    score = score_challenge_answers(challenge_payload["tasks"], body.answers)
    if score["answered_count"] <= 0:
        raise HTTPException(status_code=400, detail="No answers submitted")

    # Parse started_at
    started_at = None
    if body.started_at:
        try:
            started_at = datetime.fromisoformat(body.started_at.replace("Z", "+00:00"))
        except Exception:
            pass
    if not started_at:
        started_at = challenge.started_at.replace(tzinfo=None) if challenge.started_at else datetime.now(timezone.utc).replace(tzinfo=None)
    total_time_ms = max(0, int((datetime.now(timezone.utc).replace(tzinfo=None) - started_at.replace(tzinfo=None)).total_seconds() * 1000))

    participant_name = current_user.name or ""
    if not existing:
        existing = {
            "student_id": student_id, "student_name": participant_name,
            "answered_count": 0, "correct_count": 0, "total_tasks": score["total_count"],
            "current_index": 0, "total_time_ms": None, "started_at": None,
            "submitted": False, "locked": False, "eliminated_for_round": False,
            "first_correct_at": None, "current_task_id": None, "rank": None,
        }
        scoreboard.append(existing)

    existing["answered_count"] = score["answered_count"]
    existing["correct_count"] = score["correct_count"]
    existing["total_tasks"] = score["total_count"]
    existing["current_index"] = score["total_count"]
    existing["submitted"] = True
    existing["total_time_ms"] = total_time_ms
    existing["started_at"] = started_at.isoformat()
    existing["student_name"] = participant_name

    from app.api.v1.live_challenges import rank_challenge_scoreboard
    scoreboard = rank_challenge_scoreboard(scoreboard)

    from sqlalchemy.orm.attributes import flag_modified
    challenge.scoreboard = [dict(e) for e in scoreboard]
    flag_modified(challenge, "scoreboard")

    all_submitted = all(e.get("submitted") for e in scoreboard)
    if all_submitted:
        challenge.status = "ended"
        challenge.ended_at = datetime.now(timezone.utc)
    await db.commit()

    # Notify via WebSocket
    class_id = challenge.class_id
    if class_id:
        from app.api.v1.live.websocket_handlers import _extract_challenge_runtime_fields
        from copy import deepcopy
        runtime = await _serialize_challenge_runtime(challenge, db)
        runtime["scoreboard"] = deepcopy(scoreboard)
        runtime["status"] = challenge.status
        fields = _extract_challenge_runtime_fields(runtime)
        if all_submitted:
            await manager.end_challenge(class_id, challenge_id, scoreboard, status="ended", challenge_fields=fields)
        else:
            await manager.update_challenge_scoreboard(class_id, challenge_id, scoreboard, status="active", challenge_fields=fields)

    return {"status": "ok", "challenge_id": challenge_id, "correct_count": score["correct_count"], "total": score["total_count"]}


async def _find_class_id_for_student(
    student_id: str,
    db: AsyncSession,
    allow_enrollment_fallback: bool = True,
) -> Optional[str]:
    """Find the class_id that a student is currently connected to in a room."""
    for cid, room in manager.class_rooms.items():
        if student_id in room.get("student_wss", {}):
            return cid
    if not allow_enrollment_fallback:
        return None
    # Fallback: find from enrollment
    from app.models import ClassEnrollment
    result = await db.execute(
        select(ClassEnrollment.class_id).where(
            ClassEnrollment.student_id == student_id, ClassEnrollment.status == "active"
        ).limit(1)
    )
    return result.scalars().first()
