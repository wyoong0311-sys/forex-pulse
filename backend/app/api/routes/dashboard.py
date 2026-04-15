from fastapi import APIRouter

from app.schemas.pairs import DashboardResponse, Highlight, PairOverview


router = APIRouter()


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard() -> DashboardResponse:
  return DashboardResponse(
    pairs=[
      PairOverview(symbol="EUR/USD", price=1.0864, change=0.42, confidence=0.68),
      PairOverview(symbol="GBP/USD", price=1.2741, change=-0.13, confidence=0.55),
      PairOverview(symbol="USD/JPY", price=152.34, change=0.61, confidence=0.73),
      PairOverview(symbol="AUD/USD", price=0.6618, change=-0.22, confidence=0.51),
    ],
    highlights=[
      Highlight(label="Signal quality", value="68%", tone="up"),
      Highlight(label="Open alerts", value="12", tone="warning"),
      Highlight(label="Win rate 30D", value="57%"),
      Highlight(label="Model drift", value="Low", tone="up"),
    ],
  )
