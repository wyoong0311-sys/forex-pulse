from sqlalchemy import inspect, text

from app.db.base import Base
from app.db.models import (
    Alert,
    AlertLog,
    BacktestResult,
    BrokerConnection,
    DeviceToken,
    Prediction,
    Rate,
    TradeOrder,
    User,
    UserPreference,
    WatchlistItem,
)
from app.db.session import engine


def init_db() -> None:
    # Importing model classes above registers them on Base.metadata.
    Base.metadata.create_all(bind=engine)
    _add_prediction_columns_if_missing()
    _add_backtest_columns_if_missing()


def _add_prediction_columns_if_missing() -> None:
    inspector = inspect(engine)
    if "predictions" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("predictions")}
    required_columns = {
        "prediction_time": "DATETIME",
        "forecast_target_time": "DATETIME",
        "predicted_close": "FLOAT",
        "lower_bound": "FLOAT",
        "upper_bound": "FLOAT",
        "confidence_score": "FLOAT",
    }

    with engine.begin() as connection:
        for name, column_type in required_columns.items():
            if name not in existing_columns:
                connection.execute(text(f"ALTER TABLE predictions ADD COLUMN {name} {column_type}"))


def _add_backtest_columns_if_missing() -> None:
    inspector = inspect(engine)
    if "backtest_results" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("backtest_results")}
    required_columns = {
        "samples_used": "INTEGER",
        "beats_baseline": "BOOLEAN",
    }

    with engine.begin() as connection:
        for name, column_type in required_columns.items():
            if name not in existing_columns:
                connection.execute(text(f"ALTER TABLE backtest_results ADD COLUMN {name} {column_type}"))
