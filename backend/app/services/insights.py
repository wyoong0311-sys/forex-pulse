from __future__ import annotations

from statistics import mean, pstdev

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Prediction, Rate
from app.schemas.insights import (
    ForecastSummaryInsight,
    ModelRankingInsight,
    MoverInsight,
    VolatilityInsight,
)
from app.services.model_comparison import model_comparison_service


WATCHLIST = ["USDMYR", "EURUSD", "GBPUSD", "USDJPY"]


class InsightsService:
    def _rates(self, db: Session, symbol: str, limit: int = 90) -> list[Rate]:
        rows = list(
            db.scalars(
                select(Rate)
                .where(Rate.symbol == symbol)
                .order_by(Rate.captured_at.asc(), Rate.id.asc())
            )
        )
        provider_rows = [row for row in rows if not row.source.startswith("mock")]
        return (provider_rows or rows)[-limit:]

    def _returns(self, rates: list[Rate]) -> list[float]:
        closes = [rate.close for rate in rates]
        return [
            ((current - previous) / previous) * 100
            for previous, current in zip(closes, closes[1:])
            if previous
        ]

    def volatility(self, db: Session, symbols: list[str] | None = None) -> list[VolatilityInsight]:
        results: list[VolatilityInsight] = []
        for symbol in symbols or WATCHLIST:
            rates = self._rates(db, symbol)
            returns = self._returns(rates)
            if len(returns) < 8:
                continue
            recent = pstdev(returns[-7:])
            baseline = pstdev(returns[-60:]) if len(returns) >= 14 else pstdev(returns)
            ratio = recent / baseline if baseline else 1
            if ratio >= 1.75 or recent >= 1.0:
                regime = "high volatility"
            elif ratio >= 1.25 or recent >= 0.55:
                regime = "elevated volatility"
            else:
                regime = "normal volatility"
            results.append(
                VolatilityInsight(
                    symbol=symbol,
                    regime=regime,
                    recent_volatility_pct=round(recent, 4),
                    baseline_volatility_pct=round(baseline, 4),
                    spike=regime != "normal volatility",
                )
            )
        return results

    def top_movers(self, db: Session, symbols: list[str] | None = None) -> tuple[list[MoverInsight], list[MoverInsight]]:
        movers: list[MoverInsight] = []
        for symbol in symbols or WATCHLIST:
            rates = self._rates(db, symbol, 14)
            if len(rates) < 2:
                continue
            latest = rates[-1]
            previous = rates[-2]
            change_pct = ((latest.close - previous.close) / previous.close) * 100 if previous.close else 0
            movers.append(
                MoverInsight(
                    symbol=symbol,
                    latest_close=latest.close,
                    previous_close=previous.close,
                    change_pct=round(change_pct, 4),
                )
            )
        strongest = sorted(movers, key=lambda item: item.change_pct, reverse=True)
        weakest = sorted(movers, key=lambda item: item.change_pct)
        return strongest, weakest

    def model_rankings(self, db: Session) -> list[ModelRankingInsight]:
        return [
            ModelRankingInsight(
                symbol=ranking.symbol,
                model_name=ranking.model_name,
                rank=ranking.rank,
                score=ranking.score,
                mae=ranking.mae,
                rmse=ranking.rmse,
                mape=ranking.mape,
                directional_accuracy=ranking.directional_accuracy,
                samples_used=ranking.samples_used,
                beats_baseline=ranking.beats_baseline,
            )
            for ranking in model_comparison_service.rankings(db)
        ]

    def forecast_summary(self, db: Session, symbols: list[str] | None = None) -> list[ForecastSummaryInsight]:
        volatility_by_symbol = {item.symbol: item for item in self.volatility(db, symbols)}
        results: list[ForecastSummaryInsight] = []
        for symbol in symbols or WATCHLIST:
            prediction = db.scalar(
                select(Prediction)
                .where(Prediction.symbol == symbol)
                .order_by(Prediction.prediction_time.desc(), Prediction.id.desc())
            )
            if prediction is None:
                continue
            adjusted_confidence = model_comparison_service.adjusted_confidence(
                db,
                symbol,
                prediction.model_name,
                prediction.confidence_score,
            )
            results.append(
                ForecastSummaryInsight(
                    symbol=symbol,
                    model_name=prediction.model_name,
                    direction=prediction.direction,
                    predicted_close=prediction.predicted_close,
                    lower_bound=prediction.lower_bound,
                    upper_bound=prediction.upper_bound,
                    raw_confidence=prediction.confidence_score,
                    performance_adjusted_confidence=adjusted_confidence,
                    forecast_target_time=prediction.forecast_target_time,
                    volatility_regime=volatility_by_symbol.get(symbol).regime
                    if symbol in volatility_by_symbol
                    else "unknown",
                )
            )
        return results


insights_service = InsightsService()
