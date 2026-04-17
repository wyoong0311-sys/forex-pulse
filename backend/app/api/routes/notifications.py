from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import DeviceToken
from app.db.session import get_db
from app.services.notifications import notification_service


router = APIRouter()


class TestNotificationRequest(BaseModel):
    token: str
    title: str = "Forex Pulse test"
    body: str = "Your notification flow is connected."

class UserNotificationRequest(BaseModel):
    user_id: int
    title: str = "Forex Pulse test"
    body: str = "Your notification flow is connected."


@router.post("/notifications/test")
async def send_test_notification(payload: TestNotificationRequest) -> dict:
    return notification_service.send_price_alert(payload.token, payload.title, payload.body)


@router.post("/notifications/test-user")
async def send_test_notification_for_user(payload: UserNotificationRequest, db: Session = Depends(get_db)) -> dict:
    tokens = list(
        db.scalars(
            select(DeviceToken).where(DeviceToken.user_id == payload.user_id, DeviceToken.is_active == True)  # noqa: E712
        )
    )
    if not tokens:
        return {"ok": False, "message": "No active device tokens found for this user.", "user_id": payload.user_id}

    results = [
        notification_service.send_price_alert(token.token, payload.title, payload.body)
        for token in tokens
    ]
    return {
        "ok": any(result.get("ok") for result in results),
        "user_id": payload.user_id,
        "token_count": len(tokens),
        "results": results,
    }
