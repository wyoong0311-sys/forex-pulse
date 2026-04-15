from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import User, UserPreference, WatchlistItem


DEFAULT_WATCHLIST = ["USDMYR", "EURUSD", "GBPUSD", "USDJPY"]
SUPPORTED_WATCHLIST_SYMBOLS = set(DEFAULT_WATCHLIST)


class UserPreferenceService:
    def ensure_user(self, db: Session, user_id: int) -> User:
        user = db.get(User, user_id)
        if user:
            return user
        user = User(id=user_id)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def watchlist(self, db: Session, user_id: int) -> list[WatchlistItem]:
        self.ensure_user(db, user_id)
        items = list(
            db.scalars(
                select(WatchlistItem)
                .where(WatchlistItem.user_id == user_id)
                .order_by(WatchlistItem.display_order.asc(), WatchlistItem.created_at.asc())
            )
        )
        if items:
            return items

        seeded: list[WatchlistItem] = []
        for index, symbol in enumerate(DEFAULT_WATCHLIST):
            item = WatchlistItem(user_id=user_id, symbol=symbol, display_order=index)
            db.add(item)
            seeded.append(item)
        db.commit()
        for item in seeded:
            db.refresh(item)
        return seeded

    def add_watchlist_item(self, db: Session, user_id: int, symbol: str, display_order: int = 0) -> WatchlistItem:
        normalized = symbol.replace("/", "").upper()
        if normalized not in SUPPORTED_WATCHLIST_SYMBOLS:
            raise ValueError(f"{normalized} is not supported yet.")
        existing = db.scalar(
            select(WatchlistItem).where(WatchlistItem.user_id == user_id, WatchlistItem.symbol == normalized)
        )
        if existing:
            return existing

        item = WatchlistItem(user_id=user_id, symbol=normalized, display_order=display_order)
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    def delete_watchlist_item(self, db: Session, item_id: int) -> bool:
        item = db.get(WatchlistItem, item_id)
        if not item:
            return False
        db.delete(item)
        db.commit()
        return True

    def preferences(self, db: Session, user_id: int) -> UserPreference:
        self.ensure_user(db, user_id)
        preference = db.scalar(select(UserPreference).where(UserPreference.user_id == user_id))
        if preference:
            return preference
        preference = UserPreference(user_id=user_id)
        db.add(preference)
        db.commit()
        db.refresh(preference)
        return preference

    def update_preferences(self, db: Session, user_id: int, updates: dict) -> UserPreference:
        preference = self.preferences(db, user_id)
        for key, value in updates.items():
            if value is not None and hasattr(preference, key):
                setattr(preference, key, value)
        preference.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(preference)
        return preference


user_preference_service = UserPreferenceService()
