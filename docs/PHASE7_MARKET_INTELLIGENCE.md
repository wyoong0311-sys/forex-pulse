# Phase 7 Market Intelligence

Phase 7 improves forecast interpretation and market context without adding buy/sell advice or pretending exact certainty.

## Implemented

- Added model comparison service:
  - ranks models per symbol from latest backtest results
  - prefers recent MAE, with tiny tie-breakers for RMSE and directional accuracy
  - exposes the best model by symbol
- Prediction generation now creates candidate forecasts from:
  - `naive-previous-close-baseline-v1`
  - `moving-average-baseline-v1`
  - `xgboost-features-v1` when enough history exists
- Prediction generation selects the best available model from recent backtest ranking instead of blindly choosing the heavier model.
- Forecast confidence is now adjusted using recent backtest behavior:
  - directional accuracy
  - MAPE
  - sample count
- Added volatility regime detection:
  - `normal volatility`
  - `elevated volatility`
  - `high volatility`
- Added insights endpoints:
  - `GET /insights/volatility`
  - `GET /insights/top-movers`
  - `GET /insights/model-rankings`
  - `GET /insights/forecast-summary`
- The same endpoints are available under `/api/v1`.
- Added feature flags for future enrichment:
  - `FEATURE_MACRO_CALENDAR_ENABLED=false`
  - `FEATURE_NEWS_SENTIMENT_ENABLED=false`

These feature flags are placeholders only. News sentiment and macro calendar ingestion are not implemented in this phase.

## Mobile Display

The Insights screen now shows:

- strongest mover
- weakest mover
- volatility regimes and volatility spikes
- forecast summary with performance-adjusted confidence
- best model by symbol
- existing backtest accuracy metrics
- last 7 persisted predictions

## Local Verification

```powershell
cd backend
Invoke-RestMethod 'http://127.0.0.1:8000/insights/volatility' | ConvertTo-Json -Depth 8
Invoke-RestMethod 'http://127.0.0.1:8000/insights/top-movers' | ConvertTo-Json -Depth 8
Invoke-RestMethod 'http://127.0.0.1:8000/insights/model-rankings' | ConvertTo-Json -Depth 8
Invoke-RestMethod 'http://127.0.0.1:8000/insights/forecast-summary' | ConvertTo-Json -Depth 8
```

Sample local observations:

- `USDJPY` was the strongest mover at `0.402%`.
- `EURUSD` was the weakest mover at `-0.2306%`.
- All tracked symbols were in `elevated volatility` based on recent stored rates.
- `USDMYR` model ranking currently favors `naive-previous-close-baseline-v1` by recent MAE.

## Important Constraint

The app still does not make buy/sell recommendations. These insights describe model behavior and market movement; they do not guarantee outcomes.
