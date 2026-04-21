from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class CTraderConnectionUpdate(BaseModel):
    user_id: int = 1
    mode: Literal["demo", "live"] = "demo"
    account_id: str | None = None
    is_enabled: bool = True


class BrokerConnectionRead(BaseModel):
    id: int
    user_id: int
    broker: str
    mode: str
    account_id: str | None
    is_enabled: bool
    created_at: datetime
    updated_at: datetime


class TradeOrderCreate(BaseModel):
    user_id: int = 1
    symbol: str
    side: Literal["buy", "sell"]
    volume_units: float = Field(gt=0)
    order_type: Literal["market"] = "market"
    stop_loss: float | None = Field(default=None, gt=0)
    take_profit: float | None = Field(default=None, gt=0)
    client_note: str | None = Field(default=None, max_length=255)


class TradeOrderRead(BaseModel):
    id: int
    user_id: int
    symbol: str
    side: str
    volume_units: float
    order_type: str
    stop_loss: float | None
    take_profit: float | None
    status: str
    execution_mode: str
    execution_reason: str | None
    external_order_id: str | None
    requested_price: float | None
    filled_price: float | None
    created_at: datetime


class BrokerStatusResponse(BaseModel):
    trading_enabled: bool
    dry_run: bool
    bridge_configured: bool
    allowed_symbols: list[str]
    max_units_per_order: float
    active_connection: BrokerConnectionRead | None = None

