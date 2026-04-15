from pathlib import Path
import logging
import time

import firebase_admin
import httpx
from firebase_admin import credentials, messaging

from app.core.config import settings

logger = logging.getLogger(__name__)


class NotificationService:
  def __init__(self) -> None:
    self._initialized = False

  def initialize(self) -> None:
    if self._initialized:
      return

    credential_path = Path(settings.firebase_credentials_path)
    if not credential_path.exists():
      logger.warning("firebase_credentials_missing", extra={"path": str(credential_path)})
      return

    credentials_obj = credentials.Certificate(str(credential_path))
    firebase_admin.initialize_app(credentials_obj)
    self._initialized = True
    logger.info("firebase_admin_initialized", extra={"path": str(credential_path)})

  def send_price_alert(self, token: str, title: str, body: str) -> dict:
    if token.startswith("ExponentPushToken[") or token.startswith("ExpoPushToken["):
      return self._send_expo_push(token, title, body)

    self.initialize()
    if not self._initialized:
      if settings.notification_mock_enabled:
        logger.info("notification_mock_send", extra={"token_preview": token[:12], "title": title})
        return {
          "ok": True,
          "mode": "mock",
          "message": "Firebase credentials not configured yet; mock notification recorded.",
          "token_preview": token[:12],
          "title": title,
          "body": body,
        }
      return {"ok": False, "message": "Firebase credentials not configured yet."}

    message = messaging.Message(
      token=token,
      notification=messaging.Notification(title=title, body=body),
    )
    last_error: Exception | None = None
    for attempt in range(1, settings.notification_retry_attempts + 1):
      try:
        response = messaging.send(message)
        logger.info(
          "notification_send_success",
          extra={"token_preview": token[:12], "attempt": attempt, "message_id": response},
        )
        return {"ok": True, "message_id": response}
      except Exception as error:
        last_error = error
        logger.warning(
          "notification_send_failed",
          extra={
            "token_preview": token[:12],
            "attempt": attempt,
            "max_attempts": settings.notification_retry_attempts,
            "error": str(error),
          },
        )
        if attempt < settings.notification_retry_attempts:
          time.sleep(min(2 ** (attempt - 1), 5))
    return {"ok": False, "message": f"Firebase send failed: {last_error}"}

  def _send_expo_push(self, token: str, title: str, body: str) -> dict:
    headers = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    }
    if settings.expo_push_access_token:
      headers["Authorization"] = f"Bearer {settings.expo_push_access_token}"

    payload = {
      "to": token,
      "title": title,
      "body": body,
      "sound": "default",
      "channelId": "forex-alerts",
    }

    last_error: Exception | None = None
    for attempt in range(1, settings.notification_retry_attempts + 1):
      try:
        response = httpx.post(
          settings.expo_push_api_url,
          headers=headers,
          json=payload,
          timeout=15.0,
        )
        response.raise_for_status()
        data = response.json()
        logger.info(
          "expo_notification_send_success",
          extra={"token_preview": token[:18], "attempt": attempt, "response": data},
        )
        return {"ok": True, "provider": "expo", "response": data}
      except Exception as error:
        last_error = error
        logger.warning(
          "expo_notification_send_failed",
          extra={
            "token_preview": token[:18],
            "attempt": attempt,
            "max_attempts": settings.notification_retry_attempts,
            "error": str(error),
          },
        )
        if attempt < settings.notification_retry_attempts:
          time.sleep(min(2 ** (attempt - 1), 5))
    return {"ok": False, "provider": "expo", "message": f"Expo push send failed: {last_error}"}


notification_service = NotificationService()
