from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from threading import Lock
from typing import Any


@dataclass
class CacheEntry:
    value: Any
    expires_at: datetime
    stale_until: datetime


class ResponseCache:
    def __init__(self) -> None:
        self._entries: dict[str, CacheEntry] = {}
        self._lock = Lock()

    def get(self, key: str) -> Any | None:
        now = datetime.now(timezone.utc)
        with self._lock:
            entry = self._entries.get(key)
            if entry is None:
                return None
            if entry.expires_at > now:
                return entry.value
            return None

    def get_stale(self, key: str) -> Any | None:
        now = datetime.now(timezone.utc)
        with self._lock:
            entry = self._entries.get(key)
            if entry is None:
                return None
            if entry.stale_until > now:
                return entry.value
            self._entries.pop(key, None)
            return None

    def set(self, key: str, value: Any, ttl_seconds: int, stale_ttl_seconds: int | None = None) -> Any:
        now = datetime.now(timezone.utc)
        effective_stale_ttl = stale_ttl_seconds if stale_ttl_seconds is not None else max(ttl_seconds * 2, ttl_seconds)
        entry = CacheEntry(
            value=value,
            expires_at=now + timedelta(seconds=ttl_seconds),
            stale_until=now + timedelta(seconds=effective_stale_ttl),
        )
        with self._lock:
            self._entries[key] = entry
        return value

    def invalidate_prefix(self, prefix: str) -> None:
        with self._lock:
            keys = [key for key in self._entries.keys() if key.startswith(prefix)]
            for key in keys:
                self._entries.pop(key, None)


response_cache = ResponseCache()
