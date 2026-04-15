from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.schemas.rates import HistoryResponse, LatestRatesResponse, RateRead
from app.services.market_data import MarketDataError, RatePoint, market_data_service
from app.services.rate_repository import rate_repository


router = APIRouter()

SUPPORTED_SYMBOLS = {"USDMYR", "EURUSD", "GBPUSD", "USDJPY"}
MOCK_CLOSES = {
    "USDMYR": 4.7362,
    "EURUSD": 1.0864,
    "GBPUSD": 1.2741,
    "USDJPY": 152.34,
}


def _split_symbol(symbol: str) -> tuple[str, str]:
    normalized = symbol.replace("/", "").upper()
    if len(normalized) != 6:
        raise HTTPException(status_code=400, detail="Use symbols like USDMYR or EURUSD.")
    if normalized not in SUPPORTED_SYMBOLS:
        raise HTTPException(status_code=400, detail=f"{normalized} is not enabled yet.")
    return normalized[:3], normalized[3:]


def _days_for_range(range_value: str) -> int:
    return {"7d": 7, "30d": 30, "90d": 90, "1y": 365}.get(range_value.lower(), 30)


def _read(rate) -> RateRead:
    return RateRead(
        symbol=rate.symbol,
        close=rate.close,
        source=rate.source,
        captured_at=rate.captured_at,
    )


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


async def _fetch_and_store_latest(db: Session, symbol: str) -> bool:
    base, quote = _split_symbol(symbol)
    try:
        point = await market_data_service.get_latest_point(base, quote)
        rate_repository.save_points(db, [point])
        return False
    except MarketDataError:
        if not settings.mock_data_enabled:
            raise
        rate_repository.save_points(db, _mock_points(symbol, 1)[-1:])
        return True


async def _fetch_and_store_history(db: Session, symbol: str, days: int) -> bool:
    base, quote = _split_symbol(symbol)
    try:
        points = await market_data_service.get_history_points(base, quote, days)
        rate_repository.save_points(db, points)
        return False
    except MarketDataError:
        if not settings.mock_data_enabled:
            raise
        rate_repository.save_points(db, _mock_points(symbol, days))
        return True


@router.get("/rates/latest", response_model=LatestRatesResponse)
async def get_latest_rates(
    symbols: str = Query(default="USDMYR,EURUSD,GBPUSD,USDJPY"),
    db: Session = Depends(get_db),
) -> LatestRatesResponse:
    rate_items: list[RateRead] = []

    for symbol in [item.strip().replace("/", "").upper() for item in symbols.split(",") if item.strip()]:
        fallback_used = await _fetch_and_store_latest(db, symbol)
        latest = rate_repository.latest_for_symbol(db, symbol)
        if latest is None:
            raise HTTPException(status_code=502, detail=f"No rate available for {symbol}")
        rate_items.append(_read(latest))

    return LatestRatesResponse(rates=rate_items)


@router.get("/rates/history/{symbol}", response_model=HistoryResponse)
async def get_rate_history(symbol: str, range: str = "30d", db: Session = Depends(get_db)) -> HistoryResponse:
    normalized = symbol.replace("/", "").upper()
    _split_symbol(normalized)
    days = _days_for_range(range)
    fallback_used = await _fetch_and_store_history(db, normalized, days)
    rates = rate_repository.history_for_symbol(db, normalized, days)

    if not rates:
        raise HTTPException(status_code=502, detail=f"No history available for {normalized}")

    return HistoryResponse(
        symbol=normalized,
        range=range,
        actual=[_read(rate) for rate in rates],
        fallback_used=fallback_used,
    )
