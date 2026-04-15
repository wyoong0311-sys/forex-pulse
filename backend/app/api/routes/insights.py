from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.insights import (
    ForecastSummaryResponse,
    ModelRankingsResponse,
    TopMoversResponse,
    VolatilityResponse,
)
from app.services.insights import insights_service


router = APIRouter()


@router.get("/insights/volatility", response_model=VolatilityResponse)
async def get_volatility_insights(db: Session = Depends(get_db)) -> VolatilityResponse:
    return VolatilityResponse(results=insights_service.volatility(db))


@router.get("/insights/top-movers", response_model=TopMoversResponse)
async def get_top_movers(db: Session = Depends(get_db)) -> TopMoversResponse:
    strongest, weakest = insights_service.top_movers(db)
    return TopMoversResponse(strongest=strongest, weakest=weakest)


@router.get("/insights/model-rankings", response_model=ModelRankingsResponse)
async def get_model_rankings(db: Session = Depends(get_db)) -> ModelRankingsResponse:
    return ModelRankingsResponse(results=insights_service.model_rankings(db))


@router.get("/insights/forecast-summary", response_model=ForecastSummaryResponse)
async def get_forecast_summary(db: Session = Depends(get_db)) -> ForecastSummaryResponse:
    return ForecastSummaryResponse(results=insights_service.forecast_summary(db))
