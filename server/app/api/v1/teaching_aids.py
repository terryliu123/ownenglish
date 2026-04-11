from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, Form, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from pathlib import Path
import shutil
import re
import uuid
import secrets
import zipfile
import io
from PIL import Image, ImageDraw, ImageFont

from app.api.v1.auth import get_current_user
from app.db.session import get_db
from app.models import ActivityType, TeachingAid, TeachingAidSession, TeacherProfile, User, UserRole
from app.services.activity_logger import log_activity
from app.services.activity_logger import log_activity
from app.services.teaching_aids import (
    get_teaching_aids_manifest_path,
    get_teaching_aids_root,
    get_valid_teaching_aid_session,
    guess_media_type,
    load_teaching_aids_manifest,
    resolve_teaching_aid_file_path,
    sync_teaching_aids_manifest,
    create_teaching_aid_session,
    DEFAULT_CATEGORY_LABELS,
)

router = APIRouter(prefix="/teaching-aids", tags=["TeachingAids"])
TEACHING_AID_CONSOLE_SLOT_COUNT = 4
TEACHING_AID_CONSOLE_SLOTS_KEY = "teaching_aid_console_slots"


def _require_teacher_or_admin(current_user: User) -> None:
    if current_user.role not in {UserRole.TEACHER, UserRole.ADMIN}:
        raise HTTPException(status_code=403, detail="Teacher or admin access required")


def _require_admin(current_user: User) -> None:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")


class TeachingAidUpdatePayload(BaseModel):
    name: Optional[str] = None
    category_code: Optional[str] = None
    category_label: Optional[str] = None
    summary: Optional[str] = None
    source_filename: Optional[str] = None
    tags: Optional[list[str]] = None


class TeachingAidStatusPayload(BaseModel):
    status: str


class TeachingAidBatchStatusPayload(BaseModel):
    ids: list[str]
    status: str


class CreateTeachingAidPayload(BaseModel):
    name: str
    slug: str
    category_code: str
    category_label: str
    summary: str | None = None
    tags: list[str] = []


class ValidateTeachingAidResponse(BaseModel):
    valid: bool
    entry_file_exists: bool
    errors: list[str]
    files: list[str]


class TeachingAidConsoleSlotItem(BaseModel):
    slot_index: int
    teaching_aid_id: str | None = None
    teaching_aid: dict[str, Any] | None = None


class TeachingAidConsoleSlotUpdatePayload(BaseModel):
    slot_aid_ids: list[str | None]


def _serialize_teaching_aid(aid: TeachingAid) -> dict[str, Any]:
    return {
        "id": aid.id,
        "name": aid.name,
        "slug": aid.slug,
        "category_code": aid.category_code,
        "category_label": aid.category_label,
        "summary": aid.summary,
        "cover_image_url": aid.cover_image_url,
        "diagram_image_url": aid.diagram_image_url,
        "entry_file": aid.entry_file,
        "storage_path": aid.storage_path,
        "source_filename": aid.source_filename,
        "status": aid.status,
        "tags": list(aid.tags or []),
        "source_type": aid.source_type,
        "teacher_id": aid.teacher_id,
        "share_code": aid.share_code,
        "created_at": aid.created_at.isoformat() if aid.created_at else None,
        "updated_at": aid.updated_at.isoformat() if aid.updated_at else None,
    }


async def _get_teacher_profile(db: AsyncSession, teacher_id: str) -> TeacherProfile:
    profile = (
        await db.execute(select(TeacherProfile).where(TeacherProfile.user_id == teacher_id))
    ).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    return profile


def _normalize_teaching_aid_console_slots(raw_slots: Any) -> list[str | None]:
    if not isinstance(raw_slots, list):
        raw_slots = []
    normalized: list[str | None] = []
    for index in range(TEACHING_AID_CONSOLE_SLOT_COUNT):
        value = raw_slots[index] if index < len(raw_slots) else None
        if value is None:
            normalized.append(None)
            continue
        if not isinstance(value, str):
            raise HTTPException(status_code=400, detail="Slot teaching aid ids must be strings or null")
        stripped = value.strip()
        normalized.append(stripped or None)
    return normalized


def _get_teacher_console_slots(profile: TeacherProfile) -> list[str | None]:
    settings = dict(profile.settings or {})
    raw_slots = settings.get(TEACHING_AID_CONSOLE_SLOTS_KEY)
    return _normalize_teaching_aid_console_slots(raw_slots)


def _set_teacher_console_slots(profile: TeacherProfile, slot_aid_ids: list[str | None]) -> None:
    settings = dict(profile.settings or {})
    settings[TEACHING_AID_CONSOLE_SLOTS_KEY] = slot_aid_ids
    profile.settings = settings


async def _serialize_console_slots(
    db: AsyncSession,
    slot_aid_ids: list[str | None],
) -> list[TeachingAidConsoleSlotItem]:
    aid_ids = [aid_id for aid_id in slot_aid_ids if aid_id]
    aids_by_id: dict[str, TeachingAid] = {}
    if aid_ids:
        aids = (
            await db.execute(select(TeachingAid).where(TeachingAid.id.in_(aid_ids)))
        ).scalars().all()
        aids_by_id = {aid.id: aid for aid in aids}

    items: list[TeachingAidConsoleSlotItem] = []
    for index, aid_id in enumerate(slot_aid_ids, start=1):
        aid = aids_by_id.get(aid_id) if aid_id else None
        items.append(
            TeachingAidConsoleSlotItem(
                slot_index=index,
                teaching_aid_id=aid_id,
                teaching_aid=_serialize_teaching_aid_teacher(aid) if aid else None,
            )
        )
    return items


async def _clean_teacher_console_slots(
    db: AsyncSession,
    teacher_id: str,
    slot_aid_ids: list[str | None],
) -> tuple[list[str | None], list[TeachingAidConsoleSlotItem]]:
    """Resolve console slots and drop stale/inactive teaching aids."""
    normalized_slot_ids = _normalize_teaching_aid_console_slots(slot_aid_ids)
    aid_ids = [aid_id for aid_id in normalized_slot_ids if aid_id]
    active_ids: set[str] = set()
    aids_by_id: dict[str, TeachingAid] = {}
    if aid_ids:
        aids = (
            await db.execute(
                select(TeachingAid).where(
                    TeachingAid.id.in_(aid_ids),
                    TeachingAid.status == "active",
                )
            )
        ).scalars().all()
        for aid in aids:
            active_ids.add(aid.id)
            aids_by_id[aid.id] = aid

    cleaned_slot_ids = [aid_id if aid_id and aid_id in active_ids else None for aid_id in normalized_slot_ids]
    items: list[TeachingAidConsoleSlotItem] = []
    for index, aid_id in enumerate(cleaned_slot_ids, start=1):
        aid = aids_by_id.get(aid_id) if aid_id else None
        items.append(
            TeachingAidConsoleSlotItem(
                slot_index=index,
                teaching_aid_id=aid_id,
                teaching_aid=_serialize_teaching_aid_teacher(aid) if aid else None,
            )
        )
    return cleaned_slot_ids, items


@router.get("")
async def list_teaching_aids(
    keyword: str | None = Query(default=None),
    category: str | None = Query(default=None),
    status: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(current_user)
    query = select(TeachingAid)
    if keyword:
        like_value = f"%{keyword.strip()}%"
        query = query.where(TeachingAid.name.ilike(like_value))
    if category:
        query = query.where(TeachingAid.category_code == category)
    if status:
        query = query.where(TeachingAid.status == status)
    query = query.order_by(TeachingAid.category_label.asc(), TeachingAid.name.asc())
    items = (await db.execute(query)).scalars().all()
    return {"items": [_serialize_teaching_aid(item) for item in items]}


@router.get("/categories")
async def get_teaching_aid_categories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_teacher_or_admin(current_user)
    try:
        manifest = load_teaching_aids_manifest()
        return {
            "items": [
                {"code": category.code, "label": category.label}
                for category in manifest.categories
            ]
        }
    except FileNotFoundError:
        aids = (await db.execute(select(TeachingAid))).scalars().all()
        seen: dict[str, str] = {}
        for aid in aids:
            seen[aid.category_code] = aid.category_label
        return {
            "items": [
                {"code": code, "label": label}
                for code, label in sorted(seen.items(), key=lambda item: item[1])
            ]
        }


@router.get("/library")
async def get_teacher_teaching_aid_library(
    keyword: str | None = Query(default=None),
    category: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_teacher_or_admin(current_user)
    query = select(TeachingAid).where(TeachingAid.status == "active")
    if keyword:
        like_value = f"%{keyword.strip()}%"
        query = query.where(TeachingAid.name.ilike(like_value))
    if category:
        query = query.where(TeachingAid.category_code == category)
    query = query.order_by(TeachingAid.category_label.asc(), TeachingAid.name.asc())
    items = (await db.execute(query)).scalars().all()
    return {"items": [_serialize_teaching_aid(item) for item in items]}


@router.get("/library/recent")
async def get_recent_teaching_aids(
    limit: int = Query(default=8, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_teacher_or_admin(current_user)
    query = (
        select(
            TeachingAid,
            func.max(
                func.coalesce(
                    TeachingAidSession.last_accessed_at,
                    TeachingAidSession.created_at,
                )
            ).label("last_used_at"),
        )
        .join(TeachingAidSession, TeachingAidSession.teaching_aid_id == TeachingAid.id)
        .where(TeachingAidSession.user_id == current_user.id)
        .where(TeachingAid.status == "active")
        .group_by(TeachingAid.id)
        .order_by(desc("last_used_at"))
        .limit(limit)
    )
    rows = (await db.execute(query)).all()
    return {
        "items": [
            {
                **_serialize_teaching_aid(aid),
                "last_used_at": last_used_at.isoformat() if last_used_at else None,
            }
            for aid, last_used_at in rows
        ]
    }


@router.get("/{aid_id}")
async def get_teaching_aid_detail(
    aid_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(current_user)
    aid = (
        await db.execute(select(TeachingAid).where(TeachingAid.id == aid_id))
    ).scalar_one_or_none()
    if not aid:
        raise HTTPException(status_code=404, detail="Teaching aid not found")
    return _serialize_teaching_aid(aid)


@router.put("/{aid_id}")
async def update_teaching_aid(
    aid_id: str,
    payload: TeachingAidUpdatePayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(current_user)
    aid = (
        await db.execute(select(TeachingAid).where(TeachingAid.id == aid_id))
    ).scalar_one_or_none()
    if not aid:
        raise HTTPException(status_code=404, detail="Teaching aid not found")

    if payload.name is not None:
        aid.name = payload.name.strip()
    if payload.category_code is not None:
        aid.category_code = payload.category_code.strip()
    if payload.category_label is not None:
        aid.category_label = payload.category_label.strip()
    if payload.summary is not None:
        aid.summary = payload.summary.strip() or None
    if payload.source_filename is not None:
        aid.source_filename = payload.source_filename.strip() or None
    if payload.tags is not None:
        aid.tags = [str(tag).strip() for tag in payload.tags if str(tag).strip()]
    aid.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return _serialize_teaching_aid(aid)


@router.put("/{aid_id}/status")
async def update_teaching_aid_status(
    aid_id: str,
    payload: TeachingAidStatusPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(current_user)
    if payload.status not in {"draft", "active", "archived"}:
        raise HTTPException(status_code=400, detail="Invalid status")
    aid = (
        await db.execute(select(TeachingAid).where(TeachingAid.id == aid_id))
    ).scalar_one_or_none()
    if not aid:
        raise HTTPException(status_code=404, detail="Teaching aid not found")
    aid.status = payload.status
    aid.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return _serialize_teaching_aid(aid)


@router.post("/status/batch")
async def update_teaching_aids_status_batch(
    payload: TeachingAidBatchStatusPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(current_user)
    if payload.status not in {"draft", "active", "archived"}:
        raise HTTPException(status_code=400, detail="Invalid status")
    ids = [item for item in payload.ids if item]
    if not ids:
        raise HTTPException(status_code=400, detail="No teaching aid ids provided")

    aids = (
        await db.execute(select(TeachingAid).where(TeachingAid.id.in_(ids)))
    ).scalars().all()

    now = datetime.now(timezone.utc)
    for aid in aids:
        aid.status = payload.status
        aid.updated_at = now
    await db.flush()

    return {
        "updated": len(aids),
        "status": payload.status,
        "items": [_serialize_teaching_aid(item) for item in aids],
    }


@router.post("/sync-manifest")
async def sync_manifest(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(current_user)
    if not get_teaching_aids_manifest_path().exists():
        raise HTTPException(status_code=404, detail="Teaching aid manifest not found")
    result = await sync_teaching_aids_manifest(db)
    result["manifest_path"] = str(get_teaching_aids_manifest_path())
    return result


@router.post("/{aid_id}/launch")
async def launch_teaching_aid(
    aid_id: str,
    class_id: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_teacher_or_admin(current_user)
    aid = (
        await db.execute(select(TeachingAid).where(TeachingAid.id == aid_id))
    ).scalar_one_or_none()
    if not aid:
        raise HTTPException(status_code=404, detail="Teaching aid not found")
    if current_user.role != UserRole.ADMIN and aid.status != "active":
        raise HTTPException(status_code=403, detail="Teaching aid is not active")

    session = await create_teaching_aid_session(
        db,
        teaching_aid_id=aid.id,
        user_id=current_user.id,
        class_id=class_id  # 传递 class_id 用于关联课堂会话
    )
    await db.commit()  # 确保 session 保存到数据库
    await db.refresh(session)
    await log_activity(db, current_user.id, ActivityType.TEACHING_AID_OPEN, f"打开教具「{aid.name}」", entity_type="teaching_aid", entity_id=aid.id)
    return {
        "session_id": session.session_token,
        "entry_url": f"/api/v1/teaching-aids/session/{session.session_token}/{aid.entry_file}",
        "expires_at": session.expires_at.isoformat(),
    }


@router.get("/session/{session_id}/{path:path}")
async def serve_teaching_aid_asset(
    session_id: str,
    path: str,
    db: AsyncSession = Depends(get_db),
):
    session = await get_valid_teaching_aid_session(db, session_id)
    aid = (
        await db.execute(select(TeachingAid).where(TeachingAid.id == session.teaching_aid_id))
    ).scalar_one_or_none()
    if not aid:
        raise HTTPException(status_code=404, detail="Teaching aid not found")

    file_path = resolve_teaching_aid_file_path(aid, path or aid.entry_file)
    return FileResponse(
        file_path,
        media_type=guess_media_type(file_path),
        headers={"Cache-Control": "private, no-store"},
    )


@router.get("/{aid_id}/cover")
async def get_teaching_aid_cover(
    aid_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get teaching aid cover image (public access for preview)."""
    aid = (
        await db.execute(select(TeachingAid).where(TeachingAid.id == aid_id))
    ).scalar_one_or_none()
    if not aid:
        raise HTTPException(status_code=404, detail="Teaching aid not found")

    if not aid.cover_image_url:
        raise HTTPException(status_code=404, detail="Cover image not available")

    root = get_teaching_aids_root() / "assets"
    aid_root = (root / aid.storage_path).resolve()
    cover_path = aid_root / aid.cover_image_url

    # Security check
    if not str(cover_path.resolve()).startswith(str(aid_root)):
        raise HTTPException(status_code=400, detail="Invalid path")

    if not cover_path.exists() or not cover_path.is_file():
        raise HTTPException(status_code=404, detail="Cover image not found")

    return FileResponse(
        cover_path,
        media_type=guess_media_type(cover_path),
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.post("")
async def create_teaching_aid(
    payload: CreateTeachingAidPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new teaching aid in draft status."""
    _require_admin(current_user)

    # Validate slug
    slug_pattern = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    if not slug_pattern.match(payload.slug):
        raise HTTPException(status_code=400, detail="Invalid slug format. Use lowercase letters, numbers, and hyphens only.")

    # Check for duplicate slug
    existing = (
        await db.execute(select(TeachingAid).where(TeachingAid.slug == payload.slug))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Teaching aid with this slug already exists")

    # Generate storage path
    storage_path = f"{payload.category_code}/{payload.slug}"

    aid = TeachingAid(
        id=str(uuid.uuid4()),
        name=payload.name.strip(),
        slug=payload.slug,
        category_code=payload.category_code,
        category_label=payload.category_label,
        summary=payload.summary.strip() if payload.summary else None,
        tags=[str(tag).strip() for tag in payload.tags if str(tag).strip()],
        status="draft",
        source_type="manual_upload",
        storage_path=storage_path,
        entry_file="index.html",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(aid)
    await db.flush()
    await log_activity(db, current_user.id, ActivityType.TEACHING_AID_CREATE, f"创建教具「{payload.name.strip()}」", entity_type="teaching_aid", entity_id=aid.id)
    return _serialize_teaching_aid(aid)


@router.post("/{aid_id}/upload")
async def upload_teaching_aid_files(
    aid_id: str,
    files: list[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload files for a teaching aid."""
    _require_admin(current_user)

    aid = (
        await db.execute(select(TeachingAid).where(TeachingAid.id == aid_id))
    ).scalar_one_or_none()
    if not aid:
        raise HTTPException(status_code=404, detail="Teaching aid not found")

    if aid.status != "draft":
        raise HTTPException(status_code=400, detail="Can only upload files to draft teaching aids")

    # Create storage directory
    root = get_teaching_aids_root() / "assets"
    aid_dir = root / aid.storage_path
    aid_dir.mkdir(parents=True, exist_ok=True)

    uploaded_files = []
    for file in files:
        # Validate filename
        filename = file.filename or "unnamed"
        if ".." in filename or "/" in filename or "\\" in filename:
            raise HTTPException(status_code=400, detail=f"Invalid filename: {filename}")

        file_path = aid_dir / filename
        with file_path.open("wb") as f:
            shutil.copyfileobj(file.file, f)
        uploaded_files.append(filename)

    aid.updated_at = datetime.now(timezone.utc)
    await db.flush()

    return {
        "uploaded": uploaded_files,
        "storage_path": str(aid_dir),
    }


@router.post("/{aid_id}/validate")
async def validate_teaching_aid(
    aid_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ValidateTeachingAidResponse:
    """Validate teaching aid files and check for entry point."""
    _require_admin(current_user)

    aid = (
        await db.execute(select(TeachingAid).where(TeachingAid.id == aid_id))
    ).scalar_one_or_none()
    if not aid:
        raise HTTPException(status_code=404, detail="Teaching aid not found")

    root = get_teaching_aids_root() / "assets"
    aid_dir = root / aid.storage_path

    errors = []
    files = []
    entry_file_exists = False

    if not aid_dir.exists():
        errors.append("Teaching aid directory does not exist")
    else:
        # List all files
        for file_path in aid_dir.rglob("*"):
            if file_path.is_file():
                relative_path = file_path.relative_to(aid_dir).as_posix()
                files.append(relative_path)

        # Check for entry file
        entry_path = aid_dir / aid.entry_file
        entry_file_exists = entry_path.exists() and entry_path.is_file()

        if not entry_file_exists:
            errors.append(f"Entry file '{aid.entry_file}' not found")

    return ValidateTeachingAidResponse(
        valid=entry_file_exists and len(files) > 0,
        entry_file_exists=entry_file_exists,
        errors=errors,
        files=files,
    )


@router.delete("/{aid_id}")
async def delete_teaching_aid(
    aid_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a draft teaching aid and its files."""
    _require_admin(current_user)

    aid = (
        await db.execute(select(TeachingAid).where(TeachingAid.id == aid_id))
    ).scalar_one_or_none()
    if not aid:
        raise HTTPException(status_code=404, detail="Teaching aid not found")

    if aid.status != "draft":
        raise HTTPException(status_code=400, detail="Can only delete draft teaching aids")

    # Delete files
    root = get_teaching_aids_root() / "assets"
    aid_dir = root / aid.storage_path
    if aid_dir.exists():
        shutil.rmtree(aid_dir, ignore_errors=True)

    await db.delete(aid)
    await db.flush()

    return {"deleted": True}


# =============================================================================
# Teacher-specific endpoints for managing own teaching aids
# =============================================================================

teacher_router = APIRouter(prefix="/teacher/teaching-aids", tags=["TeacherTeachingAids"])


def _serialize_teaching_aid_teacher(aid: TeachingAid) -> dict[str, Any]:
    """Serialize teaching aid with teacher-specific fields."""
    return {
        **_serialize_teaching_aid(aid),
        "teacher_id": aid.teacher_id,
        "share_code": aid.share_code,
        "is_public": aid.is_public,
    }


@teacher_router.get("/quick-slots")
async def get_teacher_teaching_aid_console_slots(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the teacher's persistent teaching aid console slots."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can access this endpoint")

    profile = await _get_teacher_profile(db, current_user.id)
    slot_aid_ids = _get_teacher_console_slots(profile)
    cleaned_slot_ids, items = await _clean_teacher_console_slots(db, current_user.id, slot_aid_ids)
    if cleaned_slot_ids != slot_aid_ids:
        _set_teacher_console_slots(profile, cleaned_slot_ids)
        await db.commit()
    return {"items": [item.model_dump() for item in items]}


@teacher_router.put("/quick-slots")
async def update_teacher_teaching_aid_console_slots(
    payload: TeachingAidConsoleSlotUpdatePayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the teacher's persistent teaching aid console slots."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can access this endpoint")

    if len(payload.slot_aid_ids) > TEACHING_AID_CONSOLE_SLOT_COUNT:
        raise HTTPException(status_code=400, detail="At most 4 shortcut slots are allowed")

    slot_aid_ids = _normalize_teaching_aid_console_slots(payload.slot_aid_ids)
    non_null_ids = [aid_id for aid_id in slot_aid_ids if aid_id]
    if len(set(non_null_ids)) != len(non_null_ids):
        raise HTTPException(status_code=400, detail="Shortcut teaching aids must be unique")

    if non_null_ids:
        aids = (
            await db.execute(
                select(TeachingAid).where(
                    TeachingAid.id.in_(non_null_ids),
                    TeachingAid.status == "active",
                )
            )
        ).scalars().all()
        aids_by_id = {aid.id: aid for aid in aids}
        missing_ids = [aid_id for aid_id in non_null_ids if aid_id not in aids_by_id]
        if missing_ids:
            raise HTTPException(status_code=404, detail=f"Teaching aid not found or inactive: {', '.join(missing_ids)}")

    profile = await _get_teacher_profile(db, current_user.id)
    _set_teacher_console_slots(profile, slot_aid_ids)
    await db.commit()
    return {"items": [item.model_dump() for item in await _serialize_console_slots(db, slot_aid_ids)]}


class TeacherUploadZipPayload(BaseModel):
    name: str
    category_code: str
    category_label: str
    summary: str | None = None


def _generate_share_code() -> str:
    """Generate a short share code (8 characters)."""
    return secrets.token_urlsafe(6)[:8]


def _get_chinese_font(size: int) -> ImageFont.FreeTypeFont:
    """Get a font that supports Chinese characters."""
    # First try fontconfig to find a Chinese font
    try:
        import subprocess
        result = subprocess.run(
            ["fc-list", ":lang=zh", "-f", "%{file}\n"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0 and result.stdout.strip():
            fonts = [f.strip() for f in result.stdout.strip().split('\n') if f.strip()]
            for font_path in fonts:
                try:
                    return ImageFont.truetype(font_path, size)
                except Exception:
                    continue
    except Exception:
        pass

    # Try common Chinese font paths
    font_paths = [
        # Linux
        "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
        "/usr/share/fonts/truetype/arphic/uming.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/wqy-zenhei/wqy-zenhei.ttc",
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
        # Windows
        "C:/Windows/Fonts/simhei.ttf",
        "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/simsun.ttc",
    ]

    for font_path in font_paths:
        try:
            return ImageFont.truetype(font_path, size)
        except Exception:
            continue

    # Fallback to default (will show squares for Chinese)
    return ImageFont.load_default()


def _generate_cover_image(aid_dir: Path, name: str, category_label: str) -> str:
    """Generate a cover image for the teaching aid. Returns the filename."""
    width, height = 800, 450

    # Get fonts
    try:
        font_large = _get_chinese_font(48)
        font_small = _get_chinese_font(24)
    except Exception:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # Create gradient background
    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)

    # Draw gradient background (blue to purple)
    for y in range(height):
        ratio = y / height
        r = int(66 + ratio * 40)
        g = int(133 + ratio * 40)
        b = int(240 - ratio * 40)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # Draw decorative elements - grid pattern
    for x in range(0, width, 40):
        draw.line([(x, 0), (x, height)], fill=(255, 255, 255, 20))
    for y in range(0, height, 40):
        draw.line([(0, y), (width, y)], fill=(255, 255, 255, 20))

    # Draw category label at top
    draw.text((40, 30), category_label, font=font_small, fill=(255, 255, 255, 180))

    # Draw main title centered
    display_name = name if len(name) <= 20 else name[:18] + '...'
    try:
        bbox = draw.textbbox((0, 0), display_name, font=font_large)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
    except Exception:
        text_width = len(display_name) * 30
        text_height = 40
    x = (width - text_width) // 2
    y = (height - text_height) // 2 - 20

    # Draw text shadow
    draw.text((x + 2, y + 2), display_name, font=font_large, fill=(0, 0, 0, 100))
    draw.text((x, y), display_name, font=font_large, fill=(255, 255, 255))

    # Draw bottom label
    draw.text((40, height - 60), "Teaching Aid", font=font_small, fill=(255, 255, 255, 150))

    # Save cover image
    cover_path = aid_dir / "cover.png"
    img.save(cover_path, "PNG")
    return "cover.png"


@teacher_router.get("", response_model=list[dict[str, Any]])
async def list_teacher_teaching_aids(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List teaching aids created by the current teacher."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can access this endpoint")

    query = select(TeachingAid).where(
        TeachingAid.teacher_id == current_user.id
    ).order_by(TeachingAid.created_at.desc())

    items = (await db.execute(query)).scalars().all()
    return [_serialize_teaching_aid_teacher(item) for item in items]


@teacher_router.post("/upload-zip")
async def teacher_upload_zip(
    file: UploadFile = File(...),
    name: str = Form(..., description="Teaching aid name"),
    category_code: str = Form(..., description="Category code"),
    category_label: str = Form(..., description="Category label"),
    summary: str | None = Form(None, description="Description"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a ZIP file to create a new teaching aid."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can upload teaching aids")

    # Validate file
    if not file.filename or not file.filename.lower().endswith('.zip'):
        raise HTTPException(status_code=400, detail="Only ZIP files are allowed")

    # Read ZIP content
    zip_content = await file.read()
    if len(zip_content) > 3 * 1024 * 1024:  # 3MB limit
        raise HTTPException(status_code=400, detail="ZIP file too large (max 3MB)")

    # Generate unique slug and share code
    slug = f"t_{current_user.id[:8]}_{secrets.token_urlsafe(8)}"
    share_code = _generate_share_code()
    storage_path = f"teacher/{current_user.id}/{slug}"

    # Create teaching aid record
    aid = TeachingAid(
        id=str(uuid.uuid4()),
        name=name.strip(),
        slug=slug,
        category_code=category_code,
        category_label=category_label,
        summary=summary.strip() if summary else None,
        status="active",  # Teacher-created aids are immediately active
        tags=[],
        source_type="manual_upload",
        storage_path=storage_path,
        entry_file="index.html",
        teacher_id=current_user.id,
        share_code=share_code,
        is_public=False,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(aid)
    await db.flush()

    # Extract ZIP to storage
    root = get_teaching_aids_root() / "assets"
    aid_dir = root / storage_path
    aid_dir.mkdir(parents=True, exist_ok=True)

    try:
        with zipfile.ZipFile(io.BytesIO(zip_content), 'r') as zf:
            # Check for index.html
            namelist = zf.namelist()
            has_index = any(n.lower() == 'index.html' for n in namelist)
            if not has_index:
                # Try to find any .html file
                html_files = [n for n in namelist if n.lower().endswith('.html')]
                if html_files:
                    aid.entry_file = html_files[0]
                else:
                    raise HTTPException(status_code=400, detail="ZIP must contain an index.html file")

            # Extract all files (with safety check)
            for zip_info in zf.infolist():
                # Prevent zip slip vulnerability
                filename = zip_info.filename
                if filename.startswith('/') or '..' in filename:
                    continue

                target_path = aid_dir / filename
                target_path.parent.mkdir(parents=True, exist_ok=True)

                if zip_info.is_dir():
                    target_path.mkdir(parents=True, exist_ok=True)
                else:
                    with zf.open(zip_info) as src, target_path.open('wb') as dst:
                        shutil.copyfileobj(src, dst)

        # Auto-detect or generate cover image
        cover_patterns = ['cover.png', 'cover.jpg', 'cover.jpeg', 'thumbnail.png', 'thumbnail.jpg', 'preview.png', 'preview.jpg']
        cover_found = None
        for pattern in cover_patterns:
            if (aid_dir / pattern).exists():
                cover_found = pattern
                break

        if cover_found:
            aid.cover_image_url = cover_found
        else:
            # Generate a cover image
            generated_cover = _generate_cover_image(aid_dir, name, category_label)
            aid.cover_image_url = generated_cover

    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid ZIP file")

    await db.commit()
    await db.refresh(aid)

    return {
        "id": aid.id,
        "name": aid.name,
        "slug": aid.slug,
        "category_code": aid.category_code,
        "category_label": aid.category_label,
        "status": aid.status,
        "share_code": aid.share_code,
        "entry_file": aid.entry_file,
    }


@teacher_router.post("/upload-html")
async def teacher_upload_html(
    file: UploadFile = File(...),
    name: str = Form(..., description="Teaching aid name"),
    category_code: str = Form(..., description="Category code"),
    category_label: str = Form(..., description="Category label"),
    summary: str | None = Form(None, description="Description"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a single HTML file to create a new teaching aid."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can upload teaching aids")

    # Validate file
    if not file.filename or not file.filename.lower().endswith('.html'):
        raise HTTPException(status_code=400, detail="Only HTML files are allowed")

    # Read HTML content
    html_content = await file.read()
    if len(html_content) > 3 * 1024 * 1024:  # 3MB limit
        raise HTTPException(status_code=400, detail="HTML file too large (max 3MB)")

    # Generate unique slug and share code
    slug = f"t_{current_user.id[:8]}_{secrets.token_urlsafe(8)}"
    share_code = _generate_share_code()
    storage_path = f"teacher/{current_user.id}/{slug}"

    # Create teaching aid record
    aid = TeachingAid(
        id=str(uuid.uuid4()),
        name=name.strip(),
        slug=slug,
        category_code=category_code,
        category_label=category_label,
        summary=summary.strip() if summary else None,
        status="active",  # Teacher-created aids are immediately active
        tags=[],
        source_type="manual_upload",
        storage_path=storage_path,
        entry_file="index.html",  # Always index.html when uploading single file
        teacher_id=current_user.id,
        share_code=share_code,
        is_public=False,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(aid)
    await db.flush()

    # Save HTML file to storage
    root = get_teaching_aids_root() / "assets"
    aid_dir = root / storage_path
    aid_dir.mkdir(parents=True, exist_ok=True)

    file_path = aid_dir / "index.html"
    with file_path.open("wb") as f:
        f.write(html_content)

    # Generate cover image
    generated_cover = _generate_cover_image(aid_dir, name, category_label)
    aid.cover_image_url = generated_cover

    await db.commit()
    await db.refresh(aid)

    return {
        "id": aid.id,
        "name": aid.name,
        "slug": aid.slug,
        "category_code": aid.category_code,
        "category_label": aid.category_label,
        "status": aid.status,
        "share_code": aid.share_code,
        "entry_file": aid.entry_file,
    }


@teacher_router.patch("/{aid_id}")
async def teacher_update_teaching_aid(
    aid_id: str,
    payload: TeachingAidUpdatePayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a teaching aid (owner only)."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can update teaching aids")

    aid = (
        await db.execute(select(TeachingAid).where(TeachingAid.id == aid_id))
    ).scalar_one_or_none()
    if not aid:
        raise HTTPException(status_code=404, detail="Teaching aid not found")

    # Check ownership
    if aid.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own teaching aids")

    if payload.name is not None:
        aid.name = payload.name.strip()
    if payload.category_code is not None:
        aid.category_code = payload.category_code.strip()
    if payload.category_label is not None:
        aid.category_label = payload.category_label.strip()
    if payload.summary is not None:
        aid.summary = payload.summary.strip() or None
    if payload.tags is not None:
        aid.tags = [str(tag).strip() for tag in payload.tags if str(tag).strip()]

    aid.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return _serialize_teaching_aid_teacher(aid)


@teacher_router.delete("/{aid_id}")
async def teacher_delete_teaching_aid(
    aid_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a teaching aid (owner only)."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can delete teaching aids")

    aid = (
        await db.execute(select(TeachingAid).where(TeachingAid.id == aid_id))
    ).scalar_one_or_none()
    if not aid:
        raise HTTPException(status_code=404, detail="Teaching aid not found")

    # Check ownership
    if aid.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own teaching aids")

    # Delete files
    root = get_teaching_aids_root() / "assets"
    aid_dir = root / aid.storage_path
    if aid_dir.exists():
        shutil.rmtree(aid_dir, ignore_errors=True)

    await db.delete(aid)
    await db.flush()

    return {"deleted": True}


@teacher_router.post("/{aid_id}/generate-share-link")
async def teacher_generate_share_link(
    aid_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate or regenerate share link for a teaching aid."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can share teaching aids")

    aid = (
        await db.execute(select(TeachingAid).where(TeachingAid.id == aid_id))
    ).scalar_one_or_none()
    if not aid:
        raise HTTPException(status_code=404, detail="Teaching aid not found")

    # Check ownership
    if aid.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only share your own teaching aids")

    # Generate new share code
    aid.share_code = _generate_share_code()
    aid.updated_at = datetime.now(timezone.utc)
    await db.flush()

    return {
        "share_code": aid.share_code,
        "share_url": f"/import/teaching-aid/{aid.share_code}",
    }


@teacher_router.get("/import/{share_code}")
async def import_teaching_aid_by_share_code(
    share_code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Import a teaching aid from a share code."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can import teaching aids")

    # Find the shared teaching aid
    source_aid = (
        await db.execute(select(TeachingAid).where(TeachingAid.share_code == share_code))
    ).scalar_one_or_none()
    if not source_aid:
        raise HTTPException(status_code=404, detail="Teaching aid not found or link expired")

    # Check not importing own
    if source_aid.teacher_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot import your own teaching aid")

    # Generate new slug and share code for the copy
    new_slug = f"t_{current_user.id[:8]}_{secrets.token_urlsafe(8)}"
    new_share_code = _generate_share_code()
    new_storage_path = f"teacher/{current_user.id}/{new_slug}"

    # Copy files
    root = get_teaching_aids_root() / "assets"
    source_dir = root / source_aid.storage_path
    new_dir = root / new_storage_path

    if source_dir.exists():
        shutil.copytree(source_dir, new_dir, dirs_exist_ok=False)

    # Create new teaching aid record
    new_aid = TeachingAid(
        id=str(uuid.uuid4()),
        name=source_aid.name,
        slug=new_slug,
        category_code=source_aid.category_code,
        category_label=source_aid.category_label,
        summary=source_aid.summary,
        status="active",
        tags=list(source_aid.tags or []),
        source_type="imported",
        storage_path=new_storage_path,
        entry_file=source_aid.entry_file,
        cover_image_url=source_aid.cover_image_url,
        teacher_id=current_user.id,
        share_code=new_share_code,
        is_public=False,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(new_aid)
    await db.flush()

    return _serialize_teaching_aid_teacher(new_aid)
