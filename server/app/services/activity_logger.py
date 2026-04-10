"""Helper to create activity log entries."""
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ActivityLog, ActivityType


async def log_activity(
    db: AsyncSession,
    user_id: str,
    activity_type: ActivityType,
    description: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
    extra_data: dict | None = None,
) -> None:
    entry = ActivityLog(
        id=str(uuid4()),
        user_id=user_id,
        type=activity_type.value if hasattr(activity_type, 'value') else str(activity_type),
        description=description,
        entity_type=entity_type,
        entity_id=entity_id,
        extra_data=extra_data,
        created_at=datetime.now(timezone.utc),
    )
    db.add(entry)
    await db.commit()
