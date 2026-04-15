# Forex Pulse Mobile

Expo / React Native starter for:

- `Home`
- `Pair Detail`
- `Alerts`
- `Insights`
- `Settings`

## Run

```bash
npm install
npm start
```

## Environment

The app now uses `app.config.js` plus environment variables.

Create a `.env` file from `.env.example` and set at minimum:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_ANDROID_PACKAGE`
- `EXPO_PUBLIC_EAS_PROJECT_ID`

If you are enabling Android push notifications, also set:

- `GOOGLE_SERVICES_JSON=./google-services.json`

If you want a production-oriented starter, copy `.env.build.example` to `.env` and replace the placeholders.

## Push notifications

This project includes Expo notification registration for local device testing.
For production Android push:

1. Create a Firebase project
2. Add Android app credentials
3. Download `google-services.json` into the mobile project root
4. Set `GOOGLE_SERVICES_JSON=./google-services.json`
5. Configure Expo/EAS with FCM credentials
6. Store device tokens in the backend and send alerts through FCM or Expo push

This app currently registers an `ExpoPushToken` on device. The backend should send those tokens through Expo Push Service, not Firebase Admin directly. Native FCM/APNs tokens are only needed if you intentionally switch to direct push delivery.

## Android APK build

1. Set a real backend URL in `.env`
2. Set a real Android package name in `.env`
3. Set `EXPO_PUBLIC_EAS_PROJECT_ID`
4. Log in with `npx eas-cli login`
5. Run:

```bash
npm run build:android:preview
```

This produces an installable internal-distribution APK.

If you use a quick public tunnel for the backend, keep both the FastAPI server and `cloudflared` running on this PC while you use the APK. The current tunnel URL is loaded from `.env`.

For Play Store upload, use:

```bash
npm run build:android:production
```

That profile produces an Android App Bundle (`.aab`).

For a full pre-build checklist, see:

- [../docs/APK_BUILD_READY_CHECKLIST.md](../docs/APK_BUILD_READY_CHECKLIST.md)
