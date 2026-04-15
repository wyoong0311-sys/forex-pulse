# Phase 4 Prediction Engine

Phase 4 intentionally avoids buy/sell advice and backtesting. The goal is to generate, persist, and display short-term forecasts while clearly separating actual rates from predicted values.

## Implemented

- Prediction persistence uses the existing `predictions` table.
- The table now stores:
  - `symbol`
  - `prediction_time`
  - `forecast_target_time`
  - `predicted_close`
  - `lower_bound`
  - `upper_bound`
  - `confidence_score`
  - `direction`
  - `model_name`
- Safe SQLite column migration is included for local development.
- Scheduled prediction job runs after rates are updated.
- Prediction job backfills 90 days of rates for:
  - `USD/MYR`
  - `EUR/USD`
  - `GBP/USD`
  - `USD/JPY`
- Baselines:
  - `naive-previous-close-baseline-v1` for very limited history
  - `moving-average-baseline-v1` when short history exists
- Practical model:
  - `xgboost-features-v1`
- Engineered features:
  - previous close
  - rolling mean
  - rolling volatility
  - momentum
  - RSI
  - moving average crossover
  - day of week

## Endpoints

```powershell
Invoke-RestMethod 'http://127.0.0.1:8000/predictions/latest/USDMYR'
Invoke-RestMethod 'http://127.0.0.1:8000/predictions/history/USDMYR'
```

## Local Verification

Run the prediction job:

```powershell
cd backend
.\.venv\Scripts\python.exe -c "import asyncio; from app.jobs.scheduler import generate_predictions; asyncio.run(generate_predictions()); print('prediction job ok')"
```

Check persisted rows:

```powershell
.\.venv\Scripts\python.exe -c "from app.db.session import SessionLocal; from app.db.models import Prediction; db=SessionLocal(); print([(p.symbol,p.model_name,p.predicted_close) for p in db.query(Prediction).order_by(Prediction.prediction_time.desc()).limit(4)]); db.close()"
```

Verified latest outputs used `xgboost-features-v1` for:

- `USDMYR`
- `EURUSD`
- `GBPUSD`
- `USDJPY`

## Mobile Display

The Pair Detail screen now shows:

- actual chart from backend rate history
- separate predicted close line
- confidence score
- direction label
- model name
- forecast target time
- an explicit note that the forecast is not financial advice

## Not Included Yet

- Backtesting
- Accuracy scoring
- Trading advice
- Buy/sell recommendations
