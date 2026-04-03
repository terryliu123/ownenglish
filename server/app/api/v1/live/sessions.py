"""Live session and room state management endpoints."""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.api.v1.auth import get_current_user
from app.core.websocket import manager
from app.core.presence import presence_manager
from app.models import (
    User, Class, ClassEnrollment, UserRole, LiveSession
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/live/classes/{class_id}/presence")
async def get_class_presence(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get logged-in and classroom-joined student counts for a class."""
    class_result = await db.execute(select(Class).where(Class.id == class_id))
    class_obj = class_result.scalar_one_or_none()
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
                ClassEnrollment.status == "active",
            )
        )
        if not enrollment_result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Not enrolled")

    roster_result = await db.execute(
        select(ClassEnrollment.student_id).where(
            ClassEnrollment.class_id == class_id,
            ClassEnrollment.status == "active",
        )
    )
    enrolled_student_ids = [row[0] for row in roster_result.all()]
    online_student_ids = presence_manager.get_online_user_ids(enrolled_student_ids)
    room_info = manager.get_room_info(class_id)
    classroom_student_ids = room_info["student_ids"] if room_info else []

    online_students = []
    if online_student_ids:
        online_result = await db.execute(
            select(User.id, User.name).where(User.id.in_(online_student_ids)).order_by(User.name.asc())
        )
        online_students = [
            {"id": row[0], "name": row[1]}
            for row in online_result.all()
        ]

    classroom_students = []
    if classroom_student_ids:
        classroom_result = await db.execute(
            select(User.id, User.name).where(User.id.in_(classroom_student_ids)).order_by(User.name.asc())
        )
        classroom_students = [
            {"id": row[0], "name": row[1]}
            for row in classroom_result.all()
        ]

    return {
        "class_id": class_id,
        "online_student_count": len(online_student_ids),
        "online_student_ids": online_student_ids,
        "online_students": online_students,
        "classroom_student_count": room_info["student_count"] if room_info else 0,
        "classroom_student_ids": classroom_student_ids,
        "classroom_students": classroom_students,
        "has_active_task": room_info["has_active_task"] if room_info else False,
        "has_active_task_group": room_info["has_active_task_group"] if room_info else False,
        "current_task_group_id": room_info["current_task_group_id"] if room_info else None,
        "task_group_submission_count": room_info["task_group_submission_count"] if room_info else 0,
    }


@router.get("/live/room-state")
async def get_room_state_endpoint(
    class_id: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取课堂房间的完整状态，包括任务历史（用于教师重连恢复）"""
    # 验证权限 - 只有教师可以获取完整状态
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can access room state")

    result = await db.execute(select(Class).where(Class.id == class_id))
    class_obj = result.scalar_one_or_none()
    if not class_obj or class_obj.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this class")

    room_state = manager.get_room_state(class_id)
    if not room_state:
        raise HTTPException(status_code=404, detail="Room not found or not active")

    # 获取在线学生详细信息
    roster_result = await db.execute(
        select(ClassEnrollment.student_id).where(
            ClassEnrollment.class_id == class_id,
            ClassEnrollment.status == "active",
        )
    )
    enrolled_student_ids = [row[0] for row in roster_result.all()]
    online_student_ids = presence_manager.get_online_user_ids(enrolled_student_ids)

    online_students = []
    if online_student_ids:
        online_result = await db.execute(
            select(User.id, User.name).where(User.id.in_(online_student_ids)).order_by(User.name.asc())
        )
        online_students = [
            {"id": row[0], "name": row[1]}
            for row in online_result.all()
        ]

    return {
        "class_id": class_id,
        "teacher_id": room_state["teacher_id"],
        "student_count": room_state["student_count"],
        "student_ids": room_state["student_ids"],
        "online_students": online_students,
        "current_task": room_state["current_task"],
        "current_task_group": room_state["current_task_group"],
        "task_history": room_state["task_history"],
        "created_at": room_state["created_at"],
    }
