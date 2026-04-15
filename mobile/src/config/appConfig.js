import Constants from 'expo-constants'

const extra = Constants.expoConfig?.extra ?? {}

export const appConfig = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? extra.apiBaseUrl ?? 'http://127.0.0.1:8000',
  expoProjectId: extra.eas?.projectId ?? extra.expoProjectId ?? '',
  supportedPairs: ['USD/MYR', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD'],
}
