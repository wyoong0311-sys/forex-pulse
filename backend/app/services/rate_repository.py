from datetime import datetime, timedelta
import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Rate
from app.services.market_data import RatePoint

logger = logging.getLogger(__name__)


class RateRepository:
    def save_points(self, db: Session, points: list[RatePoint]) -> list[Rate]:
        saved: list[Rate] = []

        try:
            for point in points:
                existing = db.scalar(
                    select(Rate).where(
                        Rate.symbol == point.symbol,
                        Rate.captured_at == point.captured_at,
                        Rate.source == point.source,
                    )
                )

                if existing:
                    existing.close = point.close
                    rate = existing
                else:
                    rate = Rate(
                        symbol=point.symbol,
                        close=point.close,
                        source=point.source,
                        captured_at=point.captured_at,
                    )
                    db.add(rate)

                saved.append(rate)

            db.commit()
            for rate in saved:
                db.refresh(rate)
            logger.info("rates_saved", extra={"count": len(saved)})
            return saved
        except Exception:
            db.rollback()
            logger.exception("rates_save_failed", extra={"count": len(points)})
            raise

    def latest_for_symbol(self, db: Session, symbol: str) -> Rate | None:
        rates = list(
            db.scalars(
                select(Rate)
                .where(Rate.symbol == symbol.upper())
                .order_by(Rate.captured_at.desc(), Rate.id.desc())
            )
        )

        provider_rates = [rate for rate in rates if not rate.source.startswith("mock")]
        return (provider_rates or rates)[0] if rates else None

    def history_for_symbol(self, db: Session, symbol: str, days: int) -> list[Rate]:
        since = datetime.utcnow() - timedelta(days=days + 3)
        rates = list(
            db.scalars(
                select(Rate)
                .where(Rate.symbol == symbol.upper(), Rate.captured_at >= since)
                .order_by(Rate.captured_at.asc(), Rate.id.asc())
            )
        )

        provider_rates = [rate for rate in rates if not rate.source.startswith("mock")]
        if provider_rates:
            return provider_rates
        return rates


rate_repository = RateRepository()
