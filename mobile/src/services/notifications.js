import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { appConfig } from '../config/appConfig'
import { apiClient } from './apiClient'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    return { token: `mock-${Platform.OS}-${Date.now()}`, reason: 'Mock token registered for local testing.' }
  }

  const existing = await Notifications.getPermissionsAsync()
  let finalStatus = existing.status

  if (finalStatus !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync()
    finalStatus = asked.status
  }

  if (finalStatus !== 'granted') {
    return { token: null, reason: 'Push permission was not granted.' }
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('forex-alerts', {
      name: 'forex-alerts',
      importance: Notifications.AndroidImportance.HIGH,
    })
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: appConfig.expoProjectId || undefined,
  })

  return { token: token.data, reason: '' }
}

export async function registerDeviceTokenWithBackend(userId = 1) {
  const result = await registerForPushNotificationsAsync()
  if (!result.token) {
    return result
  }

  await apiClient.registerDeviceToken({
    user_id: userId,
    platform: Platform.OS,
    token: result.token,
  })

  return result
}
