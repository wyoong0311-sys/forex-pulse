from __future__ import annotations

import asyncio
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import Alert, AlertLog, WatchlistItem
from app.db.session import SessionLocal, get_db
from app.schemas.dashboard import (
    PairDashboardAlertPreview,
    DashboardHighlight,
    DashboardNotification,
    DashboardPair,
    HomeDashboardResponse,
    PairDashboardPerformance,
    PairDashboardPrediction,
    PairDashboardRate,
    PairDashboardResponse,
    PairDashboardTrust,
)
from app.schemas.pairs import DashboardResponse, Highlight, PairOverview
from app.services.backtesting import backtesting_service
from app.services.dashboard_data import (
    days_for_range,
    downsample_rates,
    ensure_history_rates,
    ensure_latest_rate,
    is_stale,
    normalize_symbol,
    updated_minutes_ago,
)
from app.services.insights import WATCHLIST as DEFAULT_SYMBOLS
from app.services.insights import insights_service
from app.services.prediction_service import prediction_service
from app.services.rate_repository import rate_repository
from app.services.response_cache import response_cache


router = APIRouter()


def _watchlist_symbols(db: Session, user_id: int) -> list[str]:
    items = list(
        db.scalars(
            select(WatchlistItem)
            .where(WatchlistItem.user_id == user_id)
            .order_by(WatchlistItem.display_order.asc(), WatchlistItem.id.asc())
        )
    )
    symbols = [item.symbol.replace("/", "").upper() for item in items if item.symbol]
    if not symbols:
        symbols = list(DEFAULT_SYMBOLS)
    return [normalize_symbol(symbol) for symbol in symbols[:8]]


def _history_change_pct(db: Session, symbol: str) -> float:
    rows = rate_repository.history_for_symbol(db, symbol, 5)
    if len(rows) < 2:
        return 0.0
    previous = rows[-2].close
    current = rows[-1].close
    if not previous:
        return 0.0
    return round(((current - previous) / previous) * 100, 4)


def _format_symbol(symbol: str) -> str:
    return f"{symbol[:3]}/{symbol[3:]}"


async def _build_home_dashboard(db: Session, user_id: int) -> HomeDashboardResponse:
    symbols = _watchlist_symbols(db, user_id)
    forecast_by_symbol = {
        item.symbol: item
        for item in insights_service.forecast_summary(db, symbols)
    }
    latest_rows = []
    for symbol in symbols:
        latest, _ = await ensure_latest_rate(db, symbol)
        latest_rows.append(latest)

    strongest, weakest = insights_service.top_movers(db, symbols)
    volatility = insights_service.volatility(db, symbols)
    top_volatility = next((item for item in volatility if item.spike), volatility[0] if volatility else None)
    best_confidence = sorted(
        forecast_by_symbol.values(),
        key=lambda item: item.performance_adjusted_confidence,
        reverse=True,
    )
    best_confidence_item = best_confidence[0] if best_confidence else None

    notifications = list(
        db.scalars(
            select(AlertLog)
            .join(Alert, Alert.id == AlertLog.alert_id)
            .where(Alert.user_id == user_id)
            .order_by(AlertLog.sent_at.desc(), AlertLog.id.desc())
            .limit(3)
        )
    )
    active_alert_count = len(
        list(
            db.scalars(
                select(Alert).where(Alert.user_id == user_id, Alert.is_active.is_(True))
            )
        )
    )

    pairs = []
    ages = []
    for latest in latest_rows:
        forecast = forecast_by_symbol.get(latest.symbol)
        age = updated_minutes_ago(latest.captured_at)
        ages.append(age)
        pairs.append(
            DashboardPair(
                symbol=_format_symbol(latest.symbol),
                price=latest.close,
                change=_history_change_pct(db, latest.symbol),
                confidence=forecast.performance_adjusted_confidence if forecast else 0.0,
                source=latest.source,
                captured_at=latest.captured_at,
                is_stale=is_stale(latest.captured_at),
                forecast_label=f"{forecast.direction} | {forecast.volatility_regime}" if forecast else None,
                forecast=forecast.predicted_close if forecast else None,
            )
        )

    highlights = [
        DashboardHighlight(label="Rate source", value=latest_rows[0].source if latest_rows else "backend", tone="up"),
        DashboardHighlight(label="Tracked pairs", value=str(len(pairs)), tone="neutral"),
        DashboardHighlight(label="Prediction", value="Ranked", tone="forecast"),
        DashboardHighlight(
            label="Fallback",
            value="Used" if any(row.source.startswith("mock") for row in latest_rows) else "Off",
            tone="warning" if any(row.source.startswith("mock") for row in latest_rows) else "up",
        ),
    ]

    summary_symbol = _format_symbol(best_confidence_item.symbol) if best_confidence_item else "Watchlist"
    summary_direction = best_confidence_item.direction if best_confidence_item else "sideways"
    summary_regime = best_confidence_item.volatility_regime if best_confidence_item else "unknown"
    summary_text = (
        f"{summary_symbol} remains {summary_direction} with {summary_regime} volatility. "
        "Confidence is adjusted from recent model performance and is not certainty."
    )

    return HomeDashboardResponse(
        generated_at=datetime.utcnow(),
        updated_minutes_ago=min(ages) if ages else 0,
        is_stale=any(is_stale(row.captured_at) for row in latest_rows),
        pairs=pairs,
        highlights=highlights,
        strongest_mover=_format_symbol(strongest[0].symbol) if strongest else None,
        weakest_mover=_format_symbol(weakest[0].symbol) if weakest else None,
        highest_volatility=_format_symbol(top_volatility.symbol) if top_volatility else None,
        best_confidence=_format_symbol(best_confidence_item.symbol) if best_confidence_item else None,
        daily_ai_summary=summary_text,
        notifications_preview=[
            DashboardNotification(id=row.id, message=row.message, sent_at=row.sent_at) for row in notifications
        ],
        alerts_active_count=active_alert_count,
    )


async def _build_pair_dashboard(db: Session, symbol: str, range_value: str, user_id: int) -> PairDashboardResponse:
    normalized = normalize_symbol(symbol)
    days = days_for_range(range_value)
    latest, _ = await ensure_latest_rate(db, normalized)
    history, _ = await ensure_history_rates(db, normalized, days)
    max_points = {"7d": 60, "30d": 120, "90d": 90, "1y": 120}.get(range_value.lower(), 120)
    sampled_history = downsample_rates(history, max_points)

    prediction = prediction_service.latest(db, normalized)
    if prediction is None:
        prediction = prediction_service.generate_for_symbol(db, normalized)

    performance = backtesting_service.performance(db, normalized)
    baseline = sorted(
        [row for row in performance.comparisons if "baseline" in row.model_name and row.samples_used > 0],
        key=lambda row: row.mae,
    )
    baseline_row = baseline[0] if baseline else None
    latest_row = performance.latest
    trust_rows = [row for row in performance.comparisons if row.samples_used > 0]
    confidence_delta = (prediction.confidence_score * 100) - 50 if prediction.confidence_score is not None else None
    active_alerts = list(
        db.scalars(
            select(Alert).where(
                Alert.user_id == user_id,
                Alert.is_active.is_(True),
                Alert.symbol == normalized,
            )
        )
    )

    expected_move_pct = 0.0
    if latest.close:
        expected_move_pct = round(((prediction.predicted_close - latest.close) / latest.close) * 100, 4)

    return PairDashboardResponse(
        symbol=normalized,
        range=range_value,
        generated_at=datetime.utcnow(),
        updated_minutes_ago=updated_minutes_ago(latest.captured_at),
        is_stale=is_stale(latest.captured_at),
        latest_rate=PairDashboardRate(
            symbol=normalized,
            close=latest.close,
            source=latest.source,
            captured_at=latest.captured_at,
        ),
        history=[
            PairDashboardRate(
                symbol=normalized,
                close=row.close,
                source=row.source,
                captured_at=row.captured_at,
            )
            for row in sampled_history
        ],
        prediction=PairDashboardPrediction(
            model_name=prediction.model_name,
            direction=prediction.direction,
            confidence_score=prediction.confidence_score,
            predicted_close=prediction.predicted_close,
            lower_bound=prediction.lower_bound,
            upper_bound=prediction.upper_bound,
            forecast_target_time=prediction.forecast_target_time,
            expected_move_pct=expected_move_pct,
        ),
        performance=PairDashboardPerformance(
            model_name=latest_row.model_name if latest_row else None,
            mae=latest_row.mae if latest_row else None,
            directional_accuracy=latest_row.directional_accuracy if latest_row else None,
            baseline_mae=baseline_row.mae if baseline_row else None,
            samples_used=latest_row.samples_used if latest_row else None,
        ),
        trust=PairDashboardTrust(
            beat_baseline_count=len([row for row in trust_rows if row.beats_baseline]),
            total_runs=len(trust_rows),
            directional_accuracy=latest_row.directional_accuracy if latest_row else None,
            confidence_delta=confidence_delta,
        ),
        alerts_active_count=len(active_alerts),
        alerts_preview=[
            PairDashboardAlertPreview(
                id=alert.id,
                alert_type=alert.alert_type,
                target_price=alert.target_price,
            )
            for alert in active_alerts[:3]
        ],
    )


def _refresh_home_dashboard_task(cache_key: str, user_id: int) -> None:
    db = SessionLocal()
    try:
        payload = asyncio.run(_build_home_dashboard(db, user_id))
        response_cache.set(
            cache_key,
            payload,
            ttl_seconds=settings.dashboard_cache_ttl_seconds,
            stale_ttl_seconds=settings.dashboard_cache_stale_ttl_seconds,
        )
    finally:
        db.close()


def _refresh_pair_dashboard_task(cache_key: str, symbol: str, range_value: str, user_id: int) -> None:
    db = SessionLocal()
    try:
        payload = asyncio.run(_build_pair_dashboard(db, symbol, range_value, user_id))
        response_cache.set(
            cache_key,
            payload,
            ttl_seconds=settings.dashboard_cache_ttl_seconds,
            stale_ttl_seconds=settings.dashboard_cache_stale_ttl_seconds,
        )
    finally:
        db.close()


@router.get("/dashboard/home", response_model=HomeDashboardResponse)
async def get_home_dashboard(
    background_tasks: BackgroundTasks,
    user_id: int = Query(default=1, ge=1),
    db: Session = Depends(get_db),
) -> HomeDashboardResponse:
    cache_key = f"dashboard:home:{user_id}"
    cached = response_cache.get(cache_key)
    if cached:
        return cached

    stale = response_cache.get_stale(cache_key)
    if stale:
        background_tasks.add_task(_refresh_home_dashboard_task, cache_key, user_id)
        return stale

    payload = await _build_home_dashboard(db, user_id)
    return response_cache.set(
        cache_key,
        payload,
        ttl_seconds=settings.dashboard_cache_ttl_seconds,
        stale_ttl_seconds=settings.dashboard_cache_stale_ttl_seconds,
    )


@router.get("/dashboard/pair/{symbol}", response_model=PairDashboardResponse)
async def get_pair_dashboard(
    symbol: str,
    background_tasks: BackgroundTasks,
    range: str = Query(default="30d"),
    user_id: int = Query(default=1, ge=1),
    db: Session = Depends(get_db),
) -> PairDashboardResponse:
    normalized = normalize_symbol(symbol)
    cache_key = f"dashboard:pair:{normalized}:{range.lower()}:{user_id}"
    cached = response_cache.get(cache_key)
    if cached:
        return cached

    stale = response_cache.get_stale(cache_key)
    if stale:
        background_tasks.add_task(_refresh_pair_dashboard_task, cache_key, normalized, range, user_id)
        return stale

    payload = await _build_pair_dashboard(db, normalized, range, user_id)
    return response_cache.set(
        cache_key,
        payload,
        ttl_seconds=settings.dashboard_cache_ttl_seconds,
        stale_ttl_seconds=settings.dashboard_cache_stale_ttl_seconds,
    )


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard_legacy(db: Session = Depends(get_db)) -> DashboardResponse:
    payload = await _build_home_dashboard(db, user_id=1)
    return DashboardResponse(
        pairs=[
            PairOverview(
                symbol=item.symbol,
                price=item.price,
                change=item.change,
                confidence=item.confidence,
            )
            for item in payload.pairs
        ],
        highlights=[
            Highlight(label=item.label, value=item.value, tone=item.tone)
            for item in payload.highlights
        ],
    )
