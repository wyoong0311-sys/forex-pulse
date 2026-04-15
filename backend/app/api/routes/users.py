from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.users import (
    AuthStubResponse,
    DailySummaryResponse,
    UserPreferenceRead,
    UserPreferenceUpdate,
    WatchlistItemCreate,
    WatchlistItemRead,
    WatchlistResponse,
)
from app.services.insights import insights_service
from app.services.user_preferences import user_preference_service


router = APIRouter()


def _watchlist_item(item) -> WatchlistItemRead:
    return WatchlistItemRead(
        id=item.id,
        user_id=item.user_id,
        symbol=item.symbol,
        display_order=item.display_order,
        created_at=item.created_at,
    )


def _preference(preference) -> UserPreferenceRead:
    return UserPreferenceRead(
        user_id=preference.user_id,
        refresh_interval_seconds=preference.refresh_interval_seconds,
        notifications_enabled=preference.notifications_enabled,
        price_alerts_enabled=preference.price_alerts_enabled,
        forecast_alerts_enabled=preference.forecast_alerts_enabled,
        daily_summary_enabled=preference.daily_summary_enabled,
        daily_summary_time=preference.daily_summary_time,
        timezone=preference.timezone,
        theme=preference.theme,
        updated_at=preference.updated_at,
    )


@router.get("/auth/session", response_model=AuthStubResponse)
async def auth_session_stub() -> AuthStubResponse:
    return AuthStubResponse(
        user_id=1,
        mode="local-stub",
        message="Authentication-ready stub. Replace with JWT/session auth before multi-user production.",
    )


@router.get("/watchlist/{user_id}", response_model=WatchlistResponse)
async def get_watchlist(user_id: int, db: Session = Depends(get_db)) -> WatchlistResponse:
    items = user_preference_service.watchlist(db, user_id)
    return WatchlistResponse(user_id=user_id, items=[_watchlist_item(item) for item in items])


@router.post("/watchlist", response_model=WatchlistItemRead)
async def create_watchlist_item(payload: WatchlistItemCreate, db: Session = Depends(get_db)) -> WatchlistItemRead:
    try:
        item = user_preference_service.add_watchlist_item(
            db,
            payload.user_id,
            payload.symbol,
            payload.display_order,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    return _watchlist_item(item)


@router.delete("/watchlist/{item_id}")
async def delete_watchlist_item(item_id: int, db: Session = Depends(get_db)) -> dict[str, bool]:
    deleted = user_preference_service.delete_watchlist_item(db, item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Watchlist item not found.")
    return {"ok": True}


@router.get("/preferences/{user_id}", response_model=UserPreferenceRead)
async def get_preferences(user_id: int, db: Session = Depends(get_db)) -> UserPreferenceRead:
    return _preference(user_preference_service.preferences(db, user_id))


@router.patch("/preferences/{user_id}", response_model=UserPreferenceRead)
async def update_preferences(
    user_id: int,
    payload: UserPreferenceUpdate,
    db: Session = Depends(get_db),
) -> UserPreferenceRead:
    preference = user_preference_service.update_preferences(
        db,
        user_id,
        payload.model_dump(exclude_unset=True),
    )
    return _preference(preference)


@router.get("/summary/daily/{user_id}", response_model=DailySummaryResponse)
async def get_daily_summary_payload(user_id: int, db: Session = Depends(get_db)) -> DailySummaryResponse:
    preference = user_preference_service.preferences(db, user_id)
    symbols = [item.symbol for item in user_preference_service.watchlist(db, user_id)]
    strongest, weakest = insights_service.top_movers(db, symbols)
    return DailySummaryResponse(
        user_id=user_id,
        summary_time=preference.daily_summary_time,
        timezone=preference.timezone,
        watchlist=symbols,
        top_movers=[item.model_dump() for item in [*strongest[:2], *weakest[:2]]],
        volatility=[item.model_dump() for item in insights_service.volatility(db, symbols)],
        forecast_summary=[item.model_dump() for item in insights_service.forecast_summary(db, symbols)],
        model_rankings=[item.model_dump() for item in insights_service.model_rankings(db) if item.symbol in symbols and item.rank == 1],
    )
