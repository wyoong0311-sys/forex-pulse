const fs = require('fs')
const path = require('path')

const appName = process.env.EXPO_PUBLIC_APP_NAME || 'Forex Pulse'
const slug = process.env.EXPO_PUBLIC_APP_SLUG || 'forex-pulse'
const version = process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0'
const owner = process.env.EXPO_PUBLIC_EXPO_OWNER || 'teows-organization'
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000'
const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '96db8ac6-5a48-442d-aff0-76f892fa108e'
const iosBundleId = process.env.EXPO_PUBLIC_IOS_BUNDLE_ID || 'com.forexpulse.mobile'
const androidPackage = process.env.EXPO_PUBLIC_ANDROID_PACKAGE || 'com.forexpulse.mobile'
const androidVersionCode = Number(process.env.EXPO_PUBLIC_ANDROID_VERSION_CODE || '1')
const iosBuildNumber = process.env.EXPO_PUBLIC_IOS_BUILD_NUMBER || '1'
const googleServicesFile = process.env.GOOGLE_SERVICES_JSON
const resolvedGoogleServicesFile = googleServicesFile ? path.resolve(googleServicesFile) : ''
const accentBackground = '#050b14'

module.exports = {
  expo: {
    name: appName,
    owner,
    slug,
    version,
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    newArchEnabled: true,
    scheme: 'forexpulse',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: accentBackground,
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: iosBundleId,
      buildNumber: iosBuildNumber,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: accentBackground,
      },
      usesCleartextTraffic: true,
      edgeToEdgeEnabled: true,
      package: androidPackage,
      versionCode: androidVersionCode,
      ...(resolvedGoogleServicesFile && fs.existsSync(resolvedGoogleServicesFile)
        ? { googleServicesFile: resolvedGoogleServicesFile }
        : {}),
    },
    plugins: ['expo-notifications'],
    extra: {
      apiBaseUrl,
      expoProjectId: projectId,
      eas: {
        projectId,
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
  },
}
