from fastapi import APIRouter
from sqlalchemy import text

from app.db.session import SessionLocal
from app.services.market_data import MarketDataError, market_data_service


router = APIRouter()


@router.get("/health")
async def health_check() -> dict[str, str]:
  return {"status": "ok"}


@router.get("/health/db")
async def database_health_check() -> dict[str, str]:
  db = SessionLocal()
  try:
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "reachable"}
  except Exception as error:
    return {"status": "degraded", "database": "unreachable", "error": str(error)}
  finally:
    db.close()


@router.get("/health/provider")
async def provider_health_check() -> dict[str, str]:
  try:
    point = await market_data_service.get_latest_point("USD", "MYR")
    return {
      "status": "ok",
      "provider": point.source,
      "symbol": point.symbol,
      "captured_at": point.captured_at.isoformat(),
    }
  except MarketDataError as error:
    return {"status": "degraded", "provider": "unreachable", "error": str(error)}
