"""Notification API endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.v1.auth import get_current_user
from app.models import User, Notification, NotificationType
from app.services.notifications import create_notification, create_bulk_notifications

router = APIRouter(prefix="/notifications", tags=["notifications"])


# Schemas
class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    content: Optional[str]
    data: Optional[dict]
    is_read: bool
    created_at: str

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    items: List[NotificationResponse]
    unread_count: int
    total: int


class MarkReadRequest(BaseModel):
    notification_ids: Optional[List[str]] = None  # If None, mark all as read


class MarkReadResponse(BaseModel):
    marked_count: int


class NotificationStatsResponse(BaseModel):
    total: int
    unread: int


# API Endpoints
@router.get("", response_model=NotificationListResponse)
async def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's notifications."""
    # Build query
    query = select(Notification).where(Notification.user_id == current_user.id)

    if unread_only:
        query = query.where(Notification.is_read == False)

    # Get total count
    count_query = select(func.count()).where(Notification.user_id == current_user.id)
    unread_query = select(func.count()).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    )

    total_result = await db.execute(count_query)
    unread_result = await db.execute(unread_query)
    total = total_result.scalar()
    unread_count = unread_result.scalar()

    # Get notifications with pagination
    query = query.order_by(desc(Notification.created_at)).offset(offset).limit(limit)
    result = await db.execute(query)
    notifications = result.scalars().all()

    return NotificationListResponse(
        items=[
            NotificationResponse(
                id=n.id,
                type=n.type.value,
                title=n.title,
                content=n.content,
                data=n.data,
                is_read=n.is_read,
                created_at=n.created_at.isoformat()
            )
            for n in notifications
        ],
        unread_count=unread_count,
        total=total
    )


@router.get("/stats", response_model=NotificationStatsResponse)
async def get_notification_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get notification statistics (total and unread count)."""
    total_query = select(func.count()).where(Notification.user_id == current_user.id)
    unread_query = select(func.count()).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    )

    total_result = await db.execute(total_query)
    unread_result = await db.execute(unread_query)

    return NotificationStatsResponse(
        total=total_result.scalar(),
        unread=unread_result.scalar()
    )


@router.post("/mark-read", response_model=MarkReadResponse)
async def mark_notifications_as_read(
    request: MarkReadRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark notifications as read. If no IDs provided, mark all as read."""
    from datetime import datetime, timezone

    if request.notification_ids:
        # Mark specific notifications as read
        query = select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.id.in_(request.notification_ids),
            Notification.is_read == False
        )
        result = await db.execute(query)
        notifications = result.scalars().all()

        for notification in notifications:
            notification.is_read = True
            notification.read_at = datetime.now(timezone.utc)

        await db.commit()
        return MarkReadResponse(marked_count=len(notifications))
    else:
        # Mark all as read
        query = select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
        result = await db.execute(query)
        notifications = result.scalars().all()

        now = datetime.now(timezone.utc)
        for notification in notifications:
            notification.is_read = True
            notification.read_at = now

        await db.commit()
        return MarkReadResponse(marked_count=len(notifications))


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a notification."""
    query = select(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    )
    result = await db.execute(query)
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    await db.delete(notification)
    await db.commit()

    return {"message": "Notification deleted"}


@router.delete("")
async def delete_all_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete all user's notifications."""
    query = select(Notification).where(Notification.user_id == current_user.id)
    result = await db.execute(query)
    notifications = result.scalars().all()

    for notification in notifications:
        await db.delete(notification)

    await db.commit()

    return {"message": f"Deleted {len(notifications)} notifications"}
