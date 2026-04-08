from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.db.session import get_db
from app.models import (
    BigscreenActivityPack,
    BigscreenActivitySession,
    BigscreenContentAsset,
    Class,
    TeacherProfile,
    User,
    UserRole,
    LiveSession,
)
from app.services.bigscreen_activities import (
    SUPPORTED_ACTIVITY_TYPES,
    SUPPORTED_PARTICIPANT_MODES,
    SUPPORTED_SESSION_STATUSES,
    SUPPORTED_STATUSES,
    build_initial_scoreboard,
    normalize_string_list,
    resolve_lead_side_id,
    resolve_winner_side_id,
    utc_now,
    validate_bigscreen_content_payload,
)
from app.services.membership import (
    FEATURE_BIGSCREEN_ACTIVITY_PACKS,
    FEATURE_BIGSCREEN_CONTENT_ASSETS,
    assert_teacher_feature_access,
)

router = APIRouter(prefix="/bigscreen-activities", tags=["BigscreenActivities"])


def _require_teacher_or_admin(current_user: User) -> None:
    if current_user.role not in {UserRole.TEACHER, UserRole.ADMIN}:
        raise HTTPException(status_code=403, detail="Teacher or admin access required")


async def _resolve_teacher_id(db: AsyncSession, current_user: User) -> str:
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Teacher access required")
    teacher = (
        await db.execute(select(TeacherProfile).where(TeacherProfile.user_id == current_user.id))
    ).scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    return teacher.user_id


async def _assert_teacher_owns_class(db: AsyncSession, teacher_id: str, class_id: str) -> Class:
    class_obj = (
        await db.execute(select(Class).where(Class.id == class_id, Class.teacher_id == teacher_id))
    ).scalar_one_or_none()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    return class_obj


async def _load_assets_by_ids(db: AsyncSession, asset_ids: list[str], teacher_id: str) -> list[BigscreenContentAsset]:
    if not asset_ids:
        return []
    rows = (
        await db.execute(
            select(BigscreenContentAsset).where(
                BigscreenContentAsset.id.in_(asset_ids),
                BigscreenContentAsset.teacher_id == teacher_id,
            )
        )
    ).scalars().all()
    assets_by_id = {asset.id: asset for asset in rows}
    missing = [asset_id for asset_id in asset_ids if asset_id not in assets_by_id]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing content assets: {', '.join(missing)}")
    return [assets_by_id[asset_id] for asset_id in asset_ids]


def _serialize_asset(asset: BigscreenContentAsset) -> dict[str, Any]:
    return {
        "id": asset.id,
        "teacher_id": asset.teacher_id,
        "title": asset.title,
        "content_type": asset.content_type,
        "payload": asset.payload,
        "difficulty": asset.difficulty,
        "tags": list(asset.tags or []),
        "supports_device_interaction": bool(asset.supports_device_interaction),
        "supports_bigscreen_interaction": bool(asset.supports_bigscreen_interaction),
        "supports_competition": bool(asset.supports_competition),
        "source_type": asset.source_type,
        "status": asset.status,
        "created_at": asset.created_at.isoformat() if asset.created_at else None,
        "updated_at": asset.updated_at.isoformat() if asset.updated_at else None,
    }


def _serialize_pack(pack: BigscreenActivityPack, assets: Optional[list[BigscreenContentAsset]] = None) -> dict[str, Any]:
    return {
        "id": pack.id,
        "teacher_id": pack.teacher_id,
        "title": pack.title,
        "activity_type": pack.activity_type,
        "participant_mode": pack.participant_mode,
        "content_asset_refs": list(pack.content_asset_refs or []),
        "round_count": pack.round_count,
        "time_limit_seconds": pack.time_limit_seconds,
        "scoring_rule": pack.scoring_rule,
        "win_rule": pack.win_rule,
        "status": pack.status,
        "content_assets": [_serialize_asset(asset) for asset in assets] if assets is not None else None,
        "created_at": pack.created_at.isoformat() if pack.created_at else None,
        "updated_at": pack.updated_at.isoformat() if pack.updated_at else None,
    }


def _serialize_session(
    session: BigscreenActivitySession,
    pack: Optional[BigscreenActivityPack] = None,
    assets: Optional[list[BigscreenContentAsset]] = None,
) -> dict[str, Any]:
    lead_side_id = resolve_lead_side_id(list(session.scoreboard or []))
    return {
        "id": session.id,
        "teacher_id": session.teacher_id,
        "class_id": session.class_id,
        "activity_pack_id": session.activity_pack_id,
        "activity_type": session.activity_type,
        "status": session.status,
        "participant_sides": list(session.participant_sides or []),
        "current_round": session.current_round,
        "current_asset_id": session.current_asset_id,
        "scoreboard": list(session.scoreboard or []),
        "result_summary": session.result_summary or {},
        "lead_side_id": lead_side_id,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "ended_at": session.ended_at.isoformat() if session.ended_at else None,
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "updated_at": session.updated_at.isoformat() if session.updated_at else None,
        "activity_pack": _serialize_pack(pack, assets) if pack else None,
    }


class ContentAssetPayload(BaseModel):
    title: str
    content_type: str
    payload: dict[str, Any]
    difficulty: Optional[str] = None
    tags: list[str] = []
    supports_device_interaction: bool = False
    supports_bigscreen_interaction: bool = True
    supports_competition: bool = True
    source_type: str = "manual"
    status: str = "draft"


class ActivityPackPayload(BaseModel):
    title: str
    activity_type: str
    participant_mode: str
    content_asset_refs: list[str]
    round_count: int
    time_limit_seconds: Optional[int] = None
    scoring_rule: str = "round_wins_then_time"
    win_rule: str = "highest_score_then_time"
    status: str = "draft"


class LaunchSessionPayload(BaseModel):
    class_id: str
    participant_sides: list[dict[str, Any]]


class SessionControlPayload(BaseModel):
    action: str


class RoundResultPayload(BaseModel):
    round_number: int
    scoreboard: list[dict[str, Any]]
    winner_side_id: Optional[str] = None
    round_summary: dict[str, Any] = {}


@router.get("/assets")
async def list_content_assets(
    content_type: str | None = Query(default=None),
    status: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher_id = await _resolve_teacher_id(db, current_user)
    query = select(BigscreenContentAsset).where(BigscreenContentAsset.teacher_id == teacher_id)
    if content_type:
        query = query.where(BigscreenContentAsset.content_type == content_type)
    if status:
        query = query.where(BigscreenContentAsset.status == status)
    query = query.order_by(BigscreenContentAsset.updated_at.desc(), BigscreenContentAsset.created_at.desc())
    items = (await db.execute(query)).scalars().all()
    return {"items": [_serialize_asset(item) for item in items]}


@router.post("/assets")
async def create_content_asset(
    payload: ContentAssetPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher_id = await _resolve_teacher_id(db, current_user)
    await assert_teacher_feature_access(db, teacher_id, FEATURE_BIGSCREEN_CONTENT_ASSETS)
    if payload.status not in SUPPORTED_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid asset status")
    normalized_payload = validate_bigscreen_content_payload(payload.content_type, payload.payload)
    asset = BigscreenContentAsset(
        teacher_id=teacher_id,
        title=payload.title.strip(),
        content_type=payload.content_type,
        payload=normalized_payload,
        difficulty=(payload.difficulty or "").strip() or None,
        tags=normalize_string_list(payload.tags),
        supports_device_interaction=payload.supports_device_interaction,
        supports_bigscreen_interaction=payload.supports_bigscreen_interaction,
        supports_competition=payload.supports_competition,
        source_type=(payload.source_type or "manual").strip() or "manual",
        status=payload.status,
    )
    db.add(asset)
    await db.flush()
    return _serialize_asset(asset)


@router.get("/assets/{asset_id}")
async def get_content_asset(
    asset_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher_id = await _resolve_teacher_id(db, current_user)
    asset = (
        await db.execute(
            select(BigscreenContentAsset).where(
                BigscreenContentAsset.id == asset_id,
                BigscreenContentAsset.teacher_id == teacher_id,
            )
        )
    ).scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Content asset not found")
    return _serialize_asset(asset)


@router.put("/assets/{asset_id}")
async def update_content_asset(
    asset_id: str,
    payload: ContentAssetPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher_id = await _resolve_teacher_id(db, current_user)
    asset = (
        await db.execute(
            select(BigscreenContentAsset).where(
                BigscreenContentAsset.id == asset_id,
                BigscreenContentAsset.teacher_id == teacher_id,
            )
        )
    ).scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Content asset not found")
    if payload.status not in SUPPORTED_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid asset status")
    asset.title = payload.title.strip()
    asset.content_type = payload.content_type
    asset.payload = validate_bigscreen_content_payload(payload.content_type, payload.payload)
    asset.difficulty = (payload.difficulty or "").strip() or None
    asset.tags = normalize_string_list(payload.tags)
    asset.supports_device_interaction = payload.supports_device_interaction
    asset.supports_bigscreen_interaction = payload.supports_bigscreen_interaction
    asset.supports_competition = payload.supports_competition
    asset.source_type = (payload.source_type or "manual").strip() or "manual"
    asset.status = payload.status
    asset.updated_at = utc_now()
    await db.flush()
    return _serialize_asset(asset)


@router.get("/packs")
async def list_activity_packs(
    status: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher_id = await _resolve_teacher_id(db, current_user)
    query = select(BigscreenActivityPack).where(BigscreenActivityPack.teacher_id == teacher_id)
    if status:
        query = query.where(BigscreenActivityPack.status == status)
    query = query.order_by(BigscreenActivityPack.updated_at.desc(), BigscreenActivityPack.created_at.desc())
    packs = (await db.execute(query)).scalars().all()
    return {"items": [_serialize_pack(pack) for pack in packs]}


@router.post("/packs")
async def create_activity_pack(
    payload: ActivityPackPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher_id = await _resolve_teacher_id(db, current_user)
    await assert_teacher_feature_access(db, teacher_id, FEATURE_BIGSCREEN_ACTIVITY_PACKS)
    if payload.activity_type not in SUPPORTED_ACTIVITY_TYPES:
        raise HTTPException(status_code=400, detail="Invalid activity type")
    if payload.participant_mode not in SUPPORTED_PARTICIPANT_MODES:
        raise HTTPException(status_code=400, detail="Invalid participant mode")
    if payload.status not in SUPPORTED_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid pack status")
    asset_ids = [asset_id for asset_id in payload.content_asset_refs if asset_id]
    if not asset_ids:
        raise HTTPException(status_code=400, detail="At least one content asset is required")
    assets = await _load_assets_by_ids(db, asset_ids, teacher_id)
    if payload.round_count < 1 or payload.round_count > len(asset_ids):
        raise HTTPException(status_code=400, detail="Invalid round count")
    pack = BigscreenActivityPack(
        teacher_id=teacher_id,
        title=payload.title.strip(),
        activity_type=payload.activity_type,
        participant_mode=payload.participant_mode,
        content_asset_refs=asset_ids,
        round_count=payload.round_count,
        time_limit_seconds=payload.time_limit_seconds,
        scoring_rule=payload.scoring_rule.strip() or "round_wins_then_time",
        win_rule=payload.win_rule.strip() or "highest_score_then_time",
        status=payload.status,
    )
    db.add(pack)
    await db.flush()
    return _serialize_pack(pack, assets)


@router.get("/packs/{pack_id}")
async def get_activity_pack(
    pack_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher_id = await _resolve_teacher_id(db, current_user)
    pack = (
        await db.execute(
            select(BigscreenActivityPack).where(
                BigscreenActivityPack.id == pack_id,
                BigscreenActivityPack.teacher_id == teacher_id,
            )
        )
    ).scalar_one_or_none()
    if not pack:
        raise HTTPException(status_code=404, detail="Activity pack not found")
    assets = await _load_assets_by_ids(db, list(pack.content_asset_refs or []), teacher_id)
    return _serialize_pack(pack, assets)


@router.put("/packs/{pack_id}")
async def update_activity_pack(
    pack_id: str,
    payload: ActivityPackPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher_id = await _resolve_teacher_id(db, current_user)
    pack = (
        await db.execute(
            select(BigscreenActivityPack).where(
                BigscreenActivityPack.id == pack_id,
                BigscreenActivityPack.teacher_id == teacher_id,
            )
        )
    ).scalar_one_or_none()
    if not pack:
        raise HTTPException(status_code=404, detail="Activity pack not found")
    if payload.activity_type not in SUPPORTED_ACTIVITY_TYPES:
        raise HTTPException(status_code=400, detail="Invalid activity type")
    if payload.participant_mode not in SUPPORTED_PARTICIPANT_MODES:
        raise HTTPException(status_code=400, detail="Invalid participant mode")
    if payload.status not in SUPPORTED_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid pack status")
    asset_ids = [asset_id for asset_id in payload.content_asset_refs if asset_id]
    if not asset_ids:
        raise HTTPException(status_code=400, detail="At least one content asset is required")
    assets = await _load_assets_by_ids(db, asset_ids, teacher_id)
    if payload.round_count < 1 or payload.round_count > len(asset_ids):
        raise HTTPException(status_code=400, detail="Invalid round count")
    pack.title = payload.title.strip()
    pack.activity_type = payload.activity_type
    pack.participant_mode = payload.participant_mode
    pack.content_asset_refs = asset_ids
    pack.round_count = payload.round_count
    pack.time_limit_seconds = payload.time_limit_seconds
    pack.scoring_rule = payload.scoring_rule.strip() or "round_wins_then_time"
    pack.win_rule = payload.win_rule.strip() or "highest_score_then_time"
    pack.status = payload.status
    pack.updated_at = utc_now()
    await db.flush()
    return _serialize_pack(pack, assets)


@router.post("/packs/{pack_id}/launch")
async def launch_activity_pack(
    pack_id: str,
    payload: LaunchSessionPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher_id = await _resolve_teacher_id(db, current_user)
    pack = (
        await db.execute(
            select(BigscreenActivityPack).where(
                BigscreenActivityPack.id == pack_id,
                BigscreenActivityPack.teacher_id == teacher_id,
            )
        )
    ).scalar_one_or_none()
    if not pack:
        raise HTTPException(status_code=404, detail="Activity pack not found")
    if pack.status != "active":
        raise HTTPException(status_code=400, detail="Only active packs can be launched")
    await _assert_teacher_owns_class(db, teacher_id, payload.class_id)
    if not isinstance(payload.participant_sides, list) or len(payload.participant_sides) != 2:
        raise HTTPException(status_code=400, detail="Exactly two participant sides are required")

    asset_ids = list(pack.content_asset_refs or [])
    assets = await _load_assets_by_ids(db, asset_ids, teacher_id)
    if any(asset.status != "active" for asset in assets):
        raise HTTPException(status_code=400, detail="All selected assets must be active")

    normalized_sides: list[dict[str, Any]] = []
    seen_side_ids: set[str] = set()
    for index, side in enumerate(payload.participant_sides, start=1):
        if not isinstance(side, dict):
            raise HTTPException(status_code=400, detail="Invalid participant side")
        side_id = str(side.get("id") or f"side-{index}").strip()
        label = str(side.get("label") or f"Side {index}").strip()
        side_type = str(side.get("type") or "anonymous_side").strip()
        if side_type not in {"student", "team", "anonymous_side"}:
            raise HTTPException(status_code=400, detail="Invalid participant side type")
        if not side_id or side_id in seen_side_ids or not label:
            raise HTTPException(status_code=400, detail="Invalid participant side")
        seen_side_ids.add(side_id)
        normalized_sides.append(
            {
                "id": side_id,
                "label": label,
                "type": side_type,
                "member_ids": normalize_string_list(side.get("member_ids")),
                "display_color": str(side.get("display_color") or ("#60a5fa" if index == 1 else "#f97316")).strip(),
            }
        )

    # 获取当前活跃的课堂会话
    active_session_result = await db.execute(
        select(LiveSession).where(
            LiveSession.class_id == payload.class_id,
            LiveSession.status == "active"
        ).order_by(LiveSession.started_at.desc())
    )
    active_session = active_session_result.scalar_one_or_none()
    live_session_id = active_session.id if active_session else None

    session = BigscreenActivitySession(
        teacher_id=teacher_id,
        class_id=payload.class_id,
        activity_pack_id=pack.id,
        activity_type=pack.activity_type,
        status="pending",
        participant_sides=normalized_sides,
        current_round=1,
        current_asset_id=asset_ids[0] if asset_ids else None,
        scoreboard=build_initial_scoreboard(normalized_sides),
        result_summary={"rounds": []},
        live_session_id=live_session_id,  # 自动关联课堂会话
    )
    db.add(session)
    await db.flush()
    return _serialize_session(session, pack, assets)


@router.get("/sessions/{session_id}")
async def get_activity_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher_id = await _resolve_teacher_id(db, current_user)
    session = (
        await db.execute(
            select(BigscreenActivitySession).where(
                BigscreenActivitySession.id == session_id,
                BigscreenActivitySession.teacher_id == teacher_id,
            )
        )
    ).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Activity session not found")
    pack = (
        await db.execute(select(BigscreenActivityPack).where(BigscreenActivityPack.id == session.activity_pack_id))
    ).scalar_one()
    assets = await _load_assets_by_ids(db, list(pack.content_asset_refs or []), teacher_id)
    return _serialize_session(session, pack, assets)


@router.post("/sessions/{session_id}/control")
async def control_activity_session(
    session_id: str,
    payload: SessionControlPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher_id = await _resolve_teacher_id(db, current_user)
    session = (
        await db.execute(
            select(BigscreenActivitySession).where(
                BigscreenActivitySession.id == session_id,
                BigscreenActivitySession.teacher_id == teacher_id,
            )
        )
    ).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Activity session not found")

    action = payload.action.strip().lower()
    if action == "start":
        session.status = "running"
        session.started_at = session.started_at or utc_now()
    elif action == "pause":
        session.status = "paused"
    elif action == "resume":
        session.status = "running"
    elif action == "cancel":
        session.status = "cancelled"
        session.ended_at = utc_now()
    elif action == "end":
        session.status = "ended"
        session.ended_at = utc_now()
        summary = dict(session.result_summary or {})
        summary["winner_side_id"] = resolve_winner_side_id(list(session.scoreboard or []))
        session.result_summary = summary
    else:
        raise HTTPException(status_code=400, detail="Unsupported control action")

    session.updated_at = utc_now()
    await db.flush()
    pack = (
        await db.execute(select(BigscreenActivityPack).where(BigscreenActivityPack.id == session.activity_pack_id))
    ).scalar_one()
    assets = await _load_assets_by_ids(db, list(pack.content_asset_refs or []), teacher_id)
    return _serialize_session(session, pack, assets)


@router.post("/sessions/{session_id}/round-result")
async def submit_round_result(
    session_id: str,
    payload: RoundResultPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher_id = await _resolve_teacher_id(db, current_user)
    session = (
        await db.execute(
            select(BigscreenActivitySession).where(
                BigscreenActivitySession.id == session_id,
                BigscreenActivitySession.teacher_id == teacher_id,
            )
        )
    ).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Activity session not found")
    if session.status not in {"running", "paused", "pending"}:
        raise HTTPException(status_code=400, detail="Session is not accepting round results")

    pack = (
        await db.execute(select(BigscreenActivityPack).where(BigscreenActivityPack.id == session.activity_pack_id))
    ).scalar_one()
    asset_ids = list(pack.content_asset_refs or [])
    assets = await _load_assets_by_ids(db, asset_ids, teacher_id)
    valid_side_ids = {str(item.get("id") or "") for item in session.participant_sides or []}
    next_scoreboard: list[dict[str, Any]] = []
    for row in payload.scoreboard:
        side_id = str(row.get("side_id") or "").strip()
        if side_id not in valid_side_ids:
            raise HTTPException(status_code=400, detail="Invalid scoreboard side")
        next_scoreboard.append(
            {
                "side_id": side_id,
                "label": str(row.get("label") or "").strip(),
                "score": int(row.get("score") or 0),
                "round_wins": int(row.get("round_wins") or 0),
                "completed_count": int(row.get("completed_count") or 0),
                "total_time_ms": int(row.get("total_time_ms") or 0),
            }
        )

    summary = dict(session.result_summary or {})
    rounds = list(summary.get("rounds") or [])
    rounds.append(
        {
            "round_number": payload.round_number,
            "asset_id": session.current_asset_id,
            "winner_side_id": payload.winner_side_id,
            "summary": payload.round_summary or {},
            "recorded_at": utc_now().isoformat(),
        }
    )
    summary["rounds"] = rounds
    summary["last_winner_side_id"] = payload.winner_side_id

    session.scoreboard = next_scoreboard
    session.result_summary = summary

    next_round = payload.round_number + 1
    if next_round > min(pack.round_count, len(asset_ids)):
        session.status = "ended"
        session.current_round = payload.round_number
        session.current_asset_id = None
        session.ended_at = utc_now()
        summary["winner_side_id"] = resolve_winner_side_id(next_scoreboard)
        session.result_summary = summary
    else:
        session.current_round = next_round
        session.current_asset_id = asset_ids[next_round - 1]
        if session.status == "pending":
            session.status = "running"
    session.updated_at = utc_now()
    await db.flush()
    return _serialize_session(session, pack, assets)
