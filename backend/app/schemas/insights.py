from datetime import datetime

from pydantic import BaseModel


class VolatilityInsight(BaseModel):
    symbol: str
    regime: str
    recent_volatility_pct: float
    baseline_volatility_pct: float
    spike: bool


class MoverInsight(BaseModel):
    symbol: str
    latest_close: float
    previous_close: float
    change_pct: float


class ModelRankingInsight(BaseModel):
    symbol: str
    model_name: str
    rank: int
    score: float
    mae: float
    rmse: float
    mape: float
    directional_accuracy: float
    samples_used: int
    beats_baseline: bool


class ForecastSummaryInsight(BaseModel):
    symbol: str
    model_name: str
    direction: str
    predicted_close: float
    lower_bound: float
    upper_bound: float
    raw_confidence: float
    performance_adjusted_confidence: float
    forecast_target_time: datetime
    volatility_regime: str


class VolatilityResponse(BaseModel):
    results: list[VolatilityInsight]


class TopMoversResponse(BaseModel):
    strongest: list[MoverInsight]
    weakest: list[MoverInsight]


class ModelRankingsResponse(BaseModel):
    results: list[ModelRankingInsight]


class ForecastSummaryResponse(BaseModel):
    results: list[ForecastSummaryInsight]
