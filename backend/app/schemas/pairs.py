from pydantic import BaseModel


class PairOverview(BaseModel):
  symbol: str
  price: float
  change: float
  confidence: float


class Highlight(BaseModel):
  label: str
  value: str
  tone: str = "neutral"


class DashboardResponse(BaseModel):
  pairs: list[PairOverview]
  highlights: list[Highlight]


class PairDetailResponse(BaseModel):
  pair: str
  latest_price: float
  daily_change_pct: float
  projected_range: str
  confidence: float
  history: list[float]
  prediction: list[float]
