import csv
import io

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import BacktestResult, Prediction, Rate


class ExportService:
    def _csv(self, headers: list[str], rows: list[list[object]]) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(headers)
        writer.writerows(rows)
        return output.getvalue()

    def rate_history_csv(self, db: Session, symbol: str) -> str:
        normalized = symbol.replace("/", "").upper()
        rows = list(
            db.scalars(
                select(Rate)
                .where(Rate.symbol == normalized)
                .order_by(Rate.captured_at.asc(), Rate.id.asc())
            )
        )
        return self._csv(
            ["symbol", "close", "source", "captured_at"],
            [[row.symbol, row.close, row.source, row.captured_at.isoformat()] for row in rows],
        )

    def prediction_csv(self, db: Session, symbol: str) -> str:
        normalized = symbol.replace("/", "").upper()
        predictions = list(
            db.scalars(
                select(Prediction)
                .where(Prediction.symbol == normalized)
                .order_by(Prediction.prediction_time.asc(), Prediction.id.asc())
            )
        )
        backtests = list(
            db.scalars(
                select(BacktestResult)
                .where(BacktestResult.symbol == normalized)
                .order_by(BacktestResult.created_at.asc(), BacktestResult.id.asc())
            )
        )
        prediction_rows = [
            [
                "prediction",
                row.symbol,
                row.model_name,
                row.predicted_close,
                row.lower_bound,
                row.upper_bound,
                row.confidence_score,
                row.direction,
                row.prediction_time.isoformat(),
                row.forecast_target_time.isoformat(),
                "",
                "",
                "",
                "",
            ]
            for row in predictions
        ]
        backtest_rows = [
            [
                "backtest",
                row.symbol,
                row.model_name,
                "",
                "",
                "",
                "",
                "",
                row.created_at.isoformat(),
                "",
                row.mae,
                row.rmse,
                row.mape,
                row.directional_accuracy,
            ]
            for row in backtests
        ]
        return self._csv(
            [
                "record_type",
                "symbol",
                "model_name",
                "predicted_close",
                "lower_bound",
                "upper_bound",
                "confidence_score",
                "direction",
                "timestamp",
                "forecast_target_time",
                "mae",
                "rmse",
                "mape",
                "directional_accuracy",
            ],
            [*prediction_rows, *backtest_rows],
        )


export_service = ExportService()
