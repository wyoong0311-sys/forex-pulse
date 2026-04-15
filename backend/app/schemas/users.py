from datetime import datetime

from pydantic import BaseModel, Field


class AuthStubResponse(BaseModel):
    user_id: int
    mode: str
    message: str


class WatchlistItemCreate(BaseModel):
    user_id: int = 1
    symbol: str
    display_order: int = 0


class WatchlistItemRead(BaseModel):
    id: int
    user_id: int
    symbol: str
    display_order: int
    created_at: datetime


class WatchlistResponse(BaseModel):
    user_id: int
    items: list[WatchlistItemRead]


class UserPreferenceRead(BaseModel):
    user_id: int
    refresh_interval_seconds: int
    notifications_enabled: bool
    price_alerts_enabled: bool
    forecast_alerts_enabled: bool
    daily_summary_enabled: bool
    daily_summary_time: str
    timezone: str
    theme: str
    updated_at: datetime


class UserPreferenceUpdate(BaseModel):
    refresh_interval_seconds: int | None = Field(default=None, ge=30, le=86400)
    notifications_enabled: bool | None = None
    price_alerts_enabled: bool | None = None
    forecast_alerts_enabled: bool | None = None
    daily_summary_enabled: bool | None = None
    daily_summary_time: str | None = None
    timezone: str | None = None
    theme: str | None = None


class DailySummaryResponse(BaseModel):
    user_id: int
    summary_time: str
    timezone: str
    watchlist: list[str]
    top_movers: list[dict]
    volatility: list[dict]
    forecast_summary: list[dict]
    model_rankings: list[dict]
