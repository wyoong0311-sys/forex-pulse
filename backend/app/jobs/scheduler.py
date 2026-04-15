import asyncio
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.db.session import SessionLocal
from app.services.alert_service import alert_service
from app.services.backtesting import backtesting_service
from app.services.market_data import MarketDataError, market_data_service
from app.services.prediction_service import prediction_service
from app.services.rate_repository import rate_repository


WATCHLIST = ["USDMYR", "EURUSD", "GBPUSD", "USDJPY"]
scheduler = AsyncIOScheduler()
logger = logging.getLogger(__name__)
_job_locks: dict[str, asyncio.Lock] = {}


def _split_symbol(symbol: str) -> tuple[str, str]:
    return symbol[:3], symbol[3:]


async def fetch_latest_forex_data() -> None:
    if await _skip_if_running("fetch_latest_forex_data"):
        return
    db = SessionLocal()
    try:
        logger.info("scheduled_job_started", extra={"job": "fetch_latest_forex_data"})
        for symbol in WATCHLIST:
            base, quote = _split_symbol(symbol)
            try:
                point = await market_data_service.get_latest_point(base, quote)
                rate_repository.save_points(db, [point])
            except MarketDataError as error:
                # Route-level fallback keeps app UX working; scheduled jobs should not write fake rows silently.
                logger.warning("scheduled_provider_fetch_failed", extra={"job": "fetch_latest_forex_data", "symbol": symbol, "error": str(error)})
                continue
        for symbol in WATCHLIST:
            try:
                prediction_service.generate_for_symbol(db, symbol)
            except ValueError as error:
                logger.warning("scheduled_prediction_failed", extra={"job": "fetch_latest_forex_data", "symbol": symbol, "error": str(error)})
                continue
        alert_service.evaluate_alerts(db)
        logger.info("scheduled_job_finished", extra={"job": "fetch_latest_forex_data"})
    except Exception:
        db.rollback()
        logger.exception("scheduled_job_failed", extra={"job": "fetch_latest_forex_data"})
        raise
    finally:
        db.close()
        _release_job("fetch_latest_forex_data")


async def generate_predictions() -> None:
    if await _skip_if_running("generate_predictions"):
        return
    db = SessionLocal()
    try:
        logger.info("scheduled_job_started", extra={"job": "generate_predictions"})
        for symbol in WATCHLIST:
            try:
                base, quote = _split_symbol(symbol)
                history = await market_data_service.get_history_points(base, quote, 90)
                rate_repository.save_points(db, history)
                prediction_service.generate_for_symbol(db, symbol)
            except (MarketDataError, ValueError) as error:
                logger.warning("scheduled_prediction_failed", extra={"job": "generate_predictions", "symbol": symbol, "error": str(error)})
                continue
        for symbol in WATCHLIST:
            backtesting_service.run_for_symbol(db, symbol)
        logger.info("scheduled_job_finished", extra={"job": "generate_predictions"})
    except Exception:
        db.rollback()
        logger.exception("scheduled_job_failed", extra={"job": "generate_predictions"})
        raise
    finally:
        db.close()
        _release_job("generate_predictions")


async def run_backtests() -> None:
    if await _skip_if_running("run_backtests"):
        return
    db = SessionLocal()
    try:
        logger.info("scheduled_job_started", extra={"job": "run_backtests"})
        for symbol in WATCHLIST:
            backtesting_service.run_for_symbol(db, symbol)
        logger.info("scheduled_job_finished", extra={"job": "run_backtests"})
    except Exception:
        db.rollback()
        logger.exception("scheduled_job_failed", extra={"job": "run_backtests"})
        raise
    finally:
        db.close()
        _release_job("run_backtests")


async def check_alerts_and_send_notifications() -> None:
    if await _skip_if_running("check_alerts"):
        return
    db = SessionLocal()
    try:
        logger.info("scheduled_job_started", extra={"job": "check_alerts"})
        alert_service.evaluate_alerts(db)
        logger.info("scheduled_job_finished", extra={"job": "check_alerts"})
    except Exception:
        db.rollback()
        logger.exception("scheduled_job_failed", extra={"job": "check_alerts"})
        raise
    finally:
        db.close()
        _release_job("check_alerts")


async def _skip_if_running(job_name: str) -> bool:
    lock = _job_locks.setdefault(job_name, asyncio.Lock())
    if lock.locked():
        logger.warning("scheduled_job_skipped_overlap", extra={"job": job_name})
        return True
    await lock.acquire()
    return False


def _release_job(job_name: str) -> None:
    lock = _job_locks.get(job_name)
    if lock and lock.locked():
        lock.release()


def configure_jobs() -> AsyncIOScheduler:
    if scheduler.get_job("fetch_latest_forex_data") is None:
        scheduler.add_job(fetch_latest_forex_data, "interval", minutes=15, id="fetch_latest_forex_data", max_instances=1, coalesce=True, misfire_grace_time=60)
    if scheduler.get_job("generate_predictions") is None:
        scheduler.add_job(generate_predictions, "interval", hours=4, id="generate_predictions", max_instances=1, coalesce=True, misfire_grace_time=300)
    if scheduler.get_job("check_alerts") is None:
        scheduler.add_job(check_alerts_and_send_notifications, "interval", minutes=5, id="check_alerts", max_instances=1, coalesce=True, misfire_grace_time=60)
    if scheduler.get_job("run_backtests") is None:
        scheduler.add_job(run_backtests, "interval", hours=6, id="run_backtests", max_instances=1, coalesce=True, misfire_grace_time=300)
    return scheduler
