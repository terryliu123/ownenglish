"""Admin API endpoints for system management."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone, timedelta
from typing import Any, Optional, List
from pydantic import BaseModel

from app.db.session import get_db
from app.models import User, UserRole, Class, LiveTaskGroup, LiveSession, LiveSessionEvent, Notification, NotificationType, ActivityLog, ActivityType, MembershipPlan, TeacherMembership, InvitationCode, PaymentOrder
from app.api.v1.auth import get_current_user
from app.services.notifications import create_notification, create_bulk_notifications
from app.services.membership import ensure_membership_plans
from app.services.system_settings import WECHAT_PAY_SETTING_KEYS, get_settings_by_category, upsert_system_setting

router = APIRouter(prefix="/admin", tags=["Admin"])


async def get_current_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Require admin role."""
    if str(current_user.role) != str(UserRole.ADMIN) and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# Schemas
class AdminStatsResponse(BaseModel):
    total_users: int
    total_teachers: int
    total_students: int
    total_classes: int
    total_task_groups: int
    total_live_sessions: int
    active_users_7d: int
    # 今日
    today_teachers: int = 0
    today_students: int = 0
    today_sessions: int = 0
    today_task_groups: int = 0
    # 本周
    week_teachers: int = 0
    week_students: int = 0
    week_sessions: int = 0
    week_task_groups: int = 0

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    id: str
    email: Optional[str]
    username: Optional[str]
    name: str
    role: str
    is_active: bool
    is_guest: bool
    created_at: datetime
    membership_status: Optional[str] = None
    membership_plan: Optional[str] = None
    membership_started_at: Optional[datetime] = None
    membership_expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserListWithCount(BaseModel):
    items: List[UserListResponse]
    total: int
    page: int
    page_size: int


class SystemMessageCreate(BaseModel):
    title: str
    content: str
    target_role: Optional[str] = None  # None = all users, "teacher" or "student"


class MembershipPlanAdminUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price_cents: Optional[int] = None
    duration_days: Optional[int] = None
    max_classes: Optional[int] = None
    max_students_per_class: Optional[int] = None
    max_task_groups: Optional[int] = None
    max_study_packs: Optional[int] = None
    can_use_ai: Optional[bool] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class WeChatPaySettingsUpdate(BaseModel):
    WECHAT_PAY_APP_ID: str = ""
    WECHAT_PAY_MCH_ID: str = ""
    WECHAT_PAY_MCH_SERIAL_NO: str = ""
    WECHAT_PAY_PRIVATE_KEY_PATH: str = ""
    WECHAT_PAY_PRIVATE_KEY: str = ""
    WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH: str = ""
    WECHAT_PAY_PLATFORM_PUBLIC_KEY: str = ""
    WECHAT_PAY_API_V3_KEY: str = ""
    WECHAT_PAY_NOTIFY_URL: str = ""
    WECHAT_PAY_RETURN_URL: str = ""
    WECHAT_PAY_H5_DOMAIN: str = ""


def _serialize_membership_plan(plan: MembershipPlan) -> dict[str, Any]:
    return {
        "code": plan.code,
        "name": plan.name,
        "description": plan.description,
        "price_cents": plan.price_cents,
        "duration_days": plan.duration_days,
        "max_classes": plan.max_classes,
        "max_students_per_class": plan.max_students_per_class,
        "max_task_groups": plan.max_task_groups,
        "max_study_packs": plan.max_study_packs,
        "can_use_ai": plan.can_use_ai,
        "is_active": plan.is_active,
        "sort_order": plan.sort_order,
        "created_at": plan.created_at.isoformat() if plan.created_at else None,
        "updated_at": plan.updated_at.isoformat() if plan.updated_at else None,
    }


WECHAT_PAY_SETTING_META: dict[str, dict[str, Any]] = {
    "WECHAT_PAY_APP_ID": {"description": "微信支付应用 AppID", "is_secret": False},
    "WECHAT_PAY_MCH_ID": {"description": "微信支付商户号", "is_secret": False},
    "WECHAT_PAY_MCH_SERIAL_NO": {"description": "商户证书序列号", "is_secret": False},
    "WECHAT_PAY_PRIVATE_KEY_PATH": {"description": "商户私钥文件路径", "is_secret": False},
    "WECHAT_PAY_PRIVATE_KEY": {"description": "商户私钥内容", "is_secret": True},
    "WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH": {"description": "微信平台公钥文件路径", "is_secret": False},
    "WECHAT_PAY_PLATFORM_PUBLIC_KEY": {"description": "微信平台公钥内容", "is_secret": True},
    "WECHAT_PAY_API_V3_KEY": {"description": "微信支付 API v3 Key", "is_secret": True},
    "WECHAT_PAY_NOTIFY_URL": {"description": "微信支付回调地址", "is_secret": False},
    "WECHAT_PAY_RETURN_URL": {"description": "支付完成返回地址", "is_secret": False},
    "WECHAT_PAY_H5_DOMAIN": {"description": "H5 支付域名", "is_secret": False},
}


# Stats
@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Get system statistics."""
    # Count users
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar()

    # Count teachers
    total_teachers = (await db.execute(
        select(func.count()).select_from(User).where(User.role == UserRole.TEACHER)
    )).scalar()

    # Count students
    total_students = (await db.execute(
        select(func.count()).select_from(User).where(User.role == UserRole.STUDENT)
    )).scalar()

    # Count classes
    total_classes = (await db.execute(select(func.count()).select_from(Class))).scalar()

    # Count task groups
    total_task_groups = (await db.execute(select(func.count()).select_from(LiveTaskGroup))).scalar()

    # Count live sessions
    total_live_sessions = (await db.execute(select(func.count()).select_from(LiveSession))).scalar()

    # Active users in last 7 days
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    active_users_7d = (await db.execute(
        select(func.count()).select_from(User).where(User.created_at >= week_ago)
    )).scalar()

    # 今日统计
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_teachers = (await db.execute(select(func.count()).select_from(User).where(User.role == UserRole.TEACHER, User.created_at >= today_start))).scalar() or 0
    today_students = (await db.execute(select(func.count()).select_from(User).where(User.role == UserRole.STUDENT, User.created_at >= today_start))).scalar() or 0
    today_sessions = (await db.execute(select(func.count()).select_from(LiveSession).where(LiveSession.created_at >= today_start))).scalar() or 0
    today_task_groups = (await db.execute(select(func.count()).select_from(LiveTaskGroup).where(LiveTaskGroup.created_at >= today_start))).scalar() or 0

    # 本周统计
    week_teachers = (await db.execute(select(func.count()).select_from(User).where(User.role == UserRole.TEACHER, User.created_at >= week_ago))).scalar() or 0
    week_students = (await db.execute(select(func.count()).select_from(User).where(User.role == UserRole.STUDENT, User.created_at >= week_ago))).scalar() or 0
    week_sessions = (await db.execute(select(func.count()).select_from(LiveSession).where(LiveSession.created_at >= week_ago))).scalar() or 0
    week_task_groups = (await db.execute(select(func.count()).select_from(LiveTaskGroup).where(LiveTaskGroup.created_at >= week_ago))).scalar() or 0

    return AdminStatsResponse(
        total_users=total_users or 0,
        total_teachers=total_teachers or 0,
        total_students=total_students or 0,
        total_classes=total_classes or 0,
        total_task_groups=total_task_groups or 0,
        total_live_sessions=total_live_sessions or 0,
        active_users_7d=active_users_7d or 0,
        today_teachers=today_teachers,
        today_students=today_students,
        today_sessions=today_sessions,
        today_task_groups=today_task_groups,
        week_teachers=week_teachers,
        week_students=week_students,
        week_sessions=week_sessions,
        week_task_groups=week_task_groups,
    )


@router.get("/membership-config")
async def get_membership_config(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    await ensure_membership_plans(db)
    plans = (
        await db.execute(select(MembershipPlan).order_by(MembershipPlan.sort_order.asc(), MembershipPlan.code.asc()))
    ).scalars().all()
    raw_settings = await get_settings_by_category(db, "wechat_pay")
    settings_map = {item.key: item.value or "" for item in raw_settings}
    settings_items = [
        {
            "key": key,
            "value": settings_map.get(key, ""),
            "is_secret": WECHAT_PAY_SETTING_META[key]["is_secret"],
            "description": WECHAT_PAY_SETTING_META[key]["description"],
        }
        for key in WECHAT_PAY_SETTING_KEYS
    ]
    return {
        "plans": [_serialize_membership_plan(plan) for plan in plans],
        "wechat_pay_settings": settings_items,
    }


@router.put("/membership-config/plans/{plan_code}")
async def update_membership_plan(
    plan_code: str,
    data: MembershipPlanAdminUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    await ensure_membership_plans(db)
    result = await db.execute(select(MembershipPlan).where(MembershipPlan.code == plan_code))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Membership plan not found")

    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(plan, key, value)
    await db.flush()
    await db.commit()
    return _serialize_membership_plan(plan)


@router.put("/membership-config/wechat-pay")
async def update_wechat_pay_settings(
    data: WeChatPaySettingsUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    payload = data.model_dump()
    for key in WECHAT_PAY_SETTING_KEYS:
        meta = WECHAT_PAY_SETTING_META[key]
        await upsert_system_setting(
            db,
            key=key,
            value=payload.get(key, ""),
            category="wechat_pay",
            is_secret=bool(meta["is_secret"]),
            description=str(meta["description"]),
        )
    settings_items = [
        {
            "key": key,
            "value": payload.get(key, ""),
            "is_secret": WECHAT_PAY_SETTING_META[key]["is_secret"],
            "description": WECHAT_PAY_SETTING_META[key]["description"],
        }
        for key in WECHAT_PAY_SETTING_KEYS
    ]
    return {"wechat_pay_settings": settings_items}


# User Management
@router.get("/users", response_model=UserListWithCount)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """List all users with pagination."""
    query = select(User)

    if role == "teacher":
        query = query.where(User.role == UserRole.TEACHER)
    elif role == "student":
        query = query.where(User.role == UserRole.STUDENT)
    elif role == "admin":
        query = query.where(User.role == UserRole.ADMIN)

    if search:
        search_filter = User.name.ilike(f"%{search}%")
        query = query.where(search_filter)

    # Get total count
    count_query = select(func.count()).select_from(User)
    if role == "teacher":
        count_query = count_query.where(User.role == UserRole.TEACHER)
    elif role == "student":
        count_query = count_query.where(User.role == UserRole.STUDENT)
    elif role == "admin":
        count_query = count_query.where(User.role == UserRole.ADMIN)
    if search:
        count_query = count_query.where(User.name.ilike(f"%{search}%"))

    total = (await db.execute(count_query)).scalar()

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.order_by(User.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(query)
    users = result.scalars().all()

    # Gather membership info for teachers
    teacher_ids = [u.id for u in users if u.role == UserRole.TEACHER]
    membership_map: dict[str, Any] = {}
    if teacher_ids:
        from app.models import TeacherProfile
        mem_result = await db.execute(
            select(TeacherMembership, MembershipPlan.code)
            .join(TeacherProfile, TeacherMembership.teacher_id == TeacherProfile.user_id)
            .join(MembershipPlan, TeacherMembership.plan_code == MembershipPlan.code)
            .where(TeacherMembership.teacher_id.in_(teacher_ids))
        )
        for mem, plan_code in mem_result.all():
            membership_map[mem.teacher_id] = {
                "status": mem.status,
                "plan": plan_code,
                "started_at": mem.started_at,
                "expires_at": mem.expires_at,
            }

    def _user_to_response(u: User) -> UserListResponse:
        data = UserListResponse.from_orm(u)
        m = membership_map.get(u.id)
        if m:
            data.membership_status = m["status"]
            data.membership_plan = m["plan"]
            data.membership_started_at = m["started_at"]
            data.membership_expires_at = m["expires_at"]
        return data

    return UserListWithCount(
        items=[_user_to_response(u) for u in users],
        total=total or 0,
        page=page,
        page_size=page_size,
    )


@router.post("/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Toggle user active status."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot modify your own account")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = not user.is_active
    await db.commit()

    return {"message": f"User {'activated' if user.is_active else 'deactivated'}", "is_active": user.is_active}


class SetUserMembershipRequest(BaseModel):
    plan_code: str
    expires_at: Optional[datetime] = None  # None = never expire


class ChangeUserPasswordRequest(BaseModel):
    new_password: str

class ChangeOwnPasswordRequest(BaseModel):
    old_password: str
    new_password: str


@router.post("/change-password")
async def change_own_password(
    data: ChangeOwnPasswordRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Admin change own password."""
    from app.core.security import verify_password, get_password_hash

    if not verify_password(data.old_password, admin.password_hash):
        raise HTTPException(status_code=400, detail="原密码错误")

    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="新密码至少 6 位")

    admin.password_hash = get_password_hash(data.new_password)
    await db.commit()

    return {"message": "密码修改成功"}


@router.put("/users/{user_id}/membership")
async def set_user_membership(
    user_id: str,
    data: SetUserMembershipRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    from app.models import TeacherProfile
    from app.services.membership import ensure_membership_plans

    # Verify user is a teacher
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != UserRole.TEACHER:
        raise HTTPException(status_code=400, detail="Only teachers can have membership")

    # Ensure teacher profile exists
    profile = (await db.execute(
        select(TeacherProfile).where(TeacherProfile.user_id == user_id)
    )).scalar_one_or_none()
    if not profile:
        profile = TeacherProfile(user_id=user_id)
        db.add(profile)
        await db.flush()

    await ensure_membership_plans(db)

    #Update or create membership
    result = await db.execute(
        select(TeacherMembership).where(TeacherMembership.teacher_id == user_id)
    )
    mem = result.scalar_one_or_none()
    now = datetime.now(timezone.utc)

    if mem:
        mem.plan_code = data.plan_code
        mem.status = "active" if data.expires_at and data.expires_at > now else "free"
        mem.expires_at=data.expires_at
        mem.started_at=now
        mem.source="admin"
    else:
        mem=TeacherMembership(
            teacher_id=user_id,
            plan_code=data.plan_code,
            status="active" if data.expires_at and data.expires_at>now else"free",
            started_at=now,
            expires_at=data.expires_at,
            source="admin",
        )
        db.add(mem)
    await db.flush()
    await db.commit()

    return {
        "teacher_id": user_id,
        "plan_code": mem.plan_code,
        "status": mem.status,
        "started_at": mem.started_at.isoformat() if mem.started_at else None,
        "expires_at": mem.expires_at.isoformat() if mem.expires_at else None,
    }


@router.patch("/users/{user_id}/password")
async def change_user_password(
    user_id: str,
    data: ChangeUserPasswordRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Change user password (admin force reset)."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own password here")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    from app.core.security import get_password_hash
    user.password_hash = get_password_hash(data.new_password)
    await db.commit()

    return {"message": "Password changed successfully"}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Delete a user."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.delete(user)
    await db.commit()

    return {"message": "User deleted"}


class BatchDeleteRequest(BaseModel):
    user_ids: List[str]


@router.post("/users/batch-delete")
async def batch_delete_users(
    data: BatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Batch delete users and all related records."""
    if admin.id in data.user_ids:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    if not data.user_ids:
        raise HTTPException(status_code=400, detail="No users specified")

    from sqlalchemy import text

    placeholders = ",".join([f":id_{i}" for i in range(len(data.user_ids))])
    param_dict = {f"id_{i}": uid for i, uid in enumerate(data.user_ids)}

    # Delete related records in correct order (respecting FK constraints)
    # Order matters: delete children before parents

    # 1. LiveTaskGroupSubmission -> student_id (no children)
    await db.execute(text(f"DELETE FROM live_task_group_submissions WHERE student_id IN ({placeholders})"), param_dict)

    # 2. LiveSubmission -> student_id (no children)
    await db.execute(text(f"DELETE FROM live_submissions WHERE student_id IN ({placeholders})"), param_dict)

    # 3. ClassEnrollment -> student_id (references student_profiles.user_id)
    await db.execute(text(f"DELETE FROM class_enrollments WHERE student_id IN ({placeholders})"), param_dict)

    # 4. StudentProfile (PK = user_id -> users.id, must be after ClassEnrollment)
    await db.execute(text(f"DELETE FROM student_profiles WHERE user_id IN ({placeholders})"), param_dict)

    # 5. TeacherMembership -> teacher_id (references teacher_profiles.user_id)
    await db.execute(text(f"DELETE FROM teacher_memberships WHERE teacher_id IN ({placeholders})"), param_dict)

    # 6. PaymentOrder -> teacher_id (references teacher_profiles.user_id)
    await db.execute(text(f"DELETE FROM payment_orders WHERE teacher_id IN ({placeholders})"), param_dict)

    # 7. TeacherProfile (PK = user_id -> users.id, must be after membership/payment)
    await db.execute(text(f"DELETE FROM teacher_profiles WHERE user_id IN ({placeholders})"), param_dict)

    # 8. Finally delete users
    result = await db.execute(text(f"DELETE FROM users WHERE id IN ({placeholders})"), param_dict)
    deleted_count = result.rowcount

    await db.commit()

    return {"message": f"{deleted_count} users deleted", "count": deleted_count}


# System Messages
@router.post("/messages", status_code=201)
async def create_system_message(
    message: SystemMessageCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Send a system message to users."""
    # Get target users
    query = select(User)
    if message.target_role:
        role_enum = UserRole.TEACHER if message.target_role == "teacher" else UserRole.STUDENT
        query = query.where(User.role == role_enum)

    result = await db.execute(query)
    users = result.scalars().all()

    if not users:
        return {"message": "No users to notify", "count": 0}

    user_ids = [u.id for u in users]
    count = await create_bulk_notifications(
        db=db,
        user_ids=user_ids,
        type=NotificationType.SYSTEM,
        title=message.title,
        content=message.content,
    )

    return {"message": f"Message sent to {count} users", "count": count}


@router.get("/messages")
async def list_system_messages(
    limit: int = Query(50, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """List recent system notifications (sent by admin)."""
    result = await db.execute(
        select(Notification)
        .where(Notification.type == NotificationType.SYSTEM)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    notifications = result.scalars().all()

    return {
        "items": [
            {
                "id": n.id,
                "title": n.title,
                "content": n.content,
                "created_at": n.created_at.isoformat(),
            }
            for n in notifications
        ],
        "total": len(notifications),
    }


# Activity Logs
@router.get("/activities")
async def list_activities(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    activity_type: Optional[str] = None,
    user_id: Optional[str] = None,
    username: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """List recent user activities (create task group, publish task, share task, etc.)."""
    query = select(ActivityLog).options(selectinload(ActivityLog.user))
    count_query = select(func.count()).select_from(ActivityLog)

    if activity_type:
        query = query.where(ActivityLog.type == activity_type)
        count_query = count_query.where(ActivityLog.type == activity_type)
    if user_id:
        query = query.where(ActivityLog.user_id == user_id)
        count_query = count_query.where(ActivityLog.user_id == user_id)
    if username:
        matched = (await db.execute(select(User.id).where(User.name.ilike(f"%{username}%")))).scalars().all()
        if matched:
            query = query.where(ActivityLog.user_id.in_(matched))
            count_query = count_query.where(ActivityLog.user_id.in_(matched))
        else:
            return {"items": [], "total": 0, "limit": limit, "offset": offset}
    if start_date:
        from datetime import datetime as dt, timezone as tz
        try:
            sd = dt.fromisoformat(start_date).replace(tzinfo=tz.utc)
            query = query.where(ActivityLog.created_at >= sd)
            count_query = count_query.where(ActivityLog.created_at >= sd)
        except ValueError:
            pass
    if end_date:
        from datetime import datetime as dt, timezone as tz
        try:
            ed = dt.fromisoformat(end_date).replace(tzinfo=tz.utc)
            query = query.where(ActivityLog.created_at <= ed)
            count_query = count_query.where(ActivityLog.created_at <= ed)
        except ValueError:
            pass

    total = (await db.execute(count_query)).scalar()
    query = query.order_by(ActivityLog.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    activities = result.scalars().all()

    return {
        "items": [
            {
                "id": a.id,
                "user_id": a.user_id,
                "user_name": a.user.name if a.user else "Unknown",
                "type": a.type.value if hasattr(a.type, 'value') else a.type,
                "description": a.description,
                "entity_type": a.entity_type,
                "entity_id": a.entity_id,
                "extra_data": a.extra_data,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in activities
        ],
        "total": total or 0,
        "limit": limit,
        "offset": offset,
    }


# ===== 订单管理 =====

class OrderListResponse(BaseModel):
    id: str
    order_no: str
    user_name: str
    user_email: Optional[str] = None
    user_registered_at: Optional[datetime] = None
    plan_code: str
    amount: int
    status: str
    paid_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class OrderListWithCount(BaseModel):
    items: List[OrderListResponse]
    total: int
    page: int
    page_size: int


@router.get("/orders", response_model=OrderListWithCount)
async def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """List all payment orders with pagination and filters."""
    from app.models import TeacherProfile

    query = (
        select(PaymentOrder, User.name, User.email, User.created_at.label("user_registered_at"))
        .join(TeacherProfile, PaymentOrder.teacher_id == TeacherProfile.user_id)
        .join(User, TeacherProfile.user_id == User.id)
    )

    count_query = (
        select(func.count())
        .select_from(PaymentOrder)
        .join(TeacherProfile, PaymentOrder.teacher_id == TeacherProfile.user_id)
        .join(User, TeacherProfile.user_id == User.id)
    )

    # 搜索用户名/邮箱
    if search:
        search_filter = (User.name.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%"))
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    # 状态筛选
    if status:
        query = query.where(PaymentOrder.status == status)
        count_query = count_query.where(PaymentOrder.status == status)

    # 时间范围（按购买时间 paid_at 或创建时间）
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
            query = query.where(PaymentOrder.created_at >= start_dt)
            count_query = count_query.where(PaymentOrder.created_at >= start_dt)
        except ValueError:
            pass

    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date).replace(tzinfo=timezone.utc) + timedelta(days=1)
            query = query.where(PaymentOrder.created_at < end_dt)
            count_query = count_query.where(PaymentOrder.created_at < end_dt)
        except ValueError:
            pass

    total = (await db.execute(count_query)).scalar()

    offset = (page - 1) * page_size
    query = query.order_by(PaymentOrder.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(query)
    rows = result.all()

    items = [
        OrderListResponse(
            id=order.id,
            order_no=order.order_no,
            user_name=user_name,
            user_email=user_email,
            user_registered_at=user_registered_at,
            plan_code=order.plan_code,
            amount=order.amount,
            status=order.status,
            paid_at=order.paid_at,
            created_at=order.created_at,
        )
        for order, user_name, user_email, user_registered_at in rows
    ]

    return OrderListWithCount(items=items, total=total or 0, page=page, page_size=page_size)


# ===== 邀请码管理 =====

import random
import string


@router.get("/invitation-codes")
async def list_invitation_codes(
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InvitationCode).order_by(InvitationCode.created_at.desc()).limit(limit).offset(offset)
    )
    codes = result.scalars().all()
    total_result = await db.execute(select(func.count(InvitationCode.id)))
    total = total_result.scalar() or 0
    return {
        "items": [
            {
                "id": c.id,
                "code": c.code,
                "is_active": c.is_active,
                "used_count": c.used_count,
                "notes": c.notes,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in codes
        ],
        "total": total,
    }


class CreateInvitationCodeRequest(BaseModel):
    notes: Optional[str] = None


@router.post("/invitation-codes")
async def create_invitation_code(
    request: CreateInvitationCodeRequest,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    code_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    inv = InvitationCode(code=code_str, notes=request.notes)
    db.add(inv)
    await db.commit()
    await db.refresh(inv)
    return {"id": inv.id, "code": inv.code, "is_active": inv.is_active, "used_count": inv.used_count, "notes": inv.notes}


@router.patch("/invitation-codes/{code_id}")
async def update_invitation_code(
    code_id: str,
    is_active: Optional[bool] = None,
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(InvitationCode).where(InvitationCode.id == code_id))
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="邀请码不存在")
    if is_active is not None:
        inv.is_active = is_active
    if notes is not None:
        inv.notes = notes
    await db.commit()
    return {"id": inv.id, "code": inv.code, "is_active": inv.is_active, "used_count": inv.used_count}


@router.delete("/invitation-codes/{code_id}")
async def delete_invitation_code(
    code_id: str,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(InvitationCode).where(InvitationCode.id == code_id))
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="邀请码不存在")
    await db.delete(inv)
    await db.commit()
    return {"ok": True}


@router.get("/invitation-codes/{code_id}/users")
async def get_invitation_code_users(
    code_id: str,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(InvitationCode).where(InvitationCode.id == code_id))
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="邀请码不存在")
    users_result = await db.execute(
        select(User).where(User.invitation_code_id == code_id).order_by(User.created_at.desc())
    )
    users = users_result.scalars().all()
    return {
        "code": inv.code,
        "users": [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "role": u.role.value if hasattr(u.role, 'value') else str(u.role),
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
        "total": len(users),
    }


# ===== 课堂回顾 =====

@router.get("/classroom-sessions")
async def admin_list_classroom_sessions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    teacher_name: Optional[str] = None,
    class_name: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Admin: list all classroom sessions across all teachers with pagination."""
    query = (
        select(LiveSession, Class.name.label("class_name"), User.name.label("teacher_name"))
        .join(Class, LiveSession.class_id == Class.id)
        .join(User, LiveSession.teacher_id == User.id)
        .where(LiveSession.status != "cancelled")
    )
    count_query = (
        select(func.count())
        .select_from(LiveSession)
        .join(Class, LiveSession.class_id == Class.id)
        .join(User, LiveSession.teacher_id == User.id)
        .where(LiveSession.status != "cancelled")
    )

    if teacher_name:
        name_filter = User.name.ilike(f"%{teacher_name}%")
        query = query.where(name_filter)
        count_query = count_query.where(name_filter)
    if class_name:
        cn_filter = Class.name.ilike(f"%{class_name}%")
        query = query.where(cn_filter)
        count_query = count_query.where(cn_filter)
    if status:
        query = query.where(LiveSession.status == status)
        count_query = count_query.where(LiveSession.status == status)
    if start_date:
        try:
            sd = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
            query = query.where(LiveSession.started_at >= sd)
            count_query = count_query.where(LiveSession.started_at >= sd)
        except ValueError:
            pass
    if end_date:
        try:
            ed = datetime.fromisoformat(end_date).replace(tzinfo=timezone.utc) + timedelta(days=1)
            query = query.where(LiveSession.started_at < ed)
            count_query = count_query.where(LiveSession.started_at < ed)
        except ValueError:
            pass

    total = (await db.execute(count_query)).scalar() or 0
    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(LiveSession.started_at.desc()).offset(offset).limit(page_size)
    )
    rows = result.all()

    # Batch fetch event counts
    session_ids = [row[0].id for row in rows]
    event_count_map: dict[str, int] = {}
    if session_ids:
        ec_result = await db.execute(
            select(LiveSessionEvent.live_session_id, func.count(LiveSessionEvent.id))
            .where(
                LiveSessionEvent.live_session_id.in_(session_ids),
                LiveSessionEvent.event_type.notin_(
                    ["student_joined", "student_left", "session_started", "session_ended"]
                ),
            )
            .group_by(LiveSessionEvent.live_session_id)
        )
        event_count_map = dict(ec_result.all())

    items = [
        {
            "id": s.id,
            "class_id": s.class_id,
            "class_name": class_name_val,
            "teacher_name": teacher_name_val,
            "title": s.title,
            "entry_mode": s.entry_mode or "whiteboard",
            "status": s.status,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "ended_at": s.ended_at.isoformat() if s.ended_at else None,
            "duration_seconds": s.duration_seconds,
            "event_count": event_count_map.get(s.id, 0),
        }
        for s, class_name_val, teacher_name_val in rows
    ]

    return {"items": items, "total": total, "page": page, "page_size": page_size}
