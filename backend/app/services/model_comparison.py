from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import BacktestResult


@dataclass(frozen=True)
class ModelRanking:
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


class ModelComparisonService:
    def latest_results(self, db: Session, symbol: str | None = None) -> list[BacktestResult]:
        query = select(BacktestResult).order_by(BacktestResult.created_at.desc(), BacktestResult.id.desc())
        if symbol:
            query = query.where(BacktestResult.symbol == symbol.replace("/", "").upper())

        latest_by_model: dict[tuple[str, str], BacktestResult] = {}
        for row in db.scalars(query):
            latest_by_model.setdefault((row.symbol, row.model_name), row)
        return list(latest_by_model.values())

    def rankings(self, db: Session, symbol: str | None = None) -> list[ModelRanking]:
        rows = [row for row in self.latest_results(db, symbol) if row.samples_used > 0]
        grouped: dict[str, list[BacktestResult]] = {}
        for row in rows:
            grouped.setdefault(row.symbol, []).append(row)

        rankings: list[ModelRanking] = []
        for grouped_symbol, symbol_rows in grouped.items():
            ordered = sorted(symbol_rows, key=lambda row: (row.mae, row.rmse, -row.directional_accuracy))
            for index, row in enumerate(ordered, start=1):
                # Keep the displayed score aligned with the ranking: MAE first, then tiny tie-breakers.
                score = row.mae + (row.rmse / 1000) + (max(0.0, 55.0 - row.directional_accuracy) / 100000)
                rankings.append(
                    ModelRanking(
                        symbol=grouped_symbol,
                        model_name=row.model_name,
                        rank=index,
                        score=round(score, 6),
                        mae=row.mae,
                        rmse=row.rmse,
                        mape=row.mape,
                        directional_accuracy=row.directional_accuracy,
                        samples_used=row.samples_used,
                        beats_baseline=row.beats_baseline,
                    )
                )
        return sorted(rankings, key=lambda item: (item.symbol, item.rank))

    def best_model_name(self, db: Session, symbol: str, available_models: set[str]) -> str | None:
        for ranking in self.rankings(db, symbol):
            if ranking.model_name in available_models:
                return ranking.model_name
        return None

    def adjusted_confidence(self, db: Session, symbol: str, model_name: str, raw_confidence: float) -> float:
        rows = [
            row for row in self.latest_results(db, symbol)
            if row.model_name == model_name and row.samples_used > 0
        ]
        if not rows:
            return round(max(0.3, min(0.72, raw_confidence * 0.85)), 2)

        row = rows[0]
        direction_factor = max(0.35, min(0.85, row.directional_accuracy / 100))
        error_penalty = max(0.45, 1 - min(row.mape / 2.5, 0.55))
        sample_factor = min(1.0, row.samples_used / 50)
        adjusted = raw_confidence * (0.45 + direction_factor * 0.35 + error_penalty * 0.15 + sample_factor * 0.05)
        return round(max(0.3, min(0.84, adjusted)), 2)


model_comparison_service = ModelComparisonService()
