# Phase 3 Alerts And Notifications

Phase 3 intentionally avoids AI prediction work. The goal is to prove this path:

```text
mobile alert form -> backend alert row -> latest stored rate -> alert evaluator -> alert log -> FCM or mock notification
```

## Implemented

- Database-backed `POST /alerts`
- Database-backed `GET /alerts/{user_id}`
- Database-backed `PATCH /alerts/{alert_id}`
- Soft-delete `DELETE /alerts/{alert_id}`
- Database-backed `POST /devices/register-token`
- Database-backed `GET /alerts/logs/{user_id}`
- Alert evaluator for:
  - `above`
  - `below`
  - `crosses_above`
  - `crosses_below`
- Duplicate-spam cooldown that prevents repeated logs for the same alert within 60 minutes
- Mock notification fallback when Firebase credentials are not configured
- Scheduled alert evaluation after rate fetch and in the periodic alert-check job
- Mobile alert creation form and notification history view
- Mobile device-token registration from Settings, with mock local token support for simulator/web testing

## Local Sample Flow

Start backend:

```powershell
cd backend
.\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000
```

Register a local mock device token:

```powershell
Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8000/devices/register-token' -ContentType 'application/json' -Body '{"user_id":1,"platform":"local","token":"phase3-local-token"}'
```

Create a test alert that should trigger against the current `USD/MYR` rate:

```powershell
Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8000/alerts' -ContentType 'application/json' -Body '{"user_id":1,"symbol":"USDMYR","alert_type":"above","target_price":3.0}'
```

Run alert evaluation:

```powershell
.\.venv\Scripts\python.exe -c "import asyncio; from app.jobs.scheduler import check_alerts_and_send_notifications; asyncio.run(check_alerts_and_send_notifications()); print('alert check ok')"
```

Read alert logs:

```powershell
Invoke-RestMethod 'http://127.0.0.1:8000/alerts/logs/1'
```

## Verified Locally

- A `USD/MYR above 3.0` alert triggered against latest stored rate `3.975`.
- The backend saved an alert log.
- The notification service returned mock FCM success because Firebase credentials are not configured.
- Re-running the evaluator did not create a duplicate log because the spam cooldown blocked it.
- Mobile web export passed with the Phase 3 alert changes.

## Firebase Setup Notes

For real push delivery:

1. Create or open a Firebase project.
2. Add Android and iOS app credentials.
3. Download the Firebase service account JSON.
4. Save it outside version control.
5. Set `FIREBASE_CREDENTIALS_PATH` in backend `.env`.
6. Set `NOTIFICATION_MOCK_ENABLED=false` only after credentials are working.
7. Register real device tokens from the mobile app Settings screen.
