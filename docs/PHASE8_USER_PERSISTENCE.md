# Phase 8 User Persistence and Personalization

Phase 8 adds product-level persistence without adding full authentication yet. The local app continues to use `user_id=1`; this is an auth-ready stub, not production identity management.

## Implemented

- Added persistent watchlist table:
  - `watchlist_items`
- Added persistent preferences table:
  - `user_preferences`
- Added auth-ready local session stub:
  - `GET /auth/session`
- Added watchlist endpoints:
  - `GET /watchlist/{user_id}`
  - `POST /watchlist`
  - `DELETE /watchlist/{item_id}`
- Added preferences endpoints:
  - `GET /preferences/{user_id}`
  - `PATCH /preferences/{user_id}`
- Added daily summary payload endpoint:
  - `GET /summary/daily/{user_id}`
- Added CSV export endpoints:
  - `GET /exports/rates/{symbol}.csv`
  - `GET /exports/predictions/{symbol}.csv`
- The same routes are available under `/api/v1`.
- Mobile Home now loads and manages the persistent watchlist.
- Mobile Settings now loads and saves:
  - refresh interval
  - notification enabled state
  - price alert preference
  - forecast alert preference
  - daily summary preference
  - daily summary time
- Mobile Settings also shows a daily summary payload preview.

## Auth Boundary

This phase intentionally keeps authentication lightweight:

- `GET /auth/session` returns `user_id=1` and `mode=local-stub`.
- Replace this with JWT/session auth before production multi-user release.
- Existing alerts, device tokens, watchlists, and preferences are already shaped around `user_id`, so the later auth swap has a clear path.

## Local Verification

```powershell
cd backend
Invoke-RestMethod 'http://127.0.0.1:8000/auth/session'
Invoke-RestMethod 'http://127.0.0.1:8000/watchlist/1'
Invoke-RestMethod -Method Post 'http://127.0.0.1:8000/watchlist' -ContentType 'application/json' -Body '{"user_id":1,"symbol":"USDMYR"}'
Invoke-RestMethod 'http://127.0.0.1:8000/preferences/1'
Invoke-RestMethod -Method Patch 'http://127.0.0.1:8000/preferences/1' -ContentType 'application/json' -Body '{"refresh_interval_seconds":600,"daily_summary_time":"08:30","daily_summary_enabled":true,"forecast_alerts_enabled":true}'
Invoke-RestMethod 'http://127.0.0.1:8000/summary/daily/1'
(Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:8000/exports/rates/USDMYR.csv').Content.Split("`n") | Select-Object -First 3
(Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:8000/exports/predictions/USDMYR.csv').Content.Split("`n") | Select-Object -First 3
```

Verified local behavior:

- Default watchlist seeds `USDMYR`, `EURUSD`, `GBPUSD`, and `USDJPY`.
- Duplicate watchlist adds return the existing row.
- Unsupported watchlist symbols such as `AUDUSD` return `400`.
- Preferences persist refresh interval and summary settings.
- Daily summary payload includes watchlist, movers, volatility, forecast summary, and best model rows.
- CSV exports return rate history and prediction/backtest rows.
- Mobile web export passes.

## Not Included Yet

- Real login/signup
- JWT validation
- Password or OAuth flows
- Multi-tenant authorization rules
- Server-side daily summary notification scheduling per user
