from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Singapore")
    default_watchlist: Mapped[str] = mapped_column(Text, default="USD/MYR,EUR/USD,GBP/USD,USD/JPY")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DeviceToken(Base):
    __tablename__ = "device_tokens"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True)
    platform: Mapped[str] = mapped_column(String(32))
    token: Mapped[str] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True)
    symbol: Mapped[str] = mapped_column(String(16), index=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, unique=True, index=True)
    refresh_interval_seconds: Mapped[int] = mapped_column(Integer, default=900)
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    price_alerts_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    forecast_alerts_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    daily_summary_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    daily_summary_time: Mapped[str] = mapped_column(String(8), default="08:00")
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Singapore")
    theme: Mapped[str] = mapped_column(String(32), default="dark")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Rate(Base):
    __tablename__ = "rates"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(String(16), index=True)
    open: Mapped[float | None] = mapped_column(Float, nullable=True)
    high: Mapped[float | None] = mapped_column(Float, nullable=True)
    low: Mapped[float | None] = mapped_column(Float, nullable=True)
    close: Mapped[float] = mapped_column(Float)
    source: Mapped[str] = mapped_column(String(64), default="mock")
    captured_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(String(16), index=True)
    model_name: Mapped[str] = mapped_column(String(64))
    prediction_time: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    forecast_target_time: Mapped[datetime] = mapped_column(DateTime, index=True)
    predicted_close: Mapped[float] = mapped_column(Float)
    lower_bound: Mapped[float] = mapped_column(Float)
    upper_bound: Mapped[float] = mapped_column(Float)
    confidence_score: Mapped[float] = mapped_column(Float)
    predicted_next_close: Mapped[float] = mapped_column(Float)
    projected_low: Mapped[float] = mapped_column(Float)
    projected_high: Mapped[float] = mapped_column(Float)
    direction: Mapped[str] = mapped_column(String(16))
    confidence: Mapped[float] = mapped_column(Float)
    actual_close: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True)
    symbol: Mapped[str] = mapped_column(String(16), index=True)
    alert_type: Mapped[str] = mapped_column(String(32))
    target_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AlertLog(Base):
    __tablename__ = "alert_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    alert_id: Mapped[int] = mapped_column(Integer, index=True)
    message: Mapped[str] = mapped_column(Text)
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class BacktestResult(Base):
    __tablename__ = "backtest_results"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(String(16), index=True)
    model_name: Mapped[str] = mapped_column(String(64))
    mae: Mapped[float] = mapped_column(Float)
    rmse: Mapped[float] = mapped_column(Float)
    mape: Mapped[float] = mapped_column(Float)
    directional_accuracy: Mapped[float] = mapped_column(Float)
    samples_used: Mapped[int] = mapped_column(Integer, default=0)
    beats_baseline: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
