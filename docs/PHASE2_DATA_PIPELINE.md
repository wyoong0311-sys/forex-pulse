# Phase 2 Data Pipeline

Phase 2 intentionally avoids AI prediction work. The only goal is to prove this path:

```text
Frankfurter provider -> FastAPI fetch -> rates table -> rates endpoint -> mobile chart service
```

## Implemented

- Backend starts and `/docs` returns `200 OK`.
- SQLite local database initializes automatically from SQLAlchemy models.
- PostgreSQL/Supabase is supported through `DATABASE_URL` using the `postgresql+psycopg://...` driver.
- `USD/MYR`, `EUR/USD`, `GBP/USD`, and `USD/JPY` are enabled for rate endpoints.
- `GET /rates/latest?symbols=USDMYR`
- `GET /rates/history/USDMYR?range=7d`
- `GET /rates/history/USDMYR?range=30d`
- `GET /rates/history/USDMYR?range=90d`
- `GET /rates/history/USDMYR?range=1y`
- Scheduled fetch job stores latest watchlist rates every 15 minutes.
- Mobile `loadDashboard` and `loadPairDetail` use backend rate endpoints first, with mock fallback only on failure.

## Verified Locally

- `USD/MYR` latest returned source `frankfurter` with close `3.975` for `2026-04-13`.
- `USD/MYR` history returned DB-backed `frankfurter` rows for the `7d` and `30d` ranges.
- Manual scheduled fetch job completed with `fetch job ok`.
- Mobile web export passed with the updated backend rate flow.

## Still Next

- Add a real PostgreSQL/Supabase database URL and run against it instead of local SQLite.
- Add migrations with Alembic before production deployment.
- Add alert/notification persistence in Phase 3.
- Leave prediction engine work for Phase 4.
