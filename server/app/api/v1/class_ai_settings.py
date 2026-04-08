"""班级学生端 AI 助手设置接口。"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.db.session import get_db
from app.models import Class, LiveSession, LiveSessionEvent, User, UserRole
from app.services.membership import FEATURE_STUDENT_AI, assert_teacher_feature_access

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/classes", tags=["Class AI Settings"])


DEFAULT_AI_SETTINGS = {
    "enabled": False,
    "system_prompt": (
        "你是一位面向学生的课堂学习助手。"
        "你的职责是解释题目、梳理解题思路、提供提示，不直接代替学生完成作答。"
        "请用简洁、清楚、鼓励性的中文回答。"
    ),
    "max_output_length": 500,
    "show_reasoning": False,
    "photo_qa_enabled": True,
    "free_question_enabled": True,
}


class ClassAiSettingsResponse(BaseModel):
    enabled: bool
    system_prompt: str
    max_output_length: int
    show_reasoning: bool
    photo_qa_enabled: bool
    free_question_enabled: bool


class ClassAiSettingsUpdate(BaseModel):
    enabled: Optional[bool] = None
    system_prompt: Optional[str] = None
    max_output_length: Optional[int] = None
    show_reasoning: Optional[bool] = None
    photo_qa_enabled: Optional[bool] = None
    free_question_enabled: Optional[bool] = None


def _parse_settings(raw) -> dict:
    if not raw:
        return DEFAULT_AI_SETTINGS.copy()
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            return DEFAULT_AI_SETTINGS.copy()
        return {**DEFAULT_AI_SETTINGS, **parsed}
    return {**DEFAULT_AI_SETTINGS, **raw}


@router.get("/{class_id}/ai-settings", response_model=ClassAiSettingsResponse)
async def get_class_ai_settings(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取班级的学生端 AI 设置。"""
    result = await db.execute(select(Class).where(Class.id == class_id))
    class_obj = result.scalar_one_or_none()
    if not class_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="班级不存在")

    if current_user.role == UserRole.TEACHER:
        if class_obj.teacher_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权查看该班级 AI 设置")
    elif current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="仅教师和学生可查看 AI 设置")

    settings = _parse_settings(class_obj.ai_settings)
    return ClassAiSettingsResponse(**settings)


@router.put("/{class_id}/ai-settings", response_model=ClassAiSettingsResponse)
async def update_class_ai_settings(
    class_id: str,
    update: ClassAiSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新班级的学生端 AI 设置。"""
    result = await db.execute(select(Class).where(Class.id == class_id))
    class_obj = result.scalar_one_or_none()
    if not class_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="班级不存在")

    if class_obj.teacher_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="只有本班教师可以修改 AI 设置")

    await assert_teacher_feature_access(db, current_user.id, FEATURE_STUDENT_AI)

    current_settings = _parse_settings(class_obj.ai_settings)
    update_data = update.model_dump(exclude_unset=True)
    current_settings.update(update_data)

    json_str = json.dumps(current_settings, ensure_ascii=False)
    await db.execute(
        text("UPDATE classes SET ai_settings = :settings WHERE id = :id"),
        {"settings": json_str, "id": class_id},
    )

    active_session_result = await db.execute(
        select(LiveSession)
        .where(
            LiveSession.class_id == class_id,
            LiveSession.status == "active",
        )
        .order_by(LiveSession.started_at.desc())
    )
    active_session = active_session_result.scalar_one_or_none()
    if active_session:
        db.add(
            LiveSessionEvent(
                live_session_id=active_session.id,
                event_type="ai_settings_updated",
                payload_json={
                    "enabled": current_settings["enabled"],
                    "photo_qa_enabled": current_settings["photo_qa_enabled"],
                    "free_question_enabled": current_settings["free_question_enabled"],
                    "updated_by": current_user.id,
                },
            )
        )

    await db.commit()

    logger.info("[ClassAiSettings] Updated class AI settings for class %s by teacher %s", class_id, current_user.id)
    return ClassAiSettingsResponse(**current_settings)
