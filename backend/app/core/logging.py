import json
import logging
import sys
from datetime import datetime
from typing import Any

from app.core.config import settings


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "environment": settings.app_env,
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        for key, value in record.__dict__.items():
            if key.startswith("_") and key not in {"_job_name", "_symbol"}:
                continue
            if key in {
                "args",
                "asctime",
                "created",
                "exc_info",
                "exc_text",
                "filename",
                "funcName",
                "levelname",
                "levelno",
                "lineno",
                "module",
                "msecs",
                "message",
                "msg",
                "name",
                "pathname",
                "process",
                "processName",
                "relativeCreated",
                "stack_info",
                "thread",
                "threadName",
            }:
                continue
            try:
                json.dumps({key: value})
                payload[key] = value
            except TypeError:
                payload[key] = str(value)
        return json.dumps(payload, default=str)


def configure_logging() -> None:
    logging.basicConfig(
        level=settings.log_level.upper(),
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True,
    )
    formatter: logging.Formatter
    if settings.log_format == "json":
        formatter = JsonFormatter()
    else:
        formatter = logging.Formatter("%(asctime)s %(levelname)s [%(name)s] %(message)s")

    for handler in logging.getLogger().handlers:
        handler.setFormatter(formatter)
