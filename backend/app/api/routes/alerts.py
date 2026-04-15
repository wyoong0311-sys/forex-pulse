from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.alerts import AlertCreate, AlertLogRead, AlertRead, AlertUpdate
from app.services.alert_service import alert_service


router = APIRouter()


def _read_alert(alert) -> AlertRead:
    return AlertRead(
        id=alert.id,
        user_id=alert.user_id,
        symbol=alert.symbol,
        alert_type=alert.alert_type,
        target_price=alert.target_price,
        is_active=alert.is_active,
        created_at=alert.created_at,
    )


def _read_log(log) -> AlertLogRead:
    return AlertLogRead(id=log.id, alert_id=log.alert_id, message=log.message, sent_at=log.sent_at)


@router.post("/alerts", response_model=AlertRead)
async def create_alert(payload: AlertCreate, db: Session = Depends(get_db)) -> AlertRead:
    alert = alert_service.create_alert(
        db,
        user_id=payload.user_id,
        symbol=payload.symbol,
        alert_type=payload.alert_type,
        target_price=payload.target_price,
    )
    return _read_alert(alert)


@router.get("/alerts/{user_id}", response_model=list[AlertRead])
async def get_alerts(user_id: int, db: Session = Depends(get_db)) -> list[AlertRead]:
    return [_read_alert(alert) for alert in alert_service.alerts_for_user(db, user_id)]


@router.get("/alerts/logs/{user_id}", response_model=list[AlertLogRead])
async def get_alert_logs(user_id: int, db: Session = Depends(get_db)) -> list[AlertLogRead]:
    return [_read_log(log) for log in alert_service.alert_logs_for_user(db, user_id)]


@router.patch("/alerts/{alert_id}", response_model=AlertRead)
async def update_alert(alert_id: int, payload: AlertUpdate, db: Session = Depends(get_db)) -> AlertRead:
    alert = alert_service.update_alert(
        db,
        alert_id,
        alert_type=payload.alert_type,
        target_price=payload.target_price,
        is_active=payload.is_active,
    )
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return _read_alert(alert)


@router.delete("/alerts/{alert_id}")
async def delete_alert(alert_id: int, db: Session = Depends(get_db)) -> dict[str, bool]:
    deleted = alert_service.delete_alert(db, alert_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"deleted": True}
