from __future__ import annotations

from datetime import datetime
import asyncio
import logging
import uuid

import httpx
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import BrokerConnection, Rate, TradeOrder
from app.services.user_preferences import user_preference_service


logger = logging.getLogger(__name__)


class TradingError(RuntimeError):
    pass


class TradingService:
    @property
    def allowed_symbols(self) -> set[str]:
        return {
            token.strip().replace("/", "").upper()
            for token in settings.trading_allowed_symbols.split(",")
            if token.strip()
        }

    def _normalize_symbol(self, symbol: str) -> str:
        return symbol.replace("/", "").upper()

    def _latest_price(self, db: Session, symbol: str) -> float | None:
        latest = db.scalar(
            select(Rate)
            .where(Rate.symbol == symbol)
            .order_by(desc(Rate.captured_at), desc(Rate.id))
        )
        return latest.close if latest else None

    def _connection(self, db: Session, user_id: int) -> BrokerConnection | None:
        return db.scalar(
            select(BrokerConnection)
            .where(BrokerConnection.user_id == user_id, BrokerConnection.broker == "ctrader")
            .order_by(desc(BrokerConnection.updated_at), desc(BrokerConnection.id))
        )

    def upsert_connection(
        self,
        db: Session,
        user_id: int,
        mode: str,
        account_id: str | None,
        is_enabled: bool,
    ) -> BrokerConnection:
        user_preference_service.ensure_user(db, user_id)
        connection = self._connection(db, user_id)
        now = datetime.utcnow()
        if connection is None:
            connection = BrokerConnection(
                user_id=user_id,
                broker="ctrader",
                mode=mode,
                account_id=account_id,
                is_enabled=is_enabled,
                created_at=now,
                updated_at=now,
            )
            db.add(connection)
        else:
            connection.mode = mode
            connection.account_id = account_id
            connection.is_enabled = is_enabled
            connection.updated_at = now
        db.commit()
        db.refresh(connection)
        return connection

    def broker_status(self, db: Session, user_id: int) -> dict:
        connection = self._connection(db, user_id)
        return {
            "trading_enabled": settings.trading_enabled,
            "dry_run": settings.trading_dry_run,
            "bridge_configured": bool(settings.ctrader_bridge_url.strip()),
            "allowed_symbols": sorted(self.allowed_symbols),
            "max_units_per_order": settings.trading_max_units_per_order,
            "active_connection": connection,
        }

    def orders_for_user(self, db: Session, user_id: int, limit: int = 50) -> list[TradeOrder]:
        return list(
            db.scalars(
                select(TradeOrder)
                .where(TradeOrder.user_id == user_id)
                .order_by(desc(TradeOrder.created_at), desc(TradeOrder.id))
                .limit(limit)
            )
        )

    async def _send_bridge_order(self, payload: dict) -> tuple[str, str]:
        last_error: Exception | None = None
        headers = {"Content-Type": "application/json"}
        if settings.ctrader_bridge_api_key.strip():
            headers["X-API-Key"] = settings.ctrader_bridge_api_key.strip()

        for attempt in range(1, settings.ctrader_retry_attempts + 1):
            try:
                async with httpx.AsyncClient(timeout=settings.ctrader_timeout_seconds) as client:
                    response = await client.post(settings.ctrader_bridge_url, json=payload, headers=headers)
                    response.raise_for_status()
                    body = response.json() if response.content else {}
                external_order_id = str(body.get("order_id") or body.get("id") or uuid.uuid4())
                return external_order_id, str(body.get("message") or "accepted_by_bridge")
            except Exception as error:  # pragma: no cover - defensive logging around external transport
                last_error = error
                logger.warning(
                    "ctrader_bridge_order_failed",
                    extra={
                        "attempt": attempt,
                        "max_attempts": settings.ctrader_retry_attempts,
                        "error": str(error),
                    },
                )
                if attempt < settings.ctrader_retry_attempts:
                    await asyncio.sleep(min(2 ** (attempt - 1), 4))

        raise TradingError(f"cTrader bridge request failed: {last_error}") from last_error

    async def submit_order(
        self,
        db: Session,
        *,
        user_id: int,
        symbol: str,
        side: str,
        volume_units: float,
        order_type: str = "market",
        stop_loss: float | None = None,
        take_profit: float | None = None,
        client_note: str | None = None,
    ) -> TradeOrder:
        normalized_symbol = self._normalize_symbol(symbol)
        if normalized_symbol not in self.allowed_symbols:
            raise TradingError(f"{normalized_symbol} is not enabled for auto-trading.")

        if volume_units > settings.trading_max_units_per_order:
            raise TradingError(
                f"Requested volume {volume_units} exceeds TRADING_MAX_UNITS_PER_ORDER={settings.trading_max_units_per_order}."
            )

        connection = self._connection(db, user_id)
        if connection is None or not connection.is_enabled:
            raise TradingError("No active cTrader connection for this user. Configure /trading/connect/ctrader first.")

        requested_price = self._latest_price(db, normalized_symbol)
        mode = "dry-run"
        status = "simulated"
        reason = "simulated_execution"
        external_order_id: str | None = None
        filled_price = requested_price

        if not settings.trading_enabled:
            reason = "trading_disabled_by_server"
        elif not settings.trading_dry_run and settings.ctrader_bridge_url.strip():
            payload = {
                "broker": "ctrader",
                "mode": connection.mode,
                "account_id": connection.account_id or settings.ctrader_account_id or None,
                "symbol": normalized_symbol,
                "side": side.lower(),
                "volume_units": volume_units,
                "order_type": order_type,
                "stop_loss": stop_loss,
                "take_profit": take_profit,
                "client_note": client_note,
            }
            external_order_id, reason = await self._send_bridge_order(payload)
            mode = "live-bridge"
            status = "submitted"
        elif not settings.trading_dry_run:
            raise TradingError("Live trading mode requires CTRADER_BRIDGE_URL to be configured.")

        order = TradeOrder(
            user_id=user_id,
            symbol=normalized_symbol,
            side=side.lower(),
            volume_units=volume_units,
            order_type=order_type,
            stop_loss=stop_loss,
            take_profit=take_profit,
            status=status,
            execution_mode=mode,
            execution_reason=reason,
            external_order_id=external_order_id,
            requested_price=requested_price,
            filled_price=filled_price,
            created_at=datetime.utcnow(),
        )
        db.add(order)
        db.commit()
        db.refresh(order)
        logger.info(
            "trade_order_submitted",
            extra={
                "order_id": order.id,
                "user_id": user_id,
                "symbol": normalized_symbol,
                "side": side,
                "volume_units": volume_units,
                "status": status,
                "execution_mode": mode,
            },
        )
        return order


trading_service = TradingService()
