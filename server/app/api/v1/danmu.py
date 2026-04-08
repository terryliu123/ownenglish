"""Danmu (bullet comments) API endpoints."""
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from app.db.session import get_db
from app.api.v1.auth import get_current_user
from app.models import User, DanmuRecord, LiveSession

logger = logging.getLogger(__name__)
router = APIRouter()


class DanmuCreateRequest(BaseModel):
    content: str


class DanmuRecordResponse(BaseModel):
    id: str
    session_id: str
    class_id: str
    sender_id: str
    sender_name: str
    content: str
    is_preset: bool
    created_at: datetime


class DanmuListResponse(BaseModel):
    items: list[DanmuRecordResponse]
    total: int


@router.post("/live/sessions/{session_id}/danmu")
async def create_danmu(
    session_id: str,
    body: DanmuCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Store a danmu record for a session."""
    # Get session
    result = await db.execute(select(LiveSession).where(LiveSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    content = body.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    if len(content) > 200:
        raise HTTPException(status_code=400, detail="Content too long (max 200 chars)")

    danmu = DanmuRecord(
        session_id=session_id,
        class_id=session.class_id,
        sender_id=current_user.id,
        sender_name=current_user.name,
        content=content,
        is_preset=False,
    )
    db.add(danmu)
    await db.commit()
    await db.refresh(danmu)

    return {"id": danmu.id, "success": True}


@router.get("/live/sessions/{session_id}/danmu", response_model=DanmuListResponse)
async def list_danmu(
    session_id: str,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get danmu records for a session (for classroom review)."""
    # Get session
    result = await db.execute(select(LiveSession).where(LiveSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Count total
    count_result = await db.execute(
        select(func.count(DanmuRecord.id)).where(DanmuRecord.session_id == session_id)
    )
    total = count_result.scalar() or 0

    # Get records
    records_result = await db.execute(
        select(DanmuRecord)
        .where(DanmuRecord.session_id == session_id)
        .order_by(DanmuRecord.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    records = records_result.scalars().all()

    items = [
        DanmuRecordResponse(
            id=r.id,
            session_id=r.session_id,
            class_id=r.class_id,
            sender_id=r.sender_id,
            sender_name=r.sender_name,
            content=r.content,
            is_preset=r.is_preset,
            created_at=r.created_at,
        )
        for r in records
    ]

    return DanmuListResponse(items=items, total=total)
