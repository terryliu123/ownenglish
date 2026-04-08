import json
import mimetypes
import os
import secrets
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import TeachingAid, TeachingAidSession, LiveSession

DEFAULT_CATEGORY_LABELS: dict[str, str] = {
    "physics": "物理",
    "chemistry": "化学",
    "biology": "生物",
    "earth_science": "地球科学",
    "general_science": "综合科学",
    "mathematics": "数学",
    "other": "其他",
}

SESSION_TTL_HOURS = 4
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


@dataclass
class TeachingAidCategory:
    code: str
    label: str


@dataclass
class TeachingAidManifestItem:
    name: str
    slug: str
    category: str
    summary: str | None
    cover_image: str | None
    diagram_image: str | None
    html_entry: str
    source_filename: str | None
    tags: list[str]


@dataclass
class TeachingAidManifest:
    schema_version: int
    base_path: str
    categories: list[TeachingAidCategory]
    items: list[TeachingAidManifestItem]


def get_teaching_aids_root() -> Path:
    base_dir = Path(__file__).resolve().parents[2]
    root = base_dir / "storage" / "teaching-aids"
    (root / "assets").mkdir(parents=True, exist_ok=True)
    (root / "manifests").mkdir(parents=True, exist_ok=True)
    return root


def get_teaching_aids_manifest_path() -> Path:
    return get_teaching_aids_root() / "manifests" / "teaching-aids.json"


def _is_relative_safe_path(value: str) -> bool:
    normalized = value.replace("\\", "/")
    return bool(normalized) and not normalized.startswith("/") and ".." not in normalized.split("/")


def _normalize_tags(raw_tags: Any) -> list[str]:
    if raw_tags is None:
        return []
    if not isinstance(raw_tags, list):
        raise ValueError("tags_must_be_array")
    return [str(tag).strip() for tag in raw_tags if str(tag).strip()]


def load_teaching_aids_manifest() -> TeachingAidManifest:
    manifest_path = get_teaching_aids_manifest_path()
    if not manifest_path.exists():
        raise FileNotFoundError(f"Teaching aid manifest not found: {manifest_path}")

    raw = json.loads(manifest_path.read_text(encoding="utf-8"))
    schema_version = int(raw.get("schema_version") or 0)
    if schema_version != 1:
        raise ValueError("unsupported_schema_version")

    base_path = str(raw.get("base_path") or "").strip()
    if not base_path:
        raise ValueError("manifest_base_path_required")

    categories_raw = raw.get("categories")
    if not isinstance(categories_raw, list) or not categories_raw:
        raise ValueError("manifest_categories_required")

    categories: list[TeachingAidCategory] = []
    category_map: dict[str, str] = {}
    for item in categories_raw:
        if not isinstance(item, dict):
            raise ValueError("invalid_category_entry")
        code = str(item.get("code") or "").strip()
        label = str(item.get("label") or DEFAULT_CATEGORY_LABELS.get(code, code)).strip()
        if not code or not label:
            raise ValueError("invalid_category_entry")
        categories.append(TeachingAidCategory(code=code, label=label))
        category_map[code] = label

    items_raw = raw.get("items")
    if not isinstance(items_raw, list):
        raise ValueError("manifest_items_required")

    items: list[TeachingAidManifestItem] = []
    seen_slugs: set[str] = set()
    for raw_item in items_raw:
        if not isinstance(raw_item, dict):
            raise ValueError("invalid_manifest_item")
        name = str(raw_item.get("name") or "").strip()
        slug = str(raw_item.get("slug") or "").strip()
        category = str(raw_item.get("category") or "").strip()
        html_entry = str(raw_item.get("html_entry") or "").strip()
        summary = str(raw_item.get("summary") or "").strip() or None
        cover_image = str(raw_item.get("cover_image") or "").strip() or None
        diagram_image = str(raw_item.get("diagram_image") or "").strip() or None
        source_filename = str(raw_item.get("source_filename") or "").strip() or None
        tags = _normalize_tags(raw_item.get("tags"))

        if not name:
            raise ValueError("manifest_item_name_required")
        if not slug:
            raise ValueError("manifest_item_slug_required")
        if not SLUG_PATTERN.match(slug):
            raise ValueError(f"invalid_slug:{slug}")
        if slug in seen_slugs:
            raise ValueError(f"duplicate_slug:{slug}")
        if not category:
            raise ValueError(f"manifest_item_category_required:{slug}")
        if category not in category_map:
            raise ValueError(f"unknown_category:{category}")
        if not html_entry:
            raise ValueError(f"manifest_item_html_entry_required:{slug}")

        expected_prefix = f"{category}/{slug}/"
        expected_entry = f"{expected_prefix}index.html"
        if html_entry != expected_entry:
            raise ValueError(f"invalid_html_entry:{slug}")

        for path_value in [html_entry, cover_image, diagram_image]:
            if path_value and not _is_relative_safe_path(path_value):
                raise ValueError(f"invalid_relative_path:{slug}")
            if path_value and not path_value.startswith(expected_prefix):
                raise ValueError(f"path_must_stay_in_aid_directory:{slug}")

        seen_slugs.add(slug)
        items.append(
            TeachingAidManifestItem(
                name=name,
                slug=slug,
                category=category,
                summary=summary,
                cover_image=cover_image,
                diagram_image=diagram_image,
                html_entry=html_entry,
                source_filename=source_filename,
                tags=tags,
            )
        )

    return TeachingAidManifest(
        schema_version=schema_version,
        base_path=base_path,
        categories=categories,
        items=items,
    )


def _resolve_storage_root(manifest: TeachingAidManifest) -> Path:
    configured = manifest.base_path.replace("\\", os.sep).replace("/", os.sep)
    root = Path(configured)
    if not root.is_absolute():
        project_root = Path(__file__).resolve().parents[3]
        root = project_root / configured
    return root.resolve()


def _validate_manifest_file(root: Path, relative_path: str, slug: str) -> Path:
    target = (root / relative_path).resolve()
    if root not in target.parents and target != root:
        raise ValueError(f"path_out_of_scope:{slug}")
    if not target.exists() or not target.is_file():
        raise ValueError(f"missing_file:{slug}:{relative_path}")
    return target


async def sync_teaching_aids_manifest(db: AsyncSession) -> dict[str, Any]:
    manifest = load_teaching_aids_manifest()
    storage_root = _resolve_storage_root(manifest)
    if not storage_root.exists():
        raise HTTPException(status_code=400, detail=f"Teaching aid assets path not found: {storage_root}")

    categories_map = {category.code: category.label for category in manifest.categories}
    existing = {
        aid.slug: aid
        for aid in (await db.execute(select(TeachingAid))).scalars().all()
    }

    created = 0
    updated = 0
    failed = 0
    errors: list[dict[str, str]] = []
    manifest_slugs: set[str] = set()

    for item in manifest.items:
        manifest_slugs.add(item.slug)
        try:
            entry_path = _validate_manifest_file(storage_root, item.html_entry, item.slug)
            cover_relative = item.cover_image if item.cover_image else None
            diagram_relative = item.diagram_image if item.diagram_image else None
            if cover_relative:
                _validate_manifest_file(storage_root, cover_relative, item.slug)
            if diagram_relative:
                try:
                    _validate_manifest_file(storage_root, diagram_relative, item.slug)
                except ValueError:
                    # diagram.png 是可选的，如果不存在则设为 None
                    diagram_relative = None

            storage_dir = entry_path.parent.relative_to(storage_root).as_posix()
            storage_dir_path = Path(storage_dir)
            entry_relative_to_aid = entry_path.relative_to(storage_root / storage_dir_path).as_posix()
            cover_relative_to_aid = (
                (storage_root / cover_relative).relative_to(storage_root / storage_dir_path).as_posix()
                if cover_relative
                else None
            )
            diagram_relative_to_aid = (
                (storage_root / diagram_relative).relative_to(storage_root / storage_dir_path).as_posix()
                if diagram_relative
                else None
            )
            payload = {
                "name": item.name,
                "category_code": item.category,
                "category_label": categories_map[item.category],
                "summary": item.summary,
                "cover_image_url": cover_relative_to_aid,
                "diagram_image_url": diagram_relative_to_aid,
                "entry_file": entry_relative_to_aid,
                "storage_path": storage_dir,
                "source_filename": item.source_filename,
                "tags": item.tags,
                "source_type": "batch_import",
                "updated_at": datetime.now(timezone.utc),
            }

            current = existing.get(item.slug)
            if current:
                for key, value in payload.items():
                    setattr(current, key, value)
                updated += 1
            else:
                db.add(
                    TeachingAid(
                        slug=item.slug,
                        status="draft",
                        created_at=datetime.now(timezone.utc),
                        **payload,
                    )
                )
                created += 1
        except ValueError as exc:
            failed += 1
            errors.append({"slug": item.slug, "reason": str(exc)})

    missing_existing = sorted(set(existing.keys()) - manifest_slugs)
    await db.flush()
    return {
        "schema_version": manifest.schema_version,
        "base_path": str(storage_root),
        "categories": [{"code": item.code, "label": item.label} for item in manifest.categories],
        "total": len(manifest.items),
        "created": created,
        "updated": updated,
        "failed": failed,
        "missing_existing": missing_existing,
        "errors": errors,
    }


def create_teaching_aid_session_token() -> str:
    return secrets.token_urlsafe(24)


async def create_teaching_aid_session(
    db: AsyncSession,
    teaching_aid_id: str,
    user_id: str,
    class_id: str | None = None,
) -> TeachingAidSession:
    # 获取当前活跃的课堂会话
    live_session_id = None
    if class_id:
        active_session_result = await db.execute(
            select(LiveSession).where(
                LiveSession.class_id == class_id,
                LiveSession.status == "active"
            ).order_by(LiveSession.started_at.desc())
        )
        active_session = active_session_result.scalar_one_or_none()
        live_session_id = active_session.id if active_session else None

    session = TeachingAidSession(
        teaching_aid_id=teaching_aid_id,
        user_id=user_id,
        session_token=create_teaching_aid_session_token(),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=SESSION_TTL_HOURS),
        live_session_id=live_session_id,  # 自动关联课堂会话
    )
    db.add(session)
    await db.flush()
    return session


async def get_valid_teaching_aid_session(db: AsyncSession, session_token: str) -> TeachingAidSession:
    result = await db.execute(
        select(TeachingAidSession).where(TeachingAidSession.session_token == session_token)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Teaching aid session not found")
    if session.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Teaching aid session expired")
    session.last_accessed_at = datetime.now(timezone.utc)
    await db.flush()
    return session


def resolve_teaching_aid_file_path(teaching_aid: TeachingAid, request_path: str) -> Path:
    normalized_path = request_path.strip() or teaching_aid.entry_file
    normalized_path = normalized_path.replace("\\", "/")
    if normalized_path.startswith("/"):
        normalized_path = normalized_path[1:]
    if ".." in normalized_path.split("/"):
        raise HTTPException(status_code=400, detail="Invalid teaching aid path")

    root = get_teaching_aids_root() / "assets"
    aid_root = (root / teaching_aid.storage_path).resolve()
    target = (aid_root / normalized_path).resolve()
    if aid_root not in target.parents and target != aid_root:
        raise HTTPException(status_code=400, detail="Invalid teaching aid path")
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="Teaching aid asset not found")
    return target


def guess_media_type(path: Path) -> str | None:
    media_type, _ = mimetypes.guess_type(str(path))
    if path.suffix.lower() in {".js", ".mjs"}:
        return "application/javascript"
    if path.suffix.lower() == ".css":
        return "text/css"
    if path.suffix.lower() in {".html", ".htm"}:
        return "text/html"
    return media_type
