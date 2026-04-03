"""Notification service module.

This module provides helper functions for creating notifications.
It is separate from the API endpoints to avoid circular imports.
"""
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Notification, NotificationType


async def create_notification(
    db: AsyncSession,
    user_id: str,
    type: NotificationType,
    title: str,
    content: Optional[str] = None,
    data: Optional[dict] = None
) -> Notification:
    """Create a new notification for a user."""
    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        content=content,
        data=data
    )
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    return notification


async def create_bulk_notifications(
    db: AsyncSession,
    user_ids: List[str],
    type: NotificationType,
    title: str,
    content: Optional[str] = None,
    data: Optional[dict] = None
) -> int:
    """Create the same notification for multiple users."""
    notifications = [
        Notification(
            user_id=user_id,
            type=type,
            title=title,
            content=content,
            data=data
        )
        for user_id in user_ids
    ]
    db.add_all(notifications)
    await db.commit()
    return len(notifications)
