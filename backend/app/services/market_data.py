from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
import asyncio
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RatePoint:
    symbol: str
    close: float
    captured_at: datetime
    source: str = "frankfurter"


class MarketDataError(RuntimeError):
    pass


class MarketDataService:
    def _symbol(self, base: str, quote: str) -> str:
        return f"{base}{quote}".upper()

    async def _get_json(self, path: str, params: dict[str, str]) -> dict:
        last_error: Exception | None = None

        for attempt in range(1, settings.provider_retry_attempts + 1):
            try:
                async with httpx.AsyncClient(timeout=settings.provider_timeout_seconds, follow_redirects=True) as client:
                    response = await client.get(f"{settings.forex_provider_url}{path}", params=params)
                    response.raise_for_status()
                    return response.json()
            except (httpx.HTTPError, ValueError) as error:
                last_error = error
                logger.warning(
                    "forex_provider_request_failed",
                    extra={
                        "path": path,
                        "params": params,
                        "attempt": attempt,
                        "max_attempts": settings.provider_retry_attempts,
                        "error": str(error),
                    },
                )
                if attempt < settings.provider_retry_attempts:
                    await asyncio.sleep(min(2 ** (attempt - 1), 5))

        raise MarketDataError(f"Forex provider request failed: {last_error}") from last_error

    async def get_latest_point(self, base: str, quote: str) -> RatePoint:
        payload = await self._get_json("/latest", {"from": base, "to": quote})
        rates = payload.get("rates", {})
        value = rates.get(quote)

        if value is None:
            raise MarketDataError(f"No latest rate returned for {base}/{quote}")

        captured_date = date.fromisoformat(payload["date"])
        return RatePoint(
            symbol=self._symbol(base, quote),
            close=float(value),
            captured_at=datetime.combine(captured_date, time.min),
        )

    async def get_history_points(self, base: str, quote: str, days: int = 30) -> list[RatePoint]:
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        payload = await self._get_json(
            f"/{start_date.isoformat()}..{end_date.isoformat()}",
            {"from": base, "to": quote},
        )

        points: list[RatePoint] = []
        for date_text, rates in sorted((payload.get("rates") or {}).items()):
            value = rates.get(quote)
            if value is None:
                continue
            points.append(
                RatePoint(
                    symbol=self._symbol(base, quote),
                    close=float(value),
                    captured_at=datetime.combine(date.fromisoformat(date_text), time.min),
                )
            )

        if not points:
            raise MarketDataError(f"No historical rates returned for {base}/{quote}")

        return points

    async def get_latest(self, base: str, quote: str) -> float:
        return (await self.get_latest_point(base, quote)).close

    async def get_history(self, base: str, quote: str, days: int = 30) -> list[float]:
        return [point.close for point in await self.get_history_points(base, quote, days)]


market_data_service = MarketDataService()
