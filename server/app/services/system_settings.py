from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import SystemSetting


WECHAT_PAY_SETTING_KEYS = [
    "WECHAT_PAY_APP_ID",
    "WECHAT_PAY_MCH_ID",
    "WECHAT_PAY_MCH_SERIAL_NO",
    "WECHAT_PAY_PRIVATE_KEY_PATH",
    "WECHAT_PAY_PRIVATE_KEY",
    "WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH",
    "WECHAT_PAY_PLATFORM_PUBLIC_KEY",
    "WECHAT_PAY_API_V3_KEY",
    "WECHAT_PAY_NOTIFY_URL",
    "WECHAT_PAY_RETURN_URL",
    "WECHAT_PAY_H5_DOMAIN",
]

_runtime_settings: dict[str, str] = {}


def get_runtime_setting(key: str, default: Optional[str] = None) -> Optional[str]:
    if key in _runtime_settings:
        return _runtime_settings[key]
    return default


def set_runtime_setting(key: str, value: Optional[str]) -> None:
    _runtime_settings[key] = value or ""


def set_runtime_settings(values: dict[str, Optional[str]]) -> None:
    for key, value in values.items():
        set_runtime_setting(key, value)


async def load_runtime_settings(db: AsyncSession) -> None:
    result = await db.execute(
        select(SystemSetting).where(SystemSetting.key.in_(WECHAT_PAY_SETTING_KEYS))
    )
    settings = result.scalars().all()
    for item in settings:
        _runtime_settings[item.key] = item.value or ""


async def get_settings_by_category(db: AsyncSession, category: str) -> list[SystemSetting]:
    result = await db.execute(
        select(SystemSetting)
        .where(SystemSetting.category == category)
        .order_by(SystemSetting.key.asc())
    )
    return list(result.scalars().all())


async def upsert_system_setting(
    db: AsyncSession,
    *,
    key: str,
    value: Optional[str],
    category: str,
    is_secret: bool,
    description: Optional[str] = None,
) -> SystemSetting:
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
    item = result.scalar_one_or_none()
    if item is None:
        item = SystemSetting(
            key=key,
            value=value or "",
            category=category,
            is_secret=is_secret,
            description=description,
        )
        db.add(item)
    else:
        item.value = value or ""
        item.category = category
        item.is_secret = is_secret
        if description is not None:
            item.description = description
    await db.flush()
    set_runtime_setting(key, value)
    return item
