from datetime import datetime

from pydantic import BaseModel


class PredictionResponse(BaseModel):
  symbol: str
  prediction_time: datetime
  forecast_target_time: datetime
  predicted_close: float
  lower_bound: float
  upper_bound: float
  confidence_score: float
  direction: str
  model_name: str

  # Backward-compatible mobile aliases while the app transitions to the Phase 4 shape.
  pair: str
  confidence: float
  projected_high: float
  projected_low: float
  predicted_next_close: float
  expected_move_pct: float
  model_version: str


class PredictionHistoryResponse(BaseModel):
  symbol: str
  predictions: list[PredictionResponse]
