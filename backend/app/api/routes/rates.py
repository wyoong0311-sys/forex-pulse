import asyncio

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal, get_db
from app.schemas.rates import HistoryResponse, LatestRatesResponse, RateRead
from app.services.dashboard_data import days_for_range, ensure_history_rates, ensure_latest_rate, normalize_symbol
from app.services.response_cache import response_cache


router = APIRouter()


def _read(rate) -> RateRead:
    return RateRead(
        symbol=rate.symbol,
        close=rate.close,
        source=rate.source,
        captured_at=rate.captured_at,
    )


def _normalize_symbols(symbols: str) -> list[str]:
    return [normalize_symbol(item.strip()) for item in symbols.split(",") if item.strip()]


async def _build_latest_response(db: Session, normalized_symbols: list[str]) -> LatestRatesResponse:
    rates: list[RateRead] = []
    for symbol in normalized_symbols:
        latest, _ = await ensure_latest_rate(db, symbol)
        rates.append(_read(latest))
    return LatestRatesResponse(rates=rates)


async def _build_history_response(db: Session, symbol: str, range_value: str) -> HistoryResponse:
    normalized = normalize_symbol(symbol)
    days = days_for_range(range_value)
    rates, fallback_used = await ensure_history_rates(db, normalized, days)
    return HistoryResponse(
        symbol=normalized,
        range=range_value,
        actual=[_read(rate) for rate in rates],
        fallback_used=fallback_used,
    )


def _refresh_latest_cache_task(cache_key: str, symbols: list[str]) -> None:
    db = SessionLocal()
    try:
        payload = asyncio.run(_build_latest_response(db, symbols))
        response_cache.set(
            cache_key,
            payload,
            ttl_seconds=settings.latest_rates_cache_ttl_seconds,
            stale_ttl_seconds=settings.latest_rates_cache_stale_ttl_seconds,
        )
    finally:
        db.close()


def _refresh_history_cache_task(cache_key: str, symbol: str, range_value: str) -> None:
    db = SessionLocal()
    try:
        payload = asyncio.run(_build_history_response(db, symbol, range_value))
        response_cache.set(
            cache_key,
            payload,
            ttl_seconds=settings.history_rates_cache_ttl_seconds,
            stale_ttl_seconds=settings.history_rates_cache_stale_ttl_seconds,
        )
    finally:
        db.close()


@router.get("/rates/latest", response_model=LatestRatesResponse)
async def get_latest_rates(
    background_tasks: BackgroundTasks,
    symbols: str = Query(default="USDMYR,EURUSD,GBPUSD,USDJPY"),
    db: Session = Depends(get_db),
) -> LatestRatesResponse:
    normalized_symbols = _normalize_symbols(symbols)
    cache_key = f"rates:latest:{','.join(normalized_symbols)}"
    cached = response_cache.get(cache_key)
    if cached:
        return cached

    stale = response_cache.get_stale(cache_key)
    if stale:
        background_tasks.add_task(_refresh_latest_cache_task, cache_key, normalized_symbols)
        return stale

    payload = await _build_latest_response(db, normalized_symbols)
    return response_cache.set(
        cache_key,
        payload,
        ttl_seconds=settings.latest_rates_cache_ttl_seconds,
        stale_ttl_seconds=settings.latest_rates_cache_stale_ttl_seconds,
    )


@router.get("/rates/history/{symbol}", response_model=HistoryResponse)
async def get_rate_history(
    symbol: str,
    background_tasks: BackgroundTasks,
    range: str = "30d",
    db: Session = Depends(get_db),
) -> HistoryResponse:
    normalized = normalize_symbol(symbol)
    cache_key = f"rates:history:{normalized}:{range.lower()}"
    cached = response_cache.get(cache_key)
    if cached:
        return cached

    stale = response_cache.get_stale(cache_key)
    if stale:
        background_tasks.add_task(_refresh_history_cache_task, cache_key, normalized, range)
        return stale

    payload = await _build_history_response(db, normalized, range)
    return response_cache.set(
        cache_key,
        payload,
        ttl_seconds=settings.history_rates_cache_ttl_seconds,
        stale_ttl_seconds=settings.history_rates_cache_stale_ttl_seconds,
    )
