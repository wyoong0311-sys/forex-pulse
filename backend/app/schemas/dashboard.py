from datetime import datetime

from pydantic import BaseModel


class DashboardPair(BaseModel):
    symbol: str
    price: float
    change: float
    confidence: float
    source: str
    captured_at: datetime
    is_stale: bool
    forecast_label: str | None = None
    forecast: float | None = None


class DashboardHighlight(BaseModel):
    label: str
    value: str
    tone: str = "neutral"


class DashboardNotification(BaseModel):
    id: int
    message: str
    sent_at: datetime


class HomeDashboardResponse(BaseModel):
    generated_at: datetime
    updated_minutes_ago: int
    is_stale: bool
    pairs: list[DashboardPair]
    highlights: list[DashboardHighlight]
    strongest_mover: str | None = None
    weakest_mover: str | None = None
    highest_volatility: str | None = None
    best_confidence: str | None = None
    daily_ai_summary: str
    notifications_preview: list[DashboardNotification]
    alerts_active_count: int


class PairDashboardRate(BaseModel):
    symbol: str
    close: float
    source: str
    captured_at: datetime


class PairDashboardPrediction(BaseModel):
    model_name: str
    direction: str
    confidence_score: float
    predicted_close: float
    lower_bound: float
    upper_bound: float
    forecast_target_time: datetime
    expected_move_pct: float


class PairDashboardPerformance(BaseModel):
    model_name: str | None = None
    mae: float | None = None
    directional_accuracy: float | None = None
    baseline_mae: float | None = None
    samples_used: int | None = None


class PairDashboardTrust(BaseModel):
    beat_baseline_count: int
    total_runs: int
    directional_accuracy: float | None = None
    confidence_delta: float | None = None


class PairDashboardAlertPreview(BaseModel):
    id: int
    alert_type: str
    target_price: float | None = None


class PairDashboardResponse(BaseModel):
    symbol: str
    range: str
    generated_at: datetime
    updated_minutes_ago: int
    is_stale: bool
    latest_rate: PairDashboardRate
    history: list[PairDashboardRate]
    prediction: PairDashboardPrediction
    performance: PairDashboardPerformance
    trust: PairDashboardTrust
    alerts_active_count: int
    alerts_preview: list[PairDashboardAlertPreview]
