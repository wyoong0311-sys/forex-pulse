# APK Build-Ready Checklist

This checklist gets the current mobile app from "build-shaped" to "actually buildable and installable."

## 1. Backend must be reachable from a phone

Set a real backend URL for the mobile app. Do not use:

- `http://127.0.0.1:8000`
- `http://localhost:8000`

Use something like:

- `https://your-forex-pulse-api.example.com`

The backend should respond successfully for:

```powershell
Invoke-RestMethod 'https://your-forex-pulse-api.example.com/health'
Invoke-RestMethod 'https://your-forex-pulse-api.example.com/api/v1/health'
```

## 2. Create the real mobile environment file

In the `mobile/` folder:

1. Copy `.env.build.example` to `.env`
2. Replace:
   - `EXPO_PUBLIC_API_BASE_URL`
   - `EXPO_PUBLIC_EAS_PROJECT_ID`
   - package identifiers if needed

Minimum required values:

```bash
EXPO_PUBLIC_API_BASE_URL=https://your-forex-pulse-api.example.com
EXPO_PUBLIC_ANDROID_PACKAGE=com.forexpulse.mobile
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
```

## 3. Set up Expo EAS

In `mobile/`:

```bash
npx eas-cli login
npx eas-cli project:init
```

Then copy the generated project ID into `.env` as:

```bash
EXPO_PUBLIC_EAS_PROJECT_ID=your-real-project-id
```

## 4. Set up Firebase for Android push

If you want production push notifications:

1. Create a Firebase project
2. Add an Android app using the same package name as `EXPO_PUBLIC_ANDROID_PACKAGE`
3. Download `google-services.json`
4. Place it in `mobile/google-services.json`
5. Keep:

```bash
GOOGLE_SERVICES_JSON=./google-services.json
```

If you skip this, the app can still build, but production Android push notifications will not be ready.

## 5. Verify Expo config locally

In `mobile/`:

```bash
npx expo config --type public
```

Confirm:

- `android.package` matches your real package name
- `extra.apiBaseUrl` matches your real backend URL
- `extra.eas.projectId` is populated

## 6. Build the installable APK

For an internal/test APK:

```bash
npm run build:android:preview
```

This uses the `preview` profile in `eas.json` and creates an APK.

## 7. Build the Play Store package

For production distribution:

```bash
npm run build:android:production
```

This creates an Android App Bundle (`.aab`).

## 8. Final reality check

The app is ready for APK build when all of these are true:

- mobile `.env` exists with real values
- backend is reachable from outside your dev machine
- Expo project ID is real
- Android package name is final
- Firebase config exists if you want push
- `npx expo config --type public` shows the correct values

## Current state of this repo

Already done:

- `app.config.js`
- `eas.json`
- Android preview and production build scripts
- premium UI pass for the mobile app

Still requires your real values:

- backend URL
- EAS project ID
- Firebase Android config
