import logging
from pathlib import Path

from app.core.config import settings


logger = logging.getLogger(__name__)


def validate_environment() -> list[str]:
    warnings: list[str] = []
    is_production = settings.app_env.lower() == "production"
    database_url = settings.database_url.lower()

    if is_production and database_url.startswith("sqlite"):
        warnings.append("Production APP_ENV should use PostgreSQL or Supabase through DATABASE_URL, not SQLite.")
    if is_production and settings.mock_data_enabled:
        warnings.append("MOCK_DATA_ENABLED should be false in production.")
    if is_production and settings.notification_mock_enabled:
        warnings.append("NOTIFICATION_MOCK_ENABLED should be false in production.")
    if (
        is_production
        and not settings.notification_mock_enabled
        and not Path(settings.firebase_credentials_path).exists()
    ):
        warnings.append(
            "FIREBASE_CREDENTIALS_PATH must point to a valid Firebase service account JSON when mock notifications are disabled in production."
        )

    if warnings and is_production:
        for warning in warnings:
            logger.error("environment_validation_failed", extra={"warning": warning})
        raise RuntimeError("Invalid production environment configuration. Check startup logs.")

    for warning in warnings:
        logger.warning("environment_validation_warning", extra={"warning": warning})

    return warnings
