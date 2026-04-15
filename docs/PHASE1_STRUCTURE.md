# Phase 1 Folder Structure

```text
.
├── backend
│   ├── .env.example
│   ├── requirements.txt
│   └── app
│       ├── api/routes
│       │   ├── alerts.py
│       │   ├── backtests.py
│       │   ├── dashboard.py
│       │   ├── devices.py
│       │   ├── health.py
│       │   ├── notifications.py
│       │   ├── pairs.py
│       │   ├── predictions.py
│       │   └── rates.py
│       ├── core/config.py
│       ├── db
│       │   ├── base.py
│       │   ├── models.py
│       │   └── session.py
│       ├── jobs/scheduler.py
│       ├── schemas
│       │   ├── alerts.py
│       │   ├── backtests.py
│       │   ├── devices.py
│       │   ├── pairs.py
│       │   ├── predictions.py
│       │   └── rates.py
│       └── services
│           ├── backtesting.py
│           ├── forecasting.py
│           ├── market_data.py
│           └── notifications.py
├── mobile
│   ├── App.js
│   ├── app.json
│   └── src
│       ├── components
│       │   ├── AccuracyCard.js
│       │   ├── AlertForm.js
│       │   ├── AlertRow.js
│       │   ├── ForecastCard.js
│       │   ├── PriceChart.js
│       │   ├── PriceSparkline.js
│       │   └── RateCard.js
│       ├── config/appConfig.js
│       ├── constants/pairs.js
│       ├── data/mockData.js
│       ├── hooks/useDashboardData.js
│       ├── navigation/RootNavigator.js
│       ├── screens
│       │   ├── AlertsScreen.js
│       │   ├── HomeScreen.js
│       │   ├── InsightsScreen.js
│       │   ├── PairDetailScreen.js
│       │   └── SettingsScreen.js
│       ├── services
│       │   ├── apiClient.js
│       │   ├── forexService.js
│       │   └── notifications.js
│       ├── state/AppContext.js
│       ├── theme
│       └── types/apiTypes.js
└── docs
    ├── ARCHITECTURE.md
    └── PHASE1_STRUCTURE.md
```

## Phase 1 Scope

- Mobile navigation and mock UI are in place.
- Backend route skeletons are in place.
- Database models exist for users, device tokens, rates, predictions, alerts, alert logs, and backtest results.
- Scheduled job stubs exist for fetching data, generating predictions, and checking alerts.
- Prediction remains a baseline service until Phase 2 replaces it with a stronger forecasting model and persisted accuracy checks.
