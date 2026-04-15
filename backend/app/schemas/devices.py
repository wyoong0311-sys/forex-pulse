from pydantic import BaseModel


class DeviceTokenCreate(BaseModel):
    user_id: int
    platform: str
    token: str


class DeviceTokenRead(DeviceTokenCreate):
    id: int
    is_active: bool = True
