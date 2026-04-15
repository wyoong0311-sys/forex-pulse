from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
import logging
from statistics import mean, pstdev

import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Prediction, Rate
from app.services.feature_engineering import build_feature_rows
from app.services.model_comparison import model_comparison_service

logger = logging.getLogger(__name__)

try:
    import xgboost as xgb
except Exception:  # pragma: no cover - keeps local fallback safe if optional wheel is unavailable.
    xgb = None


@dataclass(frozen=True)
class PredictionDraft:
    symbol: str
    prediction_time: datetime
    forecast_target_time: datetime
    predicted_close: float
    lower_bound: float
    upper_bound: float
    confidence_score: float
    direction: str
    model_name: str


class PredictionService:
    def _rates(self, db: Session, symbol: str, limit: int = 220) -> list[Rate]:
        rates = list(
            db.scalars(
                select(Rate)
                .where(Rate.symbol == symbol.upper())
                .order_by(Rate.captured_at.asc(), Rate.id.asc())
            )
        )
        provider_rates = [rate for rate in rates if not rate.source.startswith("mock")]
        return (provider_rates or rates)[-limit:]

    def _direction(self, predicted_close: float, last_close: float) -> str:
        pct = ((predicted_close - last_close) / last_close) * 100 if last_close else 0
        if pct > 0.1:
            return "bullish"
        if pct < -0.1:
            return "bearish"
        return "sideways"

    def _bounds(self, closes: list[float], predicted_close: float) -> tuple[float, float, float]:
        returns = [
            (current - previous) / previous
            for previous, current in zip(closes, closes[1:])
            if previous
        ]
        volatility = pstdev(returns[-20:]) if len(returns) >= 2 else 0.005
        band = max(abs(predicted_close) * volatility * 1.25, abs(predicted_close) * 0.001)
        confidence = max(0.35, min(0.82, 0.78 - volatility * 12))
        return predicted_close - band, predicted_close + band, confidence

    def _baseline_prediction(self, symbol: str, rates: list[Rate], model_name: str = "moving-average-baseline-v1") -> PredictionDraft:
        closes = [rate.close for rate in rates]
        last_close = closes[-1]
        can_use_moving_average = len(closes) >= 5 and model_name == "moving-average-baseline-v1"
        moving_average = mean(closes[-5:]) if can_use_moving_average else last_close
        predicted_close = (last_close + moving_average) / 2 if can_use_moving_average else last_close
        lower, upper, confidence = self._bounds(closes, predicted_close)
        prediction_time = datetime.utcnow()
        selected_model = "moving-average-baseline-v1" if can_use_moving_average else "naive-previous-close-baseline-v1"

        return PredictionDraft(
            symbol=symbol,
            prediction_time=prediction_time,
            forecast_target_time=rates[-1].captured_at + timedelta(days=1),
            predicted_close=round(predicted_close, 5),
            lower_bound=round(lower, 5),
            upper_bound=round(upper, 5),
            confidence_score=round(confidence * (0.85 if can_use_moving_average else 0.72), 2),
            direction=self._direction(predicted_close, last_close),
            model_name=selected_model,
        )

    def _xgboost_prediction(self, symbol: str, rates: list[Rate]) -> PredictionDraft | None:
        if xgb is None or len(rates) < 18:
            return None

        points = [(rate.captured_at, rate.close) for rate in rates]
        rows = build_feature_rows(points)
        training_rows = [row for row in rows[:-1] if row.target is not None]
        if len(training_rows) < 12:
            return None

        x_train = np.array([row.features for row in training_rows], dtype=float)
        y_train = np.array([row.target for row in training_rows], dtype=float)
        latest_features = np.array([rows[-1].features], dtype=float)

        train_matrix = xgb.DMatrix(x_train, label=y_train)
        predict_matrix = xgb.DMatrix(latest_features)
        model = xgb.train(
            {
                "objective": "reg:squarederror",
                "max_depth": 3,
                "eta": 0.08,
                "seed": 42,
            },
            train_matrix,
            num_boost_round=80,
        )
        predicted_close = float(model.predict(predict_matrix)[0])
        closes = [rate.close for rate in rates]
        lower, upper, confidence = self._bounds(closes, predicted_close)
        prediction_time = datetime.utcnow()

        return PredictionDraft(
            symbol=symbol,
            prediction_time=prediction_time,
            forecast_target_time=rates[-1].captured_at + timedelta(days=1),
            predicted_close=round(predicted_close, 5),
            lower_bound=round(lower, 5),
            upper_bound=round(upper, 5),
            confidence_score=round(confidence, 2),
            direction=self._direction(predicted_close, closes[-1]),
            model_name="xgboost-features-v1",
        )

    def generate_for_symbol(self, db: Session, symbol: str) -> Prediction:
        normalized = symbol.replace("/", "").upper()
        rates = self._rates(db, normalized)
        if not rates:
            raise ValueError(f"No rates available for {normalized}")

        candidate_drafts = [
            self._baseline_prediction(normalized, rates, "naive-previous-close-baseline-v1"),
            self._baseline_prediction(normalized, rates, "moving-average-baseline-v1"),
        ]
        xgboost_draft = self._xgboost_prediction(normalized, rates)
        if xgboost_draft:
            candidate_drafts.append(xgboost_draft)

        selected_model_name = model_comparison_service.best_model_name(
            db,
            normalized,
            {draft.model_name for draft in candidate_drafts},
        )
        draft = next((item for item in candidate_drafts if item.model_name == selected_model_name), candidate_drafts[-1])
        confidence_score = model_comparison_service.adjusted_confidence(
            db,
            normalized,
            draft.model_name,
            draft.confidence_score,
        )
        prediction = Prediction(
            symbol=normalized,
            model_name=draft.model_name,
            prediction_time=draft.prediction_time,
            forecast_target_time=draft.forecast_target_time,
            predicted_close=draft.predicted_close,
            lower_bound=draft.lower_bound,
            upper_bound=draft.upper_bound,
            confidence_score=confidence_score,
            predicted_next_close=draft.predicted_close,
            projected_low=draft.lower_bound,
            projected_high=draft.upper_bound,
            direction=draft.direction,
            confidence=confidence_score,
            actual_close=rates[-1].close,
            created_at=draft.prediction_time,
        )
        try:
            db.add(prediction)
            db.commit()
            db.refresh(prediction)
        except Exception:
            db.rollback()
            logger.exception("prediction_persist_failed", extra={"symbol": normalized, "model_name": draft.model_name})
            raise
        logger.info(
            "prediction_generated",
            extra={"symbol": normalized, "model_name": draft.model_name, "forecast_target_time": draft.forecast_target_time.isoformat()},
        )
        return prediction

    def latest(self, db: Session, symbol: str) -> Prediction | None:
        return db.scalar(
            select(Prediction)
            .where(Prediction.symbol == symbol.replace("/", "").upper())
            .order_by(Prediction.prediction_time.desc(), Prediction.id.desc())
        )

    def history(self, db: Session, symbol: str, limit: int = 20) -> list[Prediction]:
        return list(
            db.scalars(
                select(Prediction)
                .where(Prediction.symbol == symbol.replace("/", "").upper())
                .order_by(Prediction.prediction_time.desc(), Prediction.id.desc())
                .limit(limit)
            )
        )


prediction_service = PredictionService()
