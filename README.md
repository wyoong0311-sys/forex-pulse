# Forex Pulse Workspace

This workspace now contains three parts:

- `mobile/` - Expo / React Native app for market monitoring, pair detail, alerts, insights, and settings
- `backend/` - FastAPI starter for forex data, predictions, alerts, and backtesting
- `src/` - the earlier web dashboard prototype
- `docs/PHASE1_STRUCTURE.md` - exact Phase 1 project structure
- `docs/PHASE2_DATA_PIPELINE.md` - verified real-rate data pipeline notes
- `docs/PHASE3_ALERTS.md` - verified alert and notification flow notes
- `docs/PHASE4_PREDICTIONS.md` - prediction generation and persistence notes
- `docs/PHASE5_BACKTESTING.md` - backtesting and model accuracy tracking notes
- `docs/PHASE6_PRODUCTION_HARDENING.md` - production hardening and deployment notes
- `docs/PHASE7_MARKET_INTELLIGENCE.md` - model ranking and market insight notes
- `docs/PHASE8_USER_PERSISTENCE.md` - watchlist, preferences, summaries, and export notes

## Recommended build order

1. Replace the local auth stub with JWT/session auth before real multi-user production
2. Harden user-owned records with authorization checks
3. Deploy the backend with PostgreSQL or Supabase through `DATABASE_URL`
4. Add real Firebase credentials and real device testing
5. Keep running prediction and backtest jobs against live stored closes
6. Use the accuracy dashboard before changing the prediction model
7. Use model rankings before adding new forecast features

## Quick start

### Mobile

```bash
cd mobile
npm install
npm start
```

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Notes

- Mobile push is scaffolded with Expo notifications and production-ready Firebase direction.
- Backend forecasting now includes baseline and XGBoost accuracy tracking. The app should treat model performance as evidence, not certainty.
- If you later want, this can be converted into a proper monorepo with shared types and a single root task runner.
