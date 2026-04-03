"""In-memory presence tracking for authenticated users."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Dict, Iterable, List


class PresenceManager:
    def __init__(self, ttl_seconds: int = 90):
        self.ttl = timedelta(seconds=ttl_seconds)
        self._last_seen: Dict[str, datetime] = {}

    def _now(self) -> datetime:
        return datetime.now(timezone.utc)

    def _purge_expired(self) -> None:
        cutoff = self._now() - self.ttl
        expired = [
            user_id
            for user_id, seen_at in self._last_seen.items()
            if seen_at < cutoff
        ]
        for user_id in expired:
            self._last_seen.pop(user_id, None)

    def heartbeat(self, user_id: str) -> None:
        self._purge_expired()
        self._last_seen[user_id] = self._now()

    def mark_offline(self, user_id: str) -> None:
        self._last_seen.pop(user_id, None)

    def get_online_user_ids(self, user_ids: Iterable[str]) -> List[str]:
        self._purge_expired()
        return [user_id for user_id in user_ids if user_id in self._last_seen]


presence_manager = PresenceManager()
