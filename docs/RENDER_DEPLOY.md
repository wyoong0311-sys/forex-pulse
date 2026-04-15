# Render Deploy

This project is ready for a Render web-service deploy once the code is in a GitHub repository.

## Service type

- Create a `Web Service`
- Point Render at the repo root
- Render will read [render.yaml](</D:/Crypto Or Forex/render.yaml>)

## Required production environment

- `DATABASE_URL`
  Use a PostgreSQL connection string, ideally from Supabase:
  `postgresql+psycopg://USER:PASSWORD@HOST:5432/postgres?sslmode=require`

## Recommended first deploy values

- `APP_ENV=production`
- `MOCK_DATA_ENABLED=false`
- `NOTIFICATION_MOCK_ENABLED=true`

That keeps the public backend live even before Firebase server credentials are added.

## Push notifications later

When ready for real push delivery:

1. Upload or mount the Firebase Admin service-account JSON
2. Set `FIREBASE_CREDENTIALS_PATH` to that file path
3. Set `NOTIFICATION_MOCK_ENABLED=false`
4. Redeploy

## Mobile app

After Render gives you the public backend URL:

1. put that URL into [mobile/.env](</D:/Crypto Or Forex/mobile/.env>) as `EXPO_PUBLIC_API_BASE_URL`
2. rebuild the APK

## Current blocker

Render deployment still needs a remote Git repository. This machine currently does not have Git installed, and the browser session is not signed into GitHub yet.
