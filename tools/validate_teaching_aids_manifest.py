from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse


REPO_ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = REPO_ROOT / "server" / "storage" / "teaching-aids" / "manifests" / "teaching-aids.json"
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


IGNORE_SCHEMES = {"http", "https", "data", "mailto", "javascript", "tel"}
RESOURCE_ATTRS = {
    "src",
    "href",
    "poster",
    "data",
}


@dataclass
class AidValidationResult:
    slug: str
    name: str
    category: str
    status: str
    warnings: list[str]
    errors: list[str]


@dataclass
class ManifestItem:
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
class ManifestData:
    base_path: str
    items: list[ManifestItem]


class ResourceCollector(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.references: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        for key, value in attrs:
            if key in RESOURCE_ATTRS and value:
                self.references.append(value.strip())


def normalize_reference(reference: str) -> str | None:
    if not reference or reference.startswith("#"):
        return None
    parsed = urlparse(reference)
    if parsed.scheme in IGNORE_SCHEMES:
        return None
    if parsed.netloc:
        return None
    path = parsed.path.strip()
    return path or None


def collect_html_references(html_path: Path) -> list[str]:
    parser = ResourceCollector()
    parser.feed(html_path.read_text(encoding="utf-8", errors="ignore"))
    return [ref for ref in (normalize_reference(item) for item in parser.references) if ref]


def validate_aid(category_root: Path, item) -> AidValidationResult:
    warnings: list[str] = []
    errors: list[str] = []

    aid_root = category_root / item.slug
    entry_path = aid_root / "index.html"

    if not aid_root.exists() or not aid_root.is_dir():
        errors.append("missing_aid_directory")
    if not entry_path.exists():
        errors.append("missing_index_html")

    if item.cover_image and not (category_root.parent / item.cover_image).exists():
        warnings.append("missing_cover_image")
    if item.diagram_image and not (category_root.parent / item.diagram_image).exists():
        warnings.append("missing_diagram_image")

    if entry_path.exists():
        references = collect_html_references(entry_path)
        for reference in references:
            ref_path = Path(reference.replace("\\", "/"))
            if ref_path.is_absolute():
                errors.append(f"absolute_resource_path:{reference}")
                continue
            resolved = (entry_path.parent / ref_path).resolve()
            try:
                resolved.relative_to(aid_root.resolve())
            except ValueError:
                errors.append(f"resource_outside_aid_root:{reference}")
                continue
            if not resolved.exists():
                errors.append(f"missing_resource:{reference}")

    if errors:
        status = "blocked"
    elif warnings:
        status = "ready_without_visuals"
    else:
        status = "ready"

    return AidValidationResult(
        slug=item.slug,
        name=item.name,
        category=item.category,
        status=status,
        warnings=warnings,
        errors=errors,
    )


def load_manifest() -> ManifestData:
    raw = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    base_path = str(raw.get("base_path") or "").strip()
    if not base_path:
        raise SystemExit("Manifest 缺少 base_path")

    items: list[ManifestItem] = []
    seen_slugs: set[str] = set()
    for raw_item in raw.get("items", []):
        name = str(raw_item.get("name") or "").strip()
        slug = str(raw_item.get("slug") or "").strip()
        category = str(raw_item.get("category") or "").strip()
        html_entry = str(raw_item.get("html_entry") or "").strip()
        summary = str(raw_item.get("summary") or "").strip() or None
        cover_image = str(raw_item.get("cover_image") or "").strip() or None
        diagram_image = str(raw_item.get("diagram_image") or "").strip() or None
        source_filename = str(raw_item.get("source_filename") or "").strip() or None
        tags = raw_item.get("tags") or []

        if not name:
            raise SystemExit(f"Manifest 条目缺少 name: {slug or '<unknown>'}")
        if not slug:
            raise SystemExit(f"Manifest 条目缺少 slug: {name}")
        if slug in seen_slugs:
            raise SystemExit(f"Manifest 中存在重复 slug: {slug}")
        if not SLUG_PATTERN.match(slug):
            raise SystemExit(f"Manifest 中 slug 非法: {slug}")
        if not category:
            raise SystemExit(f"Manifest 条目缺少 category: {slug}")
        expected_entry = f"{category}/{slug}/index.html"
        if html_entry != expected_entry:
            raise SystemExit(f"Manifest 条目 html_entry 非法: {slug} -> {html_entry}")

        seen_slugs.add(slug)
        items.append(
            ManifestItem(
                name=name,
                slug=slug,
                category=category,
                summary=summary,
                cover_image=cover_image,
                diagram_image=diagram_image,
                html_entry=html_entry,
                source_filename=source_filename,
                tags=[str(tag).strip() for tag in tags if str(tag).strip()],
            )
        )

    return ManifestData(base_path=base_path, items=items)


def main() -> int:
    manifest = load_manifest()
    storage_root = (REPO_ROOT / manifest.base_path).resolve()

    results: list[AidValidationResult] = []
    summary = {
        "total": 0,
        "ready": 0,
        "ready_without_visuals": 0,
        "blocked": 0,
    }

    for item in manifest.items:
        category_root = storage_root / item.category
        result = validate_aid(category_root, item)
        results.append(result)
        summary["total"] += 1
        summary[result.status] += 1

    output = {
        "manifest_path": str(MANIFEST_PATH),
        "storage_root": str(storage_root),
        "summary": summary,
        "items": [asdict(item) for item in results],
    }

    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 0 if summary["blocked"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
