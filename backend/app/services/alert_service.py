from datetime import datetime, timedelta
import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Alert, AlertLog, DeviceToken
from app.services.notifications import notification_service
from app.services.rate_repository import rate_repository

logger = logging.getLogger(__name__)


class AlertService:
    def create_alert(self, db: Session, *, user_id: int, symbol: str, alert_type: str, target_price: float) -> Alert:
        alert = Alert(
            user_id=user_id,
            symbol=symbol.replace("/", "").upper(),
            alert_type=alert_type,
            target_price=target_price,
            is_active=True,
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
        return alert

    def alerts_for_user(self, db: Session, user_id: int) -> list[Alert]:
        return list(db.scalars(select(Alert).where(Alert.user_id == user_id).order_by(Alert.created_at.desc())))

    def alert_logs_for_user(self, db: Session, user_id: int) -> list[AlertLog]:
        alert_ids = [alert.id for alert in self.alerts_for_user(db, user_id)]
        if not alert_ids:
            return []
        return list(
            db.scalars(
                select(AlertLog)
                .where(AlertLog.alert_id.in_(alert_ids))
                .order_by(AlertLog.sent_at.desc(), AlertLog.id.desc())
            )
        )

    def update_alert(
        self,
        db: Session,
        alert_id: int,
        *,
        alert_type: str | None = None,
        target_price: float | None = None,
        is_active: bool | None = None,
    ) -> Alert | None:
        alert = db.get(Alert, alert_id)
        if alert is None:
            return None
        if alert_type is not None:
            alert.alert_type = alert_type
        if target_price is not None:
            alert.target_price = target_price
        if is_active is not None:
            alert.is_active = is_active
        db.commit()
        db.refresh(alert)
        return alert

    def delete_alert(self, db: Session, alert_id: int) -> bool:
        alert = db.get(Alert, alert_id)
        if alert is None:
            return False
        alert.is_active = False
        db.commit()
        return True

    def _condition_matches(self, alert: Alert, latest_close: float, previous_close: float | None) -> bool:
        if alert.target_price is None:
            return False
        if alert.alert_type == "above":
            return latest_close > alert.target_price
        if alert.alert_type == "below":
            return latest_close < alert.target_price
        if alert.alert_type == "crosses_above":
            return previous_close is not None and previous_close <= alert.target_price < latest_close
        if alert.alert_type == "crosses_below":
            return previous_close is not None and previous_close >= alert.target_price > latest_close
        return False

    def _was_recently_triggered(self, db: Session, alert_id: int, cooldown_minutes: int = 60) -> bool:
        since = datetime.utcnow() - timedelta(minutes=cooldown_minutes)
        recent = db.scalar(
            select(AlertLog)
            .where(AlertLog.alert_id == alert_id, AlertLog.sent_at >= since)
            .order_by(AlertLog.sent_at.desc())
        )
        return recent is not None

    def evaluate_alerts(self, db: Session) -> list[AlertLog]:
        triggered_logs: list[AlertLog] = []
        alerts = list(db.scalars(select(Alert).where(Alert.is_active == True)))  # noqa: E712

        for alert in alerts:
            history = rate_repository.history_for_symbol(db, alert.symbol, 7)
            latest = rate_repository.latest_for_symbol(db, alert.symbol)
            if latest is None:
                continue

            previous = history[-2] if len(history) >= 2 else None
            if not self._condition_matches(alert, latest.close, previous.close if previous else None):
                continue
            if self._was_recently_triggered(db, alert.id):
                continue

            message = f"{alert.symbol} {alert.alert_type} {alert.target_price} triggered at {latest.close}"
            tokens = list(
                db.scalars(
                    select(DeviceToken).where(DeviceToken.user_id == alert.user_id, DeviceToken.is_active == True)  # noqa: E712
                )
            )
            send_results = [
                notification_service.send_price_alert(token.token, "Forex alert triggered", message)
                for token in tokens
            ]
            if not send_results:
                send_results = [{"ok": True, "mode": "mock", "message": "No device token registered."}]

            log = AlertLog(alert_id=alert.id, message=f"{message} | notifications={send_results}")
            db.add(log)
            triggered_logs.append(log)
            logger.info(
                "alert_triggered",
                extra={
                    "alert_id": alert.id,
                    "user_id": alert.user_id,
                    "symbol": alert.symbol,
                    "alert_type": alert.alert_type,
                    "target_price": alert.target_price,
                    "latest_close": latest.close,
                    "notification_count": len(tokens),
                },
            )

        try:
            db.commit()
            for log in triggered_logs:
                db.refresh(log)
            return triggered_logs
        except Exception:
            db.rollback()
            logger.exception("alert_evaluation_persist_failed")
            raise


alert_service = AlertService()
