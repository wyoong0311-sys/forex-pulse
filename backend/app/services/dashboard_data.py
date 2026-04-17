from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import Rate
from app.services.market_data import MarketDataError, RatePoint, market_data_service
from app.services.rate_repository import rate_repository


SUPPORTED_SYMBOLS = {"USDMYR", "EURUSD", "GBPUSD", "USDJPY"}
MOCK_CLOSES = {
    "USDMYR": 4.7362,
    "EURUSD": 1.0864,
    "GBPUSD": 1.2741,
    "USDJPY": 152.34,
}


def normalize_symbol(symbol: str) -> str:
    normalized = symbol.replace("/", "").upper()
    if len(normalized) != 6:
        raise HTTPException(status_code=400, detail="Use symbols like USDMYR or EURUSD.")
    if normalized not in SUPPORTED_SYMBOLS:
        raise HTTPException(status_code=400, detail=f"{normalized} is not enabled yet.")
    return normalized


def split_symbol(symbol: str) -> tuple[str, str]:
    normalized = normalize_symbol(symbol)
    return normalized[:3], normalized[3:]


def days_for_range(range_value: str) -> int:
    return {"7d": 7, "30d": 30, "90d": 90, "1y": 365}.get(range_value.lower(), 30)


def updated_minutes_ago(captured_at: datetime) -> int:
    now = datetime.now(timezone.utc)
    timestamp = captured_at if captured_at.tzinfo else captured_at.replace(tzinfo=timezone.utc)
    delta = now - timestamp
    return max(0, int(delta.total_seconds() // 60))


def is_stale(captured_at: datetime, max_age_minutes: int | None = None) -> bool:
    threshold = max_age_minutes if max_age_minutes is not None else settings.stale_data_minutes
    return updated_minutes_ago(captured_at) > threshold


def _mock_points(symbol: str, days: int) -> list[RatePoint]:
    base = MOCK_CLOSES.get(symbol, 1.0)
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    points: list[RatePoint] = []
    for offset in range(days, -1, -1):
        captured_at = today - timedelta(days=offset)
        if captured_at.weekday() >= 5:
            continue
        wave = ((days - offset) % 5 - 2) * base * 0.0015
        points.append(
            RatePoint(
                symbol=symbol,
                close=round(base + wave, 5),
                captured_at=captured_at,
                source="mock-fallback",
            )
        )
    return points


async def ensure_latest_rate(db: Session, symbol: str) -> tuple[Rate, bool]:
    normalized = normalize_symbol(symbol)
    latest = rate_repository.latest_for_symbol(db, normalized)
    if latest and updated_minutes_ago(latest.captured_at) <= max(1, settings.latest_rates_cache_ttl_seconds // 60):
        return latest, False

    base, quote = split_symbol(normalized)
    try:
        point = await market_data_service.get_latest_point(base, quote)
        rate_repository.save_points(db, [point])
    except MarketDataError:
        if not settings.mock_data_enabled:
            raise
        rate_repository.save_points(db, _mock_points(normalized, 1)[-1:])
    latest = rate_repository.latest_for_symbol(db, normalized)
    if latest is None:
        raise HTTPException(status_code=502, detail=f"No rate available for {normalized}")
    return latest, latest.source.startswith("mock")


async def ensure_history_rates(db: Session, symbol: str, days: int) -> tuple[list[Rate], bool]:
    normalized = normalize_symbol(symbol)
    history = rate_repository.history_for_symbol(db, normalized, days)
    has_recent = bool(history and updated_minutes_ago(history[-1].captured_at) <= settings.history_rates_cache_ttl_seconds // 60)
    if has_recent and len(history) >= min(7, days):
        return history, False

    base, quote = split_symbol(normalized)
    try:
        points = await market_data_service.get_history_points(base, quote, days)
        rate_repository.save_points(db, points)
    except MarketDataError:
        if not settings.mock_data_enabled:
            raise
        rate_repository.save_points(db, _mock_points(normalized, days))
    history = rate_repository.history_for_symbol(db, normalized, days)
    return history, any(rate.source.startswith("mock") for rate in history)


def downsample_rates(rates: list[Rate], max_points: int) -> list[Rate]:
    if len(rates) <= max_points or max_points <= 0:
        return rates
    step = (len(rates) - 1) / float(max_points - 1)
    indices = {int(round(step * idx)) for idx in range(max_points)}
    selected = [rates[idx] for idx in sorted(indices)]
    if selected[0] is not rates[0]:
        selected.insert(0, rates[0])
    if selected[-1] is not rates[-1]:
        selected.append(rates[-1])
    return selected
