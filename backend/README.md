# Forex Pulse Backend

FastAPI starter for quotes, history, prediction, alerts, and backtesting.

## Endpoints

- `GET /api/v1/health`
- `GET /api/v1/health/db`
- `GET /api/v1/health/provider`
- `GET /api/v1/dashboard`
- `GET /api/v1/rates/latest?symbols=USDMYR,EURUSD`
- `GET /api/v1/rates/history/{symbol}?range=30d`
- `GET /api/v1/predictions/latest/{symbol}`
- `GET /api/v1/predictions/history/{symbol}`
- `GET /api/v1/predictions/backtest/{symbol}`
- `GET /api/v1/predictions/performance/{symbol}`
- `GET /api/v1/predictions/performance-summary`
- `GET /api/v1/insights/volatility`
- `GET /api/v1/insights/top-movers`
- `GET /api/v1/insights/model-rankings`
- `GET /api/v1/insights/forecast-summary`
- `GET /api/v1/trading/status?user_id=1`
- `POST /api/v1/trading/connect/ctrader`
- `POST /api/v1/trading/orders`
- `GET /api/v1/trading/orders/{user_id}`
- `GET /api/v1/auth/session`
- `GET /api/v1/watchlist/{user_id}`
- `POST /api/v1/watchlist`
- `DELETE /api/v1/watchlist/{item_id}`
- `GET /api/v1/preferences/{user_id}`
- `PATCH /api/v1/preferences/{user_id}`
- `GET /api/v1/summary/daily/{user_id}`
- `GET /api/v1/exports/rates/{symbol}.csv`
- `GET /api/v1/exports/predictions/{symbol}.csv`
- `POST /api/v1/alerts`
- `GET /api/v1/alerts/{user_id}`
- `PATCH /api/v1/alerts/{alert_id}`
- `DELETE /api/v1/alerts/{alert_id}`
- `GET /api/v1/alerts/logs/{user_id}`
- `POST /api/v1/devices/register-token`
- `POST /api/v1/notifications/test`
- `POST /api/v1/backtests/run`

## Run

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

For production, use PostgreSQL or Supabase:

```bash
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/postgres?sslmode=require
APP_ENV=production
MOCK_DATA_ENABLED=false
NOTIFICATION_MOCK_ENABLED=false
FIREBASE_CREDENTIALS_PATH=/run/secrets/firebase-service-account.json
```

## Phase 2 local verification

Start the backend:

```powershell
.\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000
```

Open the docs:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/docs
```

Fetch and persist `USD/MYR` latest:

```powershell
Invoke-RestMethod 'http://127.0.0.1:8000/rates/latest?symbols=USDMYR'
```

Fetch and persist `USD/MYR` history:

```powershell
Invoke-RestMethod 'http://127.0.0.1:8000/rates/history/USDMYR?range=7d'
Invoke-RestMethod 'http://127.0.0.1:8000/rates/history/USDMYR?range=30d'
```

Check database rows:

```powershell
.\.venv\Scripts\python.exe -c "from app.db.session import SessionLocal; from app.db.models import Rate; db=SessionLocal(); print(db.query(Rate).filter(Rate.symbol=='USDMYR', Rate.source=='frankfurter').count()); db.close()"
```

## Phase 5 local verification

Run the backtest job:

```powershell
.\.venv\Scripts\python.exe -c "import asyncio; from app.jobs.scheduler import run_backtests; asyncio.run(run_backtests()); print('backtests ok')"
```

Check model performance for `USD/MYR`:

```powershell
Invoke-RestMethod 'http://127.0.0.1:8000/predictions/performance/USDMYR' | ConvertTo-Json -Depth 10
Invoke-RestMethod 'http://127.0.0.1:8000/predictions/performance-summary' | ConvertTo-Json -Depth 10
```

## Notes

- Frankfurter is the default no-key provider for local Phase 2 development.
- Set `DATABASE_URL` to a PostgreSQL or Supabase URL when ready; SQLite is the local fallback.
- Alert notification delivery uses Firebase Admin when credentials are configured, otherwise it records mock notification results for local testing.
- The prediction service currently uses a transparent baseline model so accuracy tracking can start immediately.
- Firebase Admin is included for server-side push dispatch once credentials are added.
- XGBoost is installed for Phase 4 forecasts; the service falls back to baseline models when history is insufficient.
- Backtesting now scores naive baseline, moving-average baseline, and XGBoost with MAE, RMSE, MAPE, directional accuracy, sample counts, and baseline comparison.
- Phase 6 adds structured logs, environment validation, health checks, scheduler overlap protection, and production environment notes.
- Phase 7 adds model rankings, performance-adjusted confidence, volatility regimes, top movers, and forecast summaries without buy/sell advice.
- Phase 8 adds auth-ready user persistence, persistent watchlists, saved preferences, daily summary payloads, and CSV exports.
- cTrader integration is demo-safe by default (`TRADING_DRY_RUN=true`). Real order routing requires your `CTRADER_BRIDGE_URL` endpoint to be configured.

## cTrader quick start (demo-safe)

1. Keep dry-run mode enabled:

```bash
TRADING_ENABLED=true
TRADING_DRY_RUN=true
```

2. Register connection metadata:

```powershell
Invoke-RestMethod 'http://127.0.0.1:8000/api/v1/trading/connect/ctrader' -Method Post -ContentType 'application/json' -Body '{"user_id":1,"mode":"demo","account_id":"your-demo-account-id","is_enabled":true}'
```

3. Submit a test market order (simulated):

```powershell
Invoke-RestMethod 'http://127.0.0.1:8000/api/v1/trading/orders' -Method Post -ContentType 'application/json' -Body '{"user_id":1,"symbol":"EURUSD","side":"buy","volume_units":1000}'
```

4. View order log:

```powershell
Invoke-RestMethod 'http://127.0.0.1:8000/api/v1/trading/orders/1'
```
