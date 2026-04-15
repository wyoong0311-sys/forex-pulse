from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import DeviceToken
from app.db.session import get_db
from app.schemas.devices import DeviceTokenCreate, DeviceTokenRead


router = APIRouter()


@router.post("/devices/register-token", response_model=DeviceTokenRead)
async def register_device_token(payload: DeviceTokenCreate, db: Session = Depends(get_db)) -> DeviceTokenRead:
    existing = db.scalar(
        select(DeviceToken).where(DeviceToken.user_id == payload.user_id, DeviceToken.token == payload.token)
    )

    if existing:
        existing.platform = payload.platform
        existing.is_active = True
        token = existing
    else:
        token = DeviceToken(user_id=payload.user_id, platform=payload.platform, token=payload.token, is_active=True)
        db.add(token)

    db.commit()
    db.refresh(token)
    return DeviceTokenRead(
        id=token.id,
        user_id=token.user_id,
        platform=token.platform,
        token=token.token,
        is_active=token.is_active,
    )
