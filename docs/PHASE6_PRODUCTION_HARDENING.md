# Phase 6 Production Hardening

Phase 6 focuses on reliability and deployment readiness. It does not redesign the mobile app or change the product scope.

## Implemented

- PostgreSQL and Supabase-ready `DATABASE_URL` support stays enabled through SQLAlchemy.
- SQLite remains the local development default.
- Database engine now uses `pool_pre_ping` and `pool_recycle` to reduce stale connection failures.
- Provider requests now use configured timeout and retry attempts.
- Firebase notification sends now retry before returning a failure response.
- Scheduled jobs now log start, finish, failure, and skipped-overlap events.
- Scheduled jobs now use both APScheduler `max_instances=1` and in-process async locks.
- Rate persistence, prediction persistence, alert triggers, provider failures, and notification sends now emit structured logs.
- Startup environment validation blocks unsafe production configuration.
- Health endpoints:
  - `GET /health`
  - `GET /health/db`
  - `GET /health/provider`
  - the same health endpoints also work under `/api/v1`

## Production Backend Environment

Use a managed PostgreSQL database or Supabase:

```bash
APP_ENV=production
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/postgres?sslmode=require
FOREX_PROVIDER_URL=https://api.frankfurter.dev/v1
PROVIDER_TIMEOUT_SECONDS=12
PROVIDER_RETRY_ATTEMPTS=3
LOG_LEVEL=INFO
LOG_FORMAT=json
MOCK_DATA_ENABLED=false
NOTIFICATION_MOCK_ENABLED=false
FIREBASE_CREDENTIALS_PATH=/run/secrets/firebase-service-account.json
NOTIFICATION_RETRY_ATTEMPTS=2
```

Startup validation fails in production if SQLite is used, mock data is enabled, mock notifications are enabled, or the Firebase credentials file is missing.

## Firebase Push Notifications

For real push delivery:

- Create a Firebase project.
- Add the mobile app to the Firebase project.
- Generate a Firebase Admin service account JSON file.
- Store that JSON as a secret in the backend hosting platform.
- Set `FIREBASE_CREDENTIALS_PATH` to the mounted secret path.
- Set `NOTIFICATION_MOCK_ENABLED=false`.
- Register a real device token from the mobile app.
- Send a test notification:

```powershell
Invoke-RestMethod -Method Post 'https://your-api.example.com/notifications/test' -ContentType 'application/json' -Body '{"token":"REAL_DEVICE_TOKEN","title":"Forex Pulse test","body":"Production push is connected."}'
```

Local verification still uses mock mode unless valid Firebase credentials and a real device token are present.

## Backend Deployment Notes

- Use a Python runtime compatible with the current local backend, such as Python 3.12.
- Install dependencies with `pip install -r requirements.txt`.
- Run with a production ASGI server command such as:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

- Configure all production environment variables before startup.
- Confirm deployment health:

```powershell
Invoke-RestMethod 'https://your-api.example.com/health'
Invoke-RestMethod 'https://your-api.example.com/health/db'
Invoke-RestMethod 'https://your-api.example.com/health/provider'
```

## Database Notes

- SQLite is only for local proof and development.
- Use PostgreSQL or Supabase for deployed multi-user data.
- The current app uses SQLAlchemy model creation and safe local SQLite column additions. For a larger production rollout, add Alembic migrations before changing schemas again.
- Keep database credentials out of source control.

## Mobile Deployment Notes

Set the mobile API base URL before building:

```bash
EXPO_PUBLIC_API_BASE_URL=https://your-api.example.com
```

Rebuild the Expo app after changing `EXPO_PUBLIC_API_BASE_URL`; Expo public variables are bundled into the app at build time.

## Verification Performed Locally

```powershell
Invoke-RestMethod 'http://127.0.0.1:8000/health'
Invoke-RestMethod 'http://127.0.0.1:8000/health/db'
Invoke-RestMethod 'http://127.0.0.1:8000/health/provider'
Invoke-RestMethod -Method Post 'http://127.0.0.1:8000/notifications/test' -ContentType 'application/json' -Body '{"token":"phase6-local-token","title":"Phase 6 test","body":"Mock notification path is available."}'
```

Verified local health results:

- `/health`: `ok`
- `/health/db`: database reachable
- `/health/provider`: Frankfurter returned `USDMYR`
- `/notifications/test`: mock notification path returned `ok`
