from datetime import datetime

from pydantic import BaseModel, Field


class AlertCreate(BaseModel):
    user_id: int = 1
    symbol: str = "USDMYR"
    alert_type: str = Field(default="above", pattern="^(above|below|crosses_above|crosses_below)$")
    target_price: float


class AlertUpdate(BaseModel):
    alert_type: str | None = Field(default=None, pattern="^(above|below|crosses_above|crosses_below)$")
    target_price: float | None = None
    is_active: bool | None = None


class AlertRead(BaseModel):
    id: int
    user_id: int
    symbol: str
    alert_type: str
    target_price: float | None
    is_active: bool
    created_at: datetime


class AlertLogRead(BaseModel):
    id: int
    alert_id: int
    message: str
    sent_at: datetime
