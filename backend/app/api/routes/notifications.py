from pydantic import BaseModel
from fastapi import APIRouter

from app.services.notifications import notification_service


router = APIRouter()


class TestNotificationRequest(BaseModel):
    token: str
    title: str = "Forex Pulse test"
    body: str = "Your notification flow is connected."


@router.post("/notifications/test")
async def send_test_notification(payload: TestNotificationRequest) -> dict:
    return notification_service.send_price_alert(payload.token, payload.title, payload.body)
