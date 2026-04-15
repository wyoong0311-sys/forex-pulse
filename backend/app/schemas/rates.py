from datetime import datetime

from pydantic import BaseModel


class RateRead(BaseModel):
    symbol: str
    close: float
    source: str = "mock"
    captured_at: datetime


class LatestRatesResponse(BaseModel):
    rates: list[RateRead]


class HistoryResponse(BaseModel):
    symbol: str
    range: str
    actual: list[RateRead]
    fallback_used: bool = False
