from datetime import datetime

from pydantic import BaseModel


class BacktestRequest(BaseModel):
  symbol: str
  lookback_days: int = 90


class BacktestResponse(BaseModel):
  symbol: str
  model_name: str
  mae: float
  rmse: float
  mape: float
  directional_accuracy: float
  samples_used: int
  beats_baseline: bool = False
  notes: str
  created_at: datetime | None = None


class PerformanceResponse(BaseModel):
  symbol: str
  latest: BacktestResponse | None
  comparisons: list[BacktestResponse]
  last_7_predictions: list[dict]


class PerformanceSummaryResponse(BaseModel):
  results: list[BacktestResponse]
