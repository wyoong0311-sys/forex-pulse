from fastapi import FastAPI

from app.api.routes import alerts, backtests, dashboard, devices, exports, health, insights, notifications, pairs, predictions, rates, users
from app.core.config import settings
from app.core.logging import configure_logging
from app.core.validation import validate_environment
from app.db.init_db import init_db
from app.jobs.scheduler import configure_jobs, scheduler


app = FastAPI(title=settings.app_name)


@app.on_event("startup")
def on_startup() -> None:
    configure_logging()
    validate_environment()
    init_db()
    configure_jobs()
    if not scheduler.running:
        scheduler.start()

app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(dashboard.router, prefix="/api/v1", tags=["dashboard"])
app.include_router(rates.router, prefix="/api/v1", tags=["rates"])
app.include_router(pairs.router, prefix="/api/v1", tags=["pairs"])
app.include_router(insights.router, prefix="/api/v1", tags=["insights"])
app.include_router(users.router, prefix="/api/v1", tags=["users"])
app.include_router(exports.router, prefix="/api/v1", tags=["exports"])
app.include_router(backtests.router, prefix="/api/v1", tags=["backtests"])
app.include_router(predictions.router, prefix="/api/v1", tags=["predictions"])
app.include_router(alerts.router, prefix="/api/v1", tags=["alerts"])
app.include_router(devices.router, prefix="/api/v1", tags=["devices"])
app.include_router(notifications.router, prefix="/api/v1", tags=["notifications"])

# Phase 2 acceptance tests use the shorter public rates path.
app.include_router(health.router, tags=["health"])
app.include_router(rates.router, tags=["rates"])
app.include_router(alerts.router, tags=["alerts"])
app.include_router(devices.router, tags=["devices"])
app.include_router(notifications.router, tags=["notifications"])
app.include_router(insights.router, tags=["insights"])
app.include_router(users.router, tags=["users"])
app.include_router(exports.router, tags=["exports"])
app.include_router(backtests.router, tags=["backtests"])
app.include_router(predictions.router, tags=["predictions"])
