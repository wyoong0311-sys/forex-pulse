from dataclasses import dataclass

import numpy as np


@dataclass
class ForecastResult:
  direction: str
  confidence: float
  expected_move_pct: float
  projected_high: float
  projected_low: float
  path: list[float]
  model_version: str


class ForecastingService:
  def predict(self, history: list[float]) -> ForecastResult:
    if len(history) < 5:
      last = history[-1] if history else 1.0
      return ForecastResult(
        direction="Neutral",
        confidence=0.5,
        expected_move_pct=0.0,
        projected_high=last,
        projected_low=last,
        path=[last],
        model_version="baseline-v1",
      )

    xs = np.arange(len(history))
    ys = np.array(history)
    slope, intercept = np.polyfit(xs, ys, 1)
    next_xs = np.arange(len(history), len(history) + 5)
    path = (slope * next_xs + intercept).round(5).tolist()
    last = history[-1]
    projected_last = path[-1]
    expected_move_pct = round(((projected_last - last) / last) * 100, 3)
    confidence = min(0.85, max(0.45, abs(expected_move_pct) / 1.8))
    direction = "Bullish" if projected_last > last else "Bearish"

    return ForecastResult(
      direction=direction,
      confidence=round(confidence, 2),
      expected_move_pct=expected_move_pct,
      projected_high=max(path),
      projected_low=min(path),
      path=path,
      model_version="baseline-trend-v1",
    )


forecasting_service = ForecastingService()
