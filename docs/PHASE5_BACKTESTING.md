# Phase 5 Backtesting and Accuracy Tracking

Phase 5 adds objective forecast evaluation. It does not change the prediction model, add trading advice, or add news/macro features.

## Implemented

- Backtest persistence now uses the existing `backtest_results` table.
- Local SQLite schema migration adds:
  - `samples_used`
  - `beats_baseline`
- Backtests compare predictions and baseline forecasts against stored actual rates.
- Metrics stored for each model:
  - `MAE`
  - `RMSE`
  - `MAPE`
  - `directional_accuracy`
  - `samples_used`
  - `beats_baseline`
- Models evaluated:
  - `naive-previous-close-baseline-v1`
  - `moving-average-baseline-v1`
  - `xgboost-features-v1`
- XGBoost uses historical walk-forward scoring from stored rates so the practical model can be evaluated before new live forecasts mature.
- Scheduled backtest job runs every 6 hours and after scheduled prediction generation.
- Manual backtest execution is available through the API.

## Endpoints

```powershell
Invoke-RestMethod 'http://127.0.0.1:8000/predictions/backtest/USDMYR'
Invoke-RestMethod 'http://127.0.0.1:8000/predictions/performance/USDMYR'
Invoke-RestMethod 'http://127.0.0.1:8000/predictions/performance-summary'
Invoke-RestMethod -Method Post 'http://127.0.0.1:8000/backtests/run' -ContentType 'application/json' -Body '{"symbol":"USDMYR","lookback_days":90}'
```

The same routes are also available under `/api/v1`.

## Local Verification

Run the backtest job directly:

```powershell
cd backend
.\.venv\Scripts\python.exe -c "import asyncio; from app.jobs.scheduler import run_backtests; asyncio.run(run_backtests()); print('backtests ok')"
```

Check `USD/MYR` performance:

```powershell
Invoke-RestMethod 'http://127.0.0.1:8000/predictions/performance/USDMYR' | ConvertTo-Json -Depth 10
```

Verified local `USD/MYR` sample output:

- `naive-previous-close-baseline-v1`: MAE `0.012893`, RMSE `0.017287`, MAPE `0.3258`, directional accuracy `51.79%`, samples `56`
- `moving-average-baseline-v1`: MAE `0.02339`, RMSE `0.03118`, MAPE `0.5908`, directional accuracy `44.64%`, samples `56`
- `xgboost-features-v1`: MAE `0.017489`, RMSE `0.022652`, MAPE `0.4424`, directional accuracy `46.51%`, samples `43`

Current local truth: `xgboost-features-v1` does not beat the naive baseline on `USD/MYR` yet. That is useful product feedback, not a failure.

## Mobile Display

The Insights screen now shows:

- latest scored model accuracy
- best model summary
- MAE, RMSE, MAPE, and directional accuracy
- baseline vs model comparison
- last 7 persisted predictions
- a note that performance is forecast evaluation, not trading advice

## Not Included Yet

- Changing prediction model architecture
- News sentiment
- Macro event features
- Buy/sell recommendations
- Production-grade model monitoring dashboards
