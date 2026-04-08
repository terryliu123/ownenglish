from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import (
    BigscreenActivityPack,
    BigscreenContentAsset,
    Class,
    ClassEnrollment,
    LiveTaskGroup,
    MembershipPlan,
    StudyPack,
    TeacherMembership,
    TeacherProfile,
)

settings = get_settings()

FREE_PLAN_CODE = "free"
PAID_MONTHLY_PLAN_CODE = "paid_monthly"
PAID_YEARLY_PLAN_CODE = "paid_yearly"

FEATURE_CREATE_CLASS = "create_class"
FEATURE_CLASS_STUDENTS = "class_students"
FEATURE_TASK_GROUPS = "task_groups"
FEATURE_STUDY_PACKS = "study_packs"
FEATURE_AI_TASK_GROUPS = "ai_task_groups"
FEATURE_AI_STUDY_PACKS = "ai_study_packs"
FEATURE_BIGSCREEN_CONTENT_ASSETS = "bigscreen_content_assets"
FEATURE_BIGSCREEN_ACTIVITY_PACKS = "bigscreen_activity_packs"
FEATURE_STUDENT_AI = "student_ai"

FREE_BIGSCREEN_CONTENT_ASSET_LIMIT = 5
FREE_BIGSCREEN_ACTIVITY_PACK_LIMIT = 2


@dataclass
class EffectiveMembership:
    membership: TeacherMembership
    plan: MembershipPlan
    is_trial: bool
    is_paid: bool
    expires_at: Optional[datetime]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _default_plan_definitions() -> list[dict[str, Any]]:
    return [
        {
            "code": FREE_PLAN_CODE,
            "name": "免费会员",
            "description": "基础教学功能与有限配额",
            "price_cents": 0,
            "duration_days": None,
            "max_classes": 2,
            "max_students_per_class": 20,
            "max_task_groups": 5,
            "max_study_packs": 5,
            "can_use_ai": False,
            "sort_order": 1,
        },
        {
            "code": PAID_MONTHLY_PLAN_CODE,
            "name": "付费会员（月付）",
            "description": "月度付费会员，包含 AI 与更高配额",
            "price_cents": settings.MEMBERSHIP_MONTHLY_PRICE_CENTS,
            "duration_days": 30,
            "max_classes": 10,
            "max_students_per_class": 60,
            "max_task_groups": None,
            "max_study_packs": None,
            "can_use_ai": True,
            "sort_order": 2,
        },
        {
            "code": PAID_YEARLY_PLAN_CODE,
            "name": "付费会员（年付）",
            "description": "年度付费会员，包含 AI 与更高配额",
            "price_cents": settings.MEMBERSHIP_YEARLY_PRICE_CENTS,
            "duration_days": 365,
            "max_classes": 10,
            "max_students_per_class": 60,
            "max_task_groups": None,
            "max_study_packs": None,
            "can_use_ai": True,
            "sort_order": 3,
        },
    ]


async def ensure_membership_plans(db: AsyncSession) -> None:
    existing = (
        await db.execute(select(MembershipPlan))
    ).scalars().all()
    existing_map = {plan.code: plan for plan in existing}
    changed = False

    for definition in _default_plan_definitions():
        plan = existing_map.get(definition["code"])
        if not plan:
            db.add(MembershipPlan(**definition, is_active=True))
            changed = True

    if changed:
        await db.flush()


async def ensure_teacher_membership(
    db: AsyncSession,
    teacher_id: str,
    *,
    create_trial: bool = False,
) -> TeacherMembership:
    result = await db.execute(
        select(TeacherMembership).where(TeacherMembership.teacher_id == teacher_id)
    )
    membership = result.scalar_one_or_none()
    if membership:
        return membership

    now = _utcnow()
    membership = TeacherMembership(
        teacher_id=teacher_id,
        plan_code=PAID_MONTHLY_PLAN_CODE if create_trial else FREE_PLAN_CODE,
        status="trial" if create_trial else "free",
        started_at=now,
        trial_ends_at=now + timedelta(days=7) if create_trial else None,
        expires_at=now + timedelta(days=7) if create_trial else None,
        source="trial" if create_trial else "system",
    )
    db.add(membership)
    await db.flush()
    return membership


async def ensure_all_teacher_memberships(db: AsyncSession) -> None:
    teacher_ids = (
        await db.execute(select(TeacherProfile.user_id))
    ).scalars().all()
    for teacher_id in teacher_ids:
        await ensure_teacher_membership(db, teacher_id, create_trial=False)


async def _downgrade_to_free_if_expired(
    db: AsyncSession,
    membership: TeacherMembership,
) -> TeacherMembership:
    now = _utcnow()
    if membership.status == "trial" and membership.trial_ends_at and membership.trial_ends_at <= now:
        membership.plan_code = FREE_PLAN_CODE
        membership.status = "free"
        membership.expires_at = None
        membership.trial_ends_at = None
        membership.source = "system"
        await db.commit()
    elif membership.status == "active" and membership.expires_at and membership.expires_at <= now:
        membership.plan_code = FREE_PLAN_CODE
        membership.status = "free"
        membership.expires_at = None
        membership.trial_ends_at = None
        membership.source = "system"
        await db.commit()
    return membership


async def get_effective_membership(
    db: AsyncSession,
    teacher_id: str,
) -> EffectiveMembership:
    await ensure_membership_plans(db)
    membership = await ensure_teacher_membership(db, teacher_id)
    membership = await _downgrade_to_free_if_expired(db, membership)

    result = await db.execute(
        select(MembershipPlan).where(MembershipPlan.code == membership.plan_code)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        result = await db.execute(
            select(MembershipPlan).where(MembershipPlan.code == FREE_PLAN_CODE)
        )
        plan = result.scalar_one()
        membership.plan_code = plan.code
        membership.status = "free"
        await db.flush()

    return EffectiveMembership(
        membership=membership,
        plan=plan,
        is_trial=membership.status == "trial",
        is_paid=membership.status in {"trial", "active"} and membership.plan_code != FREE_PLAN_CODE,
        expires_at=membership.trial_ends_at if membership.status == "trial" else membership.expires_at,
    )


async def get_membership_usage(db: AsyncSession, teacher_id: str) -> dict[str, int]:
    class_count = (
        await db.execute(
            select(func.count(Class.id)).where(
                Class.teacher_id == teacher_id,
                Class.status != "deleted",
            )
        )
    ).scalar_one()

    task_group_count = (
        await db.execute(
            select(func.count(LiveTaskGroup.id))
            .join(Class, Class.id == LiveTaskGroup.class_id)
            .where(Class.teacher_id == teacher_id)
        )
    ).scalar_one()

    study_pack_count = (
        await db.execute(
            select(func.count(StudyPack.id)).where(StudyPack.created_by == teacher_id)
        )
    ).scalar_one()

    bigscreen_content_asset_count = (
        await db.execute(
            select(func.count(BigscreenContentAsset.id)).where(
                BigscreenContentAsset.teacher_id == teacher_id,
                BigscreenContentAsset.status != "archived",
            )
        )
    ).scalar_one()

    bigscreen_activity_pack_count = (
        await db.execute(
            select(func.count(BigscreenActivityPack.id)).where(
                BigscreenActivityPack.teacher_id == teacher_id,
                BigscreenActivityPack.status != "archived",
            )
        )
    ).scalar_one()

    return {
        FEATURE_CREATE_CLASS: int(class_count or 0),
        FEATURE_TASK_GROUPS: int(task_group_count or 0),
        FEATURE_STUDY_PACKS: int(study_pack_count or 0),
        FEATURE_BIGSCREEN_CONTENT_ASSETS: int(bigscreen_content_asset_count or 0),
        FEATURE_BIGSCREEN_ACTIVITY_PACKS: int(bigscreen_activity_pack_count or 0),
    }


async def get_class_student_usage(db: AsyncSession, class_id: str) -> int:
    active_count = (
        await db.execute(
            select(func.count(ClassEnrollment.id)).where(
                ClassEnrollment.class_id == class_id,
                ClassEnrollment.status == "active",
            )
        )
    ).scalar_one()
    return int(active_count or 0)


def build_membership_error(
    *,
    message: str,
    feature_code: str,
    current_plan: str,
    plan_required: str,
    limit: Optional[int],
    used: Optional[int],
) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={
            "message": message,
            "feature_code": feature_code,
            "current_plan": current_plan,
            "plan_required": plan_required,
            "limit": limit,
            "used": used,
        },
    )


async def assert_teacher_feature_access(
    db: AsyncSession,
    teacher_id: str,
    feature_code: str,
    *,
    class_id: Optional[str] = None,
) -> EffectiveMembership:
    effective = await get_effective_membership(db, teacher_id)
    plan = effective.plan
    usage = await get_membership_usage(db, teacher_id)

    if feature_code in {FEATURE_AI_TASK_GROUPS, FEATURE_AI_STUDY_PACKS, FEATURE_STUDENT_AI}:
        if not plan.can_use_ai:
            raise build_membership_error(
                message="当前会员不支持 AI 功能，请升级后继续使用。",
                feature_code=feature_code,
                current_plan=plan.code,
                plan_required=PAID_MONTHLY_PLAN_CODE,
                limit=None,
                used=None,
            )
        return effective

    if feature_code == FEATURE_CREATE_CLASS:
        limit = plan.max_classes
        used = usage[FEATURE_CREATE_CLASS]
    elif feature_code == FEATURE_TASK_GROUPS:
        limit = plan.max_task_groups
        used = usage[FEATURE_TASK_GROUPS]
    elif feature_code == FEATURE_STUDY_PACKS:
        limit = plan.max_study_packs
        used = usage[FEATURE_STUDY_PACKS]
    elif feature_code == FEATURE_BIGSCREEN_CONTENT_ASSETS:
        limit = None if effective.is_paid else FREE_BIGSCREEN_CONTENT_ASSET_LIMIT
        used = usage[FEATURE_BIGSCREEN_CONTENT_ASSETS]
    elif feature_code == FEATURE_BIGSCREEN_ACTIVITY_PACKS:
        limit = None if effective.is_paid else FREE_BIGSCREEN_ACTIVITY_PACK_LIMIT
        used = usage[FEATURE_BIGSCREEN_ACTIVITY_PACKS]
    elif feature_code == FEATURE_CLASS_STUDENTS:
        if not class_id:
            raise ValueError("class_id is required for class student quota checks")
        limit = plan.max_students_per_class
        used = await get_class_student_usage(db, class_id)
    else:
        raise ValueError(f"Unsupported membership feature code: {feature_code}")

    if limit is not None and used >= limit:
        raise build_membership_error(
            message="当前会员配额已达上限，请升级会员后继续新增。",
            feature_code=feature_code,
            current_plan=plan.code,
            plan_required=PAID_MONTHLY_PLAN_CODE,
            limit=limit,
            used=used,
        )

    return effective


async def serialize_teacher_membership_snapshot(
    db: AsyncSession,
    teacher_id: str,
) -> dict[str, Any]:
    effective = await get_effective_membership(db, teacher_id)
    plan = effective.plan
    usage = await get_membership_usage(db, teacher_id)

    return {
        "plan_code": plan.code,
        "plan_name": plan.name,
        "status": effective.membership.status,
        "is_trial": effective.is_trial,
        "is_paid": effective.is_paid,
        "started_at": effective.membership.started_at,
        "expires_at": effective.expires_at,
        "trial_ends_at": effective.membership.trial_ends_at,
        "source": effective.membership.source,
        "can_use_ai": plan.can_use_ai,
        "limits": {
            "max_classes": plan.max_classes,
            "max_students_per_class": plan.max_students_per_class,
            "max_task_groups": plan.max_task_groups,
            "max_study_packs": plan.max_study_packs,
            "max_bigscreen_content_assets": None if effective.is_paid else FREE_BIGSCREEN_CONTENT_ASSET_LIMIT,
            "max_bigscreen_activity_packs": None if effective.is_paid else FREE_BIGSCREEN_ACTIVITY_PACK_LIMIT,
        },
        "usage": {
            "class_count": usage[FEATURE_CREATE_CLASS],
            "task_group_count": usage[FEATURE_TASK_GROUPS],
            "study_pack_count": usage[FEATURE_STUDY_PACKS],
            "bigscreen_content_asset_count": usage[FEATURE_BIGSCREEN_CONTENT_ASSETS],
            "bigscreen_activity_pack_count": usage[FEATURE_BIGSCREEN_ACTIVITY_PACKS],
        },
    }


def extend_membership(
    membership: TeacherMembership,
    plan_code: str,
    duration_days: int,
) -> TeacherMembership:
    now = _utcnow()
    current_expiry = membership.expires_at if membership.expires_at and membership.expires_at > now else now
    membership.plan_code = plan_code
    membership.status = "active"
    membership.started_at = now
    membership.expires_at = current_expiry + timedelta(days=duration_days)
    membership.trial_ends_at = None
    membership.source = "wechat_pay"
    return membership
