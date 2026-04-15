from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.backtests import (
  BacktestRequest,
  BacktestResponse,
  PerformanceResponse,
  PerformanceSummaryResponse,
)
from app.services.backtesting import backtesting_service


router = APIRouter()
WATCHLIST = ["USDMYR", "EURUSD", "GBPUSD", "USDJPY"]


@router.post("/backtests/run", response_model=list[BacktestResponse])
async def run_backtest(payload: BacktestRequest, db: Session = Depends(get_db)) -> list[BacktestResponse]:
  return backtesting_service.run_for_symbol(db, payload.symbol)


@router.get("/predictions/backtest/{symbol}", response_model=list[BacktestResponse])
async def get_prediction_backtest(symbol: str, db: Session = Depends(get_db)) -> list[BacktestResponse]:
  return backtesting_service.run_for_symbol(db, symbol)


@router.get("/predictions/performance/{symbol}", response_model=PerformanceResponse)
async def get_prediction_performance(symbol: str, db: Session = Depends(get_db)) -> PerformanceResponse:
  return backtesting_service.performance(db, symbol)


@router.get("/predictions/performance-summary", response_model=PerformanceSummaryResponse)
async def get_prediction_performance_summary(db: Session = Depends(get_db)) -> PerformanceSummaryResponse:
  for symbol in WATCHLIST:
    if not backtesting_service.latest_results(db, symbol):
      backtesting_service.run_for_symbol(db, symbol)

  return PerformanceSummaryResponse(
    results=[backtesting_service._read(row) for row in backtesting_service.latest_results(db)]
  )
