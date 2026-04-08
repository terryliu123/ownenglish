"""Student submissions management endpoints."""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, select, func, delete

from app.db.session import get_db
from app.api.v1.auth import get_current_user
from app.models import (
    User, LiveTaskGroup, LiveTaskGroupSubmission, LiveSessionEvent, Class, UserRole
)

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
