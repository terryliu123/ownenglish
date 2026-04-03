"""Task groups CRUD and management endpoints."""
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, File, Form, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.api.v1.auth import get_current_user
from app.models import (
    User, LiveTaskGroup, LiveTask, Class, ClassEnrollment, UserRole,
    TaskGroupShare, ActivityType, LiveSession
)
from app.services.membership import FEATURE_TASK_GROUPS, assert_teacher_feature_access
from .schemas import (
    LiveTaskCreate, LiveTaskUpdate, LiveTaskGroupCreate, LiveTaskGroupUpdate, ReorderTasksRequest,
    ShareTaskGroupRequest, ImportSharedTaskGroupRequest,
    AiImportTaskGroupRequest, AiGenerateTaskGroupRequest
)
from .utils import log_activity
from .ai_import import (
    _build_import_questions_with_ai, _build_generated_questions_with_ai,
    _build_reading_import_task, _extract_docx_text
)

logger = logging.getLogger(__name__)
router = APIRouter()


async def _validate_teacher_class_access(class_id: str, current_user: User, db: AsyncSession) -> Class:
    result = await db.execute(select(Class).where(Class.id == class_id))
    class_obj = result.scalar_one_or_none()
    if not class_obj or class_obj.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return class_obj


async def _create_group_with_tasks(
    class_id: str,
    title: str,
    task_drafts: list,
    db: AsyncSession,
) -> LiveTaskGroup:
    group = LiveTaskGroup(
        class_id=class_id,
        title=title,
        status="draft",
    )
    db.add(group)
    await db.flush()

    for draft in task_drafts:
        question_payload = dict(draft["question"])
        if draft.get("explanation"):
            question_payload["explanation"] = draft["explanation"]
        task = LiveTask(
            group_id=group.id,
            type=draft["type"],
            question=question_payload,
            countdown_seconds=draft["countdown_seconds"],
            correct_answer=draft["correct_answer"],
            order=draft["order"],
            status="pending",
        )
        db.add(task)

    await db.commit()
    await db.refresh(group)
    return group


async def _append_tasks_to_group(
    group_id: str,
    task_drafts: list,
    db: AsyncSession,
) -> LiveTaskGroup:
    result = await db.execute(
        select(LiveTaskGroup)
        .options(selectinload(LiveTaskGroup.tasks))
        .where(LiveTaskGroup.id == group_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Task group not found")

    max_order = max([task.order for task in group.tasks], default=-1)
    for offset, draft in enumerate(task_drafts, start=1):
        question_payload = dict(draft["question"])
        if draft.get("explanation"):
            question_payload["explanation"] = draft["explanation"]
        task = LiveTask(
            group_id=group.id,
            type=draft["type"],
            question=question_payload,
            countdown_seconds=draft["countdown_seconds"],
            correct_answer=draft["correct_answer"],
            order=max_order + offset,
            status="pending",
        )
        db.add(task)

    await db.commit()
    await db.refresh(group)
    return group


async def _serialize_group_with_tasks(group_id: str, db: AsyncSession) -> dict:
    result = await db.execute(
        select(LiveTaskGroup)
        .options(selectinload(LiveTaskGroup.tasks))
        .where(LiveTaskGroup.id == group_id)
    )
    group_with_tasks = result.scalar_one()
    return {
        "id": group_with_tasks.id,
        "class_id": group_with_tasks.class_id,
        "title": group_with_tasks.title,
        "status": group_with_tasks.status,
        "tasks": [
            {
                "id": t.id,
                "type": t.type,
                "question": t.question,
                "countdown_seconds": t.countdown_seconds,
                "order": t.order,
                "correct_answer": t.correct_answer,
            }
            for t in sorted(group_with_tasks.tasks, key=lambda x: x.order)
        ],
        "created_at": group_with_tasks.created_at,
        "updated_at": group_with_tasks.updated_at,
    }


@router.get("/live/task-groups")
async def get_task_groups(
    class_id: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取班级的任务组列表"""
    # 验证权限
    if current_user.role == UserRole.TEACHER:
        result = await db.execute(select(Class).where(Class.id == class_id))
        class_obj = result.scalar_one_or_none()
        if not class_obj or class_obj.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    else:
        # 学生只能看到 ready 状态的任务组
        result = await db.execute(
            select(ClassEnrollment).where(
                ClassEnrollment.class_id == class_id,
                ClassEnrollment.student_id == current_user.id
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Not enrolled")

    # 查询任务组
    query = select(LiveTaskGroup).where(LiveTaskGroup.class_id == class_id)
    if current_user.role == UserRole.STUDENT:
        query = query.where(LiveTaskGroup.status == "ready")

    result = await db.execute(query.order_by(LiveTaskGroup.updated_at.desc()))
    groups = result.scalars().all()

    # 获取每个任务组的题目数量
    group_ids = [g.id for g in groups]
    task_counts = {}
    if group_ids:
        count_query = select(
            LiveTask.group_id,
            func.count(LiveTask.id).label('count')
        ).where(LiveTask.group_id.in_(group_ids)).group_by(LiveTask.group_id)
        count_result = await db.execute(count_query)
        for row in count_result:
            task_counts[row[0]] = row[1]

    return [
        {
            "id": g.id,
            "class_id": g.class_id,
            "title": g.title,
            "status": g.status,
            "task_count": task_counts.get(g.id, 0),
            "created_at": g.created_at.isoformat() if g.created_at else None,
            "updated_at": g.updated_at.isoformat() if g.updated_at else None,
        }
        for g in groups
    ]


@router.post("/live/task-groups")
async def create_task_group(
    data: LiveTaskGroupCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建任务组（老师）"""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can create task groups")

    # 验证班级
    result = await db.execute(select(Class).where(Class.id == data.class_id))
    class_obj = result.scalar_one_or_none()
    if not class_obj or class_obj.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this class")

    await assert_teacher_feature_access(db, current_user.id, FEATURE_TASK_GROUPS)

    group = LiveTaskGroup(
        class_id=data.class_id,
        title=data.title,
        status="draft",
    )
    db.add(group)
    await db.commit()
    await db.refresh(group)

    # Log activity
    await log_activity(
        db=db,
        user_id=current_user.id,
        activity_type=ActivityType.CREATE_TASK_GROUP,
        description=f"创建课前准备：{data.title}",
        entity_type="task_group",
        entity_id=group.id,
        extra_data={"class_id": data.class_id, "status": "draft"}
    )

    return {
        "id": group.id,
        "class_id": group.class_id,
        "title": group.title,
        "status": group.status,
        "tasks": [],
        "created_at": group.created_at,
    }


@router.get("/live/task-groups/{group_id}")
async def get_task_group(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取任务组详情（含所有题目）"""
    result = await db.execute(
        select(LiveTaskGroup)
        .options(selectinload(LiveTaskGroup.tasks))
        .where(LiveTaskGroup.id == group_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Task group not found")

    # 验证权限
    if current_user.role == UserRole.TEACHER:
        result = await db.execute(select(Class).where(Class.id == group.class_id))
        class_obj = result.scalar_one_or_none()
        if not class_obj or class_obj.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")

    return {
        "id": group.id,
        "class_id": group.class_id,
        "title": group.title,
        "status": group.status,
        "tasks": [
            {
                "id": t.id,
                "type": t.type,
                "question": t.question,
                "countdown_seconds": t.countdown_seconds,
                "order": t.order,
                "correct_answer": t.correct_answer,
            }
            for t in sorted(group.tasks, key=lambda x: x.order)
        ],
        "created_at": group.created_at,
        "updated_at": group.updated_at,
    }


@router.put("/live/task-groups/{group_id}")
async def update_task_group(
    group_id: str,
    data: LiveTaskGroupUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新任务组"""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can update task groups")

    result = await db.execute(select(LiveTaskGroup).where(LiveTaskGroup.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Task group not found")

    # 验证班级
    result = await db.execute(select(Class).where(Class.id == group.class_id))
    class_obj = result.scalar_one_or_none()
    if not class_obj or class_obj.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    old_status = group.status
    if data.title is not None:
        group.title = data.title
    if data.status is not None:
        group.status = data.status

    await db.commit()

    # Log activity when task is published (status changed to ready)
    if data.status == "ready" and old_status != "ready":
        await log_activity(
            db=db,
            user_id=current_user.id,
            activity_type=ActivityType.PUBLISH_TASK,
            description=f"发布任务：{group.title}",
            entity_type="task_group",
            entity_id=group_id,
            extra_data={"old_status": old_status, "new_status": "ready"}
        )

    return {"id": group.id, "title": group.title, "status": group.status}


@router.delete("/live/task-groups/{group_id}")
async def delete_task_group(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除任务组"""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can delete task groups")

    result = await db.execute(select(LiveTaskGroup).where(LiveTaskGroup.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Task group not found")

    # 验证班级
    result = await db.execute(select(Class).where(Class.id == group.class_id))
    class_obj = result.scalar_one_or_none()
    if not class_obj or class_obj.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # 手动清理未在 ORM cascade 中覆盖的外键引用
    # 1. 清除 LiveSession 中引用此 group 的外键
    result = await db.execute(
        select(LiveSession).where(LiveSession.group_id == group_id)
    )
    for session in result.scalars().all():
        session.group_id = None
    # 2. 删除 TaskGroupShare 中引用此 group 的记录
    result = await db.execute(
        select(TaskGroupShare).where(TaskGroupShare.task_group_id == group_id)
    )
    for share in result.scalars().all():
        await db.delete(share)

    await db.delete(group)
    await db.commit()
    return {"success": True}


@router.post("/live/task-groups/{group_id}/tasks")
async def create_task(
    group_id: str,
    data: LiveTaskCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """添加题目到任务组"""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can create tasks")

    result = await db.execute(
        select(LiveTaskGroup)
        .options(selectinload(LiveTaskGroup.tasks))
        .where(LiveTaskGroup.id == group_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Task group not found")

    # 验证班级
    result = await db.execute(select(Class).where(Class.id == group.class_id))
    class_obj = result.scalar_one_or_none()
    if not class_obj or class_obj.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # 计算排序
    max_order = max([t.order for t in group.tasks], default=-1)

    task = LiveTask(
        group_id=group_id,
        type=data.type,
        question=data.question,
        countdown_seconds=data.countdown_seconds,
        correct_answer=data.correct_answer,
        order=max_order + 1,
        status="pending",
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)

    return {
        "id": task.id,
        "type": task.type,
        "question": task.question,
        "countdown_seconds": task.countdown_seconds,
        "order": task.order,
        "correct_answer": task.correct_answer,
    }


@router.put("/live/task-groups/{group_id}/tasks/{task_id}")
async def update_task(
    group_id: str,
    task_id: str,
    data: LiveTaskUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新题目"""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can update tasks")

    result = await db.execute(
        select(LiveTask).where(LiveTask.id == task_id, LiveTask.group_id == group_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # 验证班级
    result = await db.execute(select(LiveTaskGroup).where(LiveTaskGroup.id == group_id))
    group = result.scalar_one_or_none()
    result = await db.execute(select(Class).where(Class.id == group.class_id))
    class_obj = result.scalar_one_or_none()
    if not class_obj or class_obj.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if data.type is not None:
        task.type = data.type
    if data.question is not None:
        task.question = data.question
    if data.countdown_seconds is not None:
        task.countdown_seconds = data.countdown_seconds
    if "correct_answer" in data.__fields_set__:
        task.correct_answer = data.correct_answer
    if data.order is not None:
        task.order = data.order

    await db.commit()
    return {
        "id": task.id,
        "type": task.type,
        "question": task.question,
        "countdown_seconds": task.countdown_seconds,
        "order": task.order,
        "correct_answer": task.correct_answer,
    }


@router.delete("/live/task-groups/{group_id}/tasks/{task_id}")
async def delete_task(
    group_id: str,
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除题目"""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can delete tasks")

    result = await db.execute(
        select(LiveTask).where(LiveTask.id == task_id, LiveTask.group_id == group_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # 验证班级
    result = await db.execute(select(LiveTaskGroup).where(LiveTaskGroup.id == group_id))
    group = result.scalar_one_or_none()
    result = await db.execute(select(Class).where(Class.id == group.class_id))
    class_obj = result.scalar_one_or_none()
    if not class_obj or class_obj.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    await db.delete(task)
    await db.commit()
    return {"success": True}


@router.post("/live/task-groups/{group_id}/tasks/reorder")
async def reorder_tasks(
    group_id: str,
    data: ReorderTasksRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """重排序题目"""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can reorder tasks")

    # 验证权限
    result = await db.execute(select(LiveTaskGroup).where(LiveTaskGroup.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Task group not found")

    result = await db.execute(select(Class).where(Class.id == group.class_id))
    class_obj = result.scalar_one_or_none()
    if not class_obj or class_obj.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # 批量更新排序
    for i, task_id in enumerate(data.task_ids):
        await db.execute(
            update(LiveTask).where(LiveTask.id == task_id).values(order=i)
        )

    await db.commit()
    return {"success": True}


# AI Import endpoints
@router.post("/live/task-groups/ai-import")
async def ai_import_task_group(
    data: AiImportTaskGroupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a task group draft by importing pasted text or a Word-converted text body."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can create task groups")

    await _validate_teacher_class_access(data.class_id, current_user, db)
    await assert_teacher_feature_access(db, current_user.id, FEATURE_AI_TASK_GROUPS)
    if not (data.raw_text or "").strip():
        raise HTTPException(status_code=400, detail="No importable content found")

    task_mode = (data.task_mode or "objective").strip().lower()
    if task_mode == "reading":
        task_drafts = [_build_reading_import_task(data.raw_text, 0)]
    else:
        task_drafts = await _build_import_questions_with_ai(data.raw_text, data.randomize_answer_position)
    if data.target_group_id:
        result = await db.execute(select(LiveTaskGroup).where(LiveTaskGroup.id == data.target_group_id))
        target_group = result.scalar_one_or_none()
        if not target_group or target_group.class_id != data.class_id:
            raise HTTPException(status_code=404, detail="Target task group not found")
        existing_count_result = await db.execute(
            select(LiveTask)
            .where(LiveTask.group_id == data.target_group_id)
            .order_by(LiveTask.order.asc())
        )
        existing_count = len(existing_count_result.scalars().all())
        await _append_tasks_to_group(data.target_group_id, task_drafts, db)
        payload = await _serialize_group_with_tasks(data.target_group_id, db)
        payload["new_tasks"] = payload["tasks"][existing_count:]
        return payload

    group = await _create_group_with_tasks(data.class_id, data.title, task_drafts, db)
    payload = await _serialize_group_with_tasks(group.id, db)
    payload["new_tasks"] = payload["tasks"]
    return payload


@router.post("/live/task-groups/ai-import-docx")
async def ai_import_task_group_docx(
    class_id: str = Form(...),
    title: str = Form(...),
    target_group_id: Optional[str] = Form(None),
    task_mode: str = Form("objective"),
    randomize_answer_position: bool = Form(False),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a task group draft by importing a .docx file."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can create task groups")

    await _validate_teacher_class_access(class_id, current_user, db)
    await assert_teacher_feature_access(db, current_user.id, FEATURE_AI_TASK_GROUPS)

    filename = file.filename or ""
    if not filename.lower().endswith(".docx"):
        raise HTTPException(status_code=400, detail="Only .docx files are supported")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB")

    raw_text = _extract_docx_text(content)
    if not raw_text:
        raise HTTPException(status_code=400, detail="No importable content found in the .docx file")

    normalized_mode = (task_mode or "objective").strip().lower()
    if normalized_mode == "reading":
        task_drafts = [_build_reading_import_task(raw_text, 0)]
    else:
        task_drafts = await _build_import_questions_with_ai(raw_text, randomize_answer_position)

    if target_group_id:
        result = await db.execute(select(LiveTaskGroup).where(LiveTaskGroup.id == target_group_id))
        target_group = result.scalar_one_or_none()
        if not target_group or target_group.class_id != class_id:
            raise HTTPException(status_code=404, detail="Target task group not found")
        existing_count_result = await db.execute(
            select(LiveTask).where(LiveTask.group_id == target_group_id).order_by(LiveTask.order.asc())
        )
        existing_count = len(existing_count_result.scalars().all())
        await _append_tasks_to_group(target_group_id, task_drafts, db)
        payload = await _serialize_group_with_tasks(target_group_id, db)
        payload["new_tasks"] = payload["tasks"][existing_count:]
        return payload

    group = await _create_group_with_tasks(class_id, title, task_drafts, db)
    payload = await _serialize_group_with_tasks(group.id, db)
    payload["new_tasks"] = payload["tasks"]
    return payload


@router.post("/live/task-groups/ai-generate")
async def ai_generate_task_group(
    data: AiGenerateTaskGroupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a task group draft from a teacher prompt."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can create task groups")

    await _validate_teacher_class_access(data.class_id, current_user, db)
    await assert_teacher_feature_access(db, current_user.id, FEATURE_AI_TASK_GROUPS)
    task_drafts = await _build_generated_questions_with_ai(data)
    if data.target_group_id:
        result = await db.execute(select(LiveTaskGroup).where(LiveTaskGroup.id == data.target_group_id))
        target_group = result.scalar_one_or_none()
        if not target_group or target_group.class_id != data.class_id:
            raise HTTPException(status_code=404, detail="Target task group not found")
        existing_count_result = await db.execute(
            select(LiveTask)
            .where(LiveTask.group_id == data.target_group_id)
            .order_by(LiveTask.order.asc())
        )
        existing_count = len(existing_count_result.scalars().all())
        await _append_tasks_to_group(data.target_group_id, task_drafts, db)
        payload = await _serialize_group_with_tasks(data.target_group_id, db)
        payload["new_tasks"] = payload["tasks"][existing_count:]
        return payload

    group = await _create_group_with_tasks(data.class_id, data.title, task_drafts, db)
    payload = await _serialize_group_with_tasks(group.id, db)
    payload["new_tasks"] = payload["tasks"]
    return payload


# Task Group Sharing endpoints
@router.post("/live/task-groups/{group_id}/share")
async def share_task_group(
    group_id: str,
    data: ShareTaskGroupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """分享任务组，生成分享链接"""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can share task groups")

    # 验证任务组存在且属于该教师
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
        raise HTTPException(status_code=403, detail="Not authorized")

    # 生成分享token
    share_token = secrets.token_urlsafe(32)

    # 计算过期时间
    expires_at = None
    if data.expires_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=data.expires_days)

    # 创建分享记录
    share = TaskGroupShare(
        share_token=share_token,
        task_group_id=group_id,
        shared_by=current_user.id,
        share_name=data.share_name or task_group.title,
        share_description=data.share_description,
        expires_at=expires_at,
        is_active=True,
    )
    db.add(share)
    await db.commit()

    # Log activity
    await log_activity(
        db=db,
        user_id=current_user.id,
        activity_type=ActivityType.SHARE_TASK,
        description=f"分享任务：{task_group.title}",
        entity_type="task_group",
        entity_id=group_id,
        extra_data={"share_token": share_token, "share_name": share.share_name}
    )

    return {
        "share_token": share_token,
        "share_url": f"/share/task-group/{share_token}",
        "share_name": share.share_name,
        "expires_at": expires_at.isoformat() if expires_at else None,
    }


@router.get("/live/task-groups/share/{share_token}")
async def get_shared_task_group(
    share_token: str,
    db: AsyncSession = Depends(get_db),
):
    """获取分享的任务组内容（无需登录）"""
    result = await db.execute(
        select(TaskGroupShare, LiveTaskGroup, User.name.label("shared_by_name"))
        .join(LiveTaskGroup, TaskGroupShare.task_group_id == LiveTaskGroup.id)
        .join(User, TaskGroupShare.shared_by == User.id)
        .options(selectinload(LiveTaskGroup.tasks))
        .where(TaskGroupShare.share_token == share_token)
    )
    row = result.one_or_none()

    if not row:
        raise HTTPException(status_code=404, detail="Share link not found")

    share, task_group, shared_by_name = row

    # 检查分享是否有效
    if not share.is_active:
        raise HTTPException(status_code=410, detail="Share link has been deactivated")

    if share.expires_at and share.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Share link has expired")

    # 增加查看次数
    share.view_count += 1
    await db.commit()

    return {
        "share_token": share_token,
        "share_name": share.share_name,
        "share_description": share.share_description,
        "shared_by": shared_by_name,
        "shared_at": share.created_at.isoformat() if share.created_at else None,
        "expires_at": share.expires_at.isoformat() if share.expires_at else None,
        "task_group": {
            "id": task_group.id,
            "title": task_group.title,
            "task_count": len(task_group.tasks),
            "tasks": [
                {
                    "id": t.id,
                    "type": t.type,
                    "question": t.question,
                    "countdown_seconds": t.countdown_seconds,
                    "order": t.order,
                    "correct_answer": t.correct_answer,
                }
                for t in sorted(task_group.tasks, key=lambda x: x.order)
            ],
        },
    }


@router.post("/live/task-groups/import-shared")
async def import_shared_task_group(
    data: ImportSharedTaskGroupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """导入分享的任务组到自己的班级"""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can import task groups")

    # 验证目标班级权限
    result = await db.execute(select(Class).where(Class.id == data.class_id))
    class_obj = result.scalar_one_or_none()
    if not class_obj or class_obj.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this class")

    # 获取分享的任务组
    result = await db.execute(
        select(TaskGroupShare, LiveTaskGroup)
        .join(LiveTaskGroup, TaskGroupShare.task_group_id == LiveTaskGroup.id)
        .options(selectinload(LiveTaskGroup.tasks))
        .where(TaskGroupShare.share_token == data.share_token)
    )
    row = result.one_or_none()

    if not row:
        raise HTTPException(status_code=404, detail="Share link not found")

    share, source_group = row

    # 检查分享是否有效
    if not share.is_active:
        raise HTTPException(status_code=410, detail="Share link has been deactivated")

    if share.expires_at and share.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Share link has expired")

    # 创建新的任务组
    new_title = data.title or f"{share.share_name} (导入)"
    new_group = LiveTaskGroup(
        class_id=data.class_id,
        title=new_title,
        status="draft",
    )
    db.add(new_group)
    await db.flush()

    # 复制所有任务
    for task in sorted(source_group.tasks, key=lambda x: x.order):
        new_task = LiveTask(
            group_id=new_group.id,
            type=task.type,
            question=task.question,
            countdown_seconds=task.countdown_seconds,
            order=task.order,
            correct_answer=task.correct_answer,
            status="pending",
        )
        db.add(new_task)

    # 增加复制次数
    share.copy_count += 1
    await db.commit()
    await db.refresh(new_group)

    # 通知分享者有人导入了他们的任务组
    from app.services.notifications import create_notification
    from app.models import NotificationType

    await create_notification(
        db=db,
        user_id=share.shared_by,
        type=NotificationType.SHARE_IMPORTED,
        title=f"您的分享被导入：{share.share_name}",
        content=f"有老师导入了您分享的任务组「{share.share_name}」到自己的班级",
        data={"share_id": share.id, "share_name": share.share_name, "imported_by": current_user.id}
    )

    return {
        "success": True,
        "group_id": new_group.id,
        "title": new_group.title,
        "task_count": len(source_group.tasks),
    }


@router.get("/live/task-groups/{group_id}/shares")
async def get_task_group_shares(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取任务组的所有分享链接（创建者查看）"""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can view shares")

    # 验证任务组权限
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
        raise HTTPException(status_code=403, detail="Not authorized")

    # 获取所有分享记录
    result = await db.execute(
        select(TaskGroupShare)
        .where(TaskGroupShare.task_group_id == group_id)
        .order_by(TaskGroupShare.created_at.desc())
    )
    shares = result.scalars().all()

    return [
        {
            "id": s.id,
            "share_token": s.share_token,
            "share_name": s.share_name,
            "share_description": s.share_description,
            "is_active": s.is_active,
            "view_count": s.view_count,
            "copy_count": s.copy_count,
            "expires_at": s.expires_at.isoformat() if s.expires_at else None,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in shares
    ]


@router.delete("/live/task-groups/shares/{share_id}")
async def delete_task_group_share(
    share_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除/撤销分享链接"""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can delete shares")

    result = await db.execute(
        select(TaskGroupShare, LiveTaskGroup, Class)
        .join(LiveTaskGroup, TaskGroupShare.task_group_id == LiveTaskGroup.id)
        .join(Class, LiveTaskGroup.class_id == Class.id)
        .where(TaskGroupShare.id == share_id)
    )
    row = result.one_or_none()

    if not row:
        raise HTTPException(status_code=404, detail="Share not found")

    share, task_group, class_obj = row

    if class_obj.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    await db.delete(share)
    await db.commit()

    return {"success": True}
