from __future__ import annotations

from dataclasses import dataclass
from math import sqrt
from statistics import mean

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import BacktestResult, Prediction, Rate
from app.schemas.backtests import BacktestResponse, PerformanceResponse
from app.services.feature_engineering import build_feature_rows

try:
  import numpy as np
  import xgboost as xgb
except Exception:  # pragma: no cover - fallback keeps local scoring safe.
  np = None
  xgb = None


@dataclass(frozen=True)
class ScoredPrediction:
  predicted: float
  actual: float
  previous: float


class BacktestingService:
  def _rates(self, db: Session, symbol: str) -> list[Rate]:
    rates = list(
      db.scalars(
        select(Rate)
        .where(Rate.symbol == symbol.upper())
        .order_by(Rate.captured_at.asc(), Rate.id.asc())
      )
    )
    provider_rates = [rate for rate in rates if not rate.source.startswith("mock")]
    return provider_rates or rates

  def _prediction_rows(self, db: Session, symbol: str, model_name: str | None = None) -> list[Prediction]:
    query = (
      select(Prediction)
      .where(Prediction.symbol == symbol.upper())
      .order_by(Prediction.prediction_time.asc(), Prediction.id.asc())
    )
    if model_name:
      query = query.where(Prediction.model_name == model_name)
    return list(db.scalars(query))

  def _actual_for_prediction(self, rates: list[Rate], prediction: Prediction) -> tuple[float, float] | None:
    previous_rates = [rate for rate in rates if rate.captured_at <= prediction.prediction_time]
    target_rates = [rate for rate in rates if rate.captured_at >= prediction.forecast_target_time]

    if not previous_rates or not target_rates:
      return None

    return previous_rates[-1].close, target_rates[0].close

  def _score(self, symbol: str, model_name: str, scored: list[ScoredPrediction], notes: str) -> BacktestResponse:
    if not scored:
      return BacktestResponse(
        symbol=symbol,
        model_name=model_name,
        mae=0.0,
        rmse=0.0,
        mape=0.0,
        directional_accuracy=0.0,
        samples_used=0,
        beats_baseline=False,
        notes="No completed forecast/actual pairs available yet.",
      )

    absolute_errors = [abs(item.actual - item.predicted) for item in scored]
    squared_errors = [(item.actual - item.predicted) ** 2 for item in scored]
    percentage_errors = [
      abs((item.actual - item.predicted) / item.actual) * 100
      for item in scored
      if item.actual
    ]
    direction_hits = [
      (item.predicted >= item.previous) == (item.actual >= item.previous)
      for item in scored
    ]

    return BacktestResponse(
      symbol=symbol,
      model_name=model_name,
      mae=round(mean(absolute_errors), 6),
      rmse=round(sqrt(mean(squared_errors)), 6),
      mape=round(mean(percentage_errors), 4) if percentage_errors else 0.0,
      directional_accuracy=round((sum(direction_hits) / len(direction_hits)) * 100, 2),
      samples_used=len(scored),
      beats_baseline=False,
      notes=notes,
    )

  def _baseline_scores(self, symbol: str, rates: list[Rate]) -> list[BacktestResponse]:
    naive: list[ScoredPrediction] = []
    moving_average: list[ScoredPrediction] = []

    for index in range(5, len(rates) - 1):
      previous = rates[index].close
      actual = rates[index + 1].close
      naive.append(ScoredPrediction(predicted=previous, actual=actual, previous=previous))
      ma_prediction = mean([rate.close for rate in rates[index - 4:index + 1]])
      moving_average.append(ScoredPrediction(predicted=ma_prediction, actual=actual, previous=previous))

    return [
      self._score(symbol, "naive-previous-close-baseline-v1", naive, "Baseline scored from stored actual rates."),
      self._score(symbol, "moving-average-baseline-v1", moving_average, "Baseline scored from stored actual rates."),
    ]

  def _model_score(self, db: Session, symbol: str, rates: list[Rate], model_name: str) -> BacktestResponse:
    scored: list[ScoredPrediction] = []
    for prediction in self._prediction_rows(db, symbol, model_name):
      actual_pair = self._actual_for_prediction(rates, prediction)
      if not actual_pair:
        continue
      previous, actual = actual_pair
      scored.append(ScoredPrediction(predicted=prediction.predicted_close, actual=actual, previous=previous))

    return self._score(
      symbol,
      model_name,
      scored,
      "Model scored from persisted predictions matched against stored actual rates.",
    )

  def _xgboost_walk_forward_score(self, symbol: str, rates: list[Rate]) -> BacktestResponse:
    if xgb is None or np is None or len(rates) < 24:
      return self._score(
        symbol,
        "xgboost-features-v1",
        [],
        "XGBoost dependency or stored history is not sufficient for walk-forward scoring.",
      )

    rows = build_feature_rows([(rate.captured_at, rate.close) for rate in rates])
    scored: list[ScoredPrediction] = []

    for index in range(18, len(rows) - 1):
      training_rows = [row for row in rows[:index] if row.target is not None]
      current_row = rows[index]
      if not training_rows or current_row.target is None:
        continue

      x_train = np.array([row.features for row in training_rows], dtype=float)
      y_train = np.array([row.target for row in training_rows], dtype=float)
      train_matrix = xgb.DMatrix(x_train, label=y_train)
      predict_matrix = xgb.DMatrix(np.array([current_row.features], dtype=float))
      model = xgb.train(
        {
          "objective": "reg:squarederror",
          "max_depth": 3,
          "eta": 0.08,
          "seed": 42,
        },
        train_matrix,
        num_boost_round=50,
      )
      predicted = float(model.predict(predict_matrix)[0])
      scored.append(
        ScoredPrediction(
          predicted=predicted,
          actual=current_row.target,
          previous=current_row.close,
        )
      )

    return self._score(
      symbol,
      "xgboost-features-v1",
      scored,
      "XGBoost scored with historical walk-forward evaluation using stored rates.",
    )

  def _persist(self, db: Session, response: BacktestResponse, beats_baseline: bool) -> BacktestResult:
    row = BacktestResult(
      symbol=response.symbol,
      model_name=response.model_name,
      mae=response.mae,
      rmse=response.rmse,
      mape=response.mape,
      directional_accuracy=response.directional_accuracy,
      samples_used=response.samples_used,
      beats_baseline=beats_baseline,
      notes=response.notes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

  def run_for_symbol(self, db: Session, symbol: str) -> list[BacktestResponse]:
    normalized = symbol.replace("/", "").upper()
    rates = self._rates(db, normalized)
    if len(rates) < 7:
      response = self._score(normalized, "insufficient-data", [], "Need more stored rates before scoring.")
      self._persist(db, response, False)
      return [response]

    baseline_scores = self._baseline_scores(normalized, rates)
    baseline_model_names = {
      "naive-previous-close-baseline-v1",
      "moving-average-baseline-v1",
    }
    persisted_model_names = sorted({
      prediction.model_name
      for prediction in self._prediction_rows(db, normalized)
      if prediction.model_name not in baseline_model_names and prediction.model_name != "xgboost-features-v1"
    })
    model_scores = [self._model_score(db, normalized, rates, model_name) for model_name in persisted_model_names]
    model_scores.append(self._xgboost_walk_forward_score(normalized, rates))
    baseline_mae = min((score.mae for score in baseline_scores if score.samples_used), default=None)

    responses: list[BacktestResponse] = []
    for score in [*baseline_scores, *model_scores]:
      beats_baseline = bool(baseline_mae is not None and score.samples_used and score.mae < baseline_mae)
      row = self._persist(db, score, beats_baseline)
      responses.append(score.model_copy(update={"beats_baseline": beats_baseline, "created_at": row.created_at}))

    return responses

  def latest_results(self, db: Session, symbol: str | None = None) -> list[BacktestResult]:
    query = select(BacktestResult).order_by(BacktestResult.created_at.desc(), BacktestResult.id.desc())
    if symbol:
      query = query.where(BacktestResult.symbol == symbol.replace("/", "").upper())

    rows = list(db.scalars(query))
    latest_by_model: dict[tuple[str, str], BacktestResult] = {}
    for row in rows:
      latest_by_model.setdefault((row.symbol, row.model_name), row)
    return list(latest_by_model.values())

  def performance(self, db: Session, symbol: str) -> PerformanceResponse:
    normalized = symbol.replace("/", "").upper()
    latest_rows = self.latest_results(db, normalized)
    if not latest_rows:
      self.run_for_symbol(db, normalized)
      latest_rows = self.latest_results(db, normalized)

    completed_rows = [row for row in latest_rows if row.samples_used > 0]
    latest = min(completed_rows, key=lambda row: row.mae) if completed_rows else (latest_rows[0] if latest_rows else None)
    predictions = list(reversed(self._prediction_rows(db, normalized)[-7:]))
    last_7 = [
      {
        "prediction_time": prediction.prediction_time,
        "forecast_target_time": prediction.forecast_target_time,
        "predicted_close": prediction.predicted_close,
        "direction": prediction.direction,
        "model_name": prediction.model_name,
      }
      for prediction in predictions
    ]

    return PerformanceResponse(
      symbol=normalized,
      latest=self._read(latest) if latest else None,
      comparisons=[self._read(row) for row in latest_rows],
      last_7_predictions=last_7,
    )

  def _read(self, row: BacktestResult) -> BacktestResponse:
    return BacktestResponse(
      symbol=row.symbol,
      model_name=row.model_name,
      mae=row.mae,
      rmse=row.rmse,
      mape=row.mape,
      directional_accuracy=row.directional_accuracy,
      samples_used=row.samples_used,
      beats_baseline=row.beats_baseline,
      notes=row.notes,
      created_at=row.created_at,
    )


backtesting_service = BacktestingService()
