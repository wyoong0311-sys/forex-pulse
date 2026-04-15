# Forex Pulse Architecture

## Mobile

- Expo / React Native client in `/mobile`
- Bottom tabs for `Market`, `Alerts`, `Insights`, and `Settings`
- Stack navigation for `Home -> Pair Detail`
- Notification registration in `mobile/src/services/notifications.js`

## Backend

- FastAPI app in `/backend`
- Routes for dashboard, pair detail, predictions, alerts, and backtests
- SQLAlchemy models for snapshots, predictions, alerts, and backtest results
- Forecasting service starts with a transparent baseline so accuracy tracking is possible from day one
- Scheduled job stubs live in `backend/app/jobs/scheduler.py`
- Exact Phase 1 tables are represented: `users`, `device_tokens`, `rates`, `predictions`, `alerts`, `alert_logs`, and `backtest_results`

## Suggested next integrations

1. Replace the market data adapter with a provider you trust in production.
2. Persist alerts, device tokens, and forecasts in PostgreSQL or Supabase.
3. Run a scheduled prediction job and score each forecast against the next actual close.
4. Add authentication before exposing private alerts and push tokens.
