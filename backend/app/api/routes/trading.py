from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.trading import (
    BrokerConnectionRead,
    BrokerStatusResponse,
    CTraderConnectionUpdate,
    TradeOrderCreate,
    TradeOrderRead,
)
from app.services.trading import TradingError, trading_service


router = APIRouter()


def _read_connection(connection) -> BrokerConnectionRead:
    return BrokerConnectionRead(
        id=connection.id,
        user_id=connection.user_id,
        broker=connection.broker,
        mode=connection.mode,
        account_id=connection.account_id,
        is_enabled=connection.is_enabled,
        created_at=connection.created_at,
        updated_at=connection.updated_at,
    )


def _read_order(order) -> TradeOrderRead:
    return TradeOrderRead(
        id=order.id,
        user_id=order.user_id,
        symbol=order.symbol,
        side=order.side,
        volume_units=order.volume_units,
        order_type=order.order_type,
        stop_loss=order.stop_loss,
        take_profit=order.take_profit,
        status=order.status,
        execution_mode=order.execution_mode,
        execution_reason=order.execution_reason,
        external_order_id=order.external_order_id,
        requested_price=order.requested_price,
        filled_price=order.filled_price,
        created_at=order.created_at,
    )


@router.get("/trading/status", response_model=BrokerStatusResponse)
async def get_trading_status(user_id: int = Query(default=1), db: Session = Depends(get_db)) -> BrokerStatusResponse:
    status = trading_service.broker_status(db, user_id)
    return BrokerStatusResponse(
        trading_enabled=status["trading_enabled"],
        dry_run=status["dry_run"],
        bridge_configured=status["bridge_configured"],
        allowed_symbols=status["allowed_symbols"],
        max_units_per_order=status["max_units_per_order"],
        active_connection=_read_connection(status["active_connection"]) if status["active_connection"] else None,
    )


@router.post("/trading/connect/ctrader", response_model=BrokerConnectionRead)
async def upsert_ctrader_connection(
    payload: CTraderConnectionUpdate,
    db: Session = Depends(get_db),
) -> BrokerConnectionRead:
    connection = trading_service.upsert_connection(
        db,
        user_id=payload.user_id,
        mode=payload.mode,
        account_id=payload.account_id,
        is_enabled=payload.is_enabled,
    )
    return _read_connection(connection)


@router.post("/trading/orders", response_model=TradeOrderRead)
async def submit_trade_order(payload: TradeOrderCreate, db: Session = Depends(get_db)) -> TradeOrderRead:
    try:
        order = await trading_service.submit_order(
            db,
            user_id=payload.user_id,
            symbol=payload.symbol,
            side=payload.side,
            volume_units=payload.volume_units,
            order_type=payload.order_type,
            stop_loss=payload.stop_loss,
            take_profit=payload.take_profit,
            client_note=payload.client_note,
        )
    except TradingError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    return _read_order(order)


@router.get("/trading/orders/{user_id}", response_model=list[TradeOrderRead])
async def list_trade_orders(
    user_id: int,
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[TradeOrderRead]:
    orders = trading_service.orders_for_user(db, user_id=user_id, limit=limit)
    return [_read_order(order) for order in orders]
