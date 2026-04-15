from fastapi import APIRouter

from app.schemas.pairs import PairDetailResponse
from app.services.forecasting import forecasting_service
from app.services.market_data import market_data_service


router = APIRouter()


def _split_symbol(pair: str) -> tuple[str, str]:
  if "/" in pair:
    base, quote = pair.split("/")
    return base, quote
  normalized = pair.upper()
  return normalized[:3], normalized[3:]


@router.get("/pairs/{pair}", response_model=PairDetailResponse)
async def get_pair_detail(pair: str) -> PairDetailResponse:
  base, quote = _split_symbol(pair)
  history = await market_data_service.get_history(base, quote)
  forecast = forecasting_service.predict(history)

  return PairDetailResponse(
    pair=pair,
    latest_price=history[-1],
    daily_change_pct=round(((history[-1] - history[-2]) / history[-2]) * 100, 3) if len(history) > 1 else 0.0,
    projected_range=f"{forecast.projected_low:.4f} - {forecast.projected_high:.4f}",
    confidence=forecast.confidence,
    history=history[-12:],
    prediction=forecast.path,
  )
