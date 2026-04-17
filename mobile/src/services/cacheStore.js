import AsyncStorage from '@react-native-async-storage/async-storage'

const PREFIX = 'forex_pulse_cache_v1:'

export async function readCache(key) {
  try {
    const raw = await AsyncStorage.getItem(`${PREFIX}${key}`)
    if (!raw) {
      return null
    }
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function writeCache(key, value) {
  try {
    await AsyncStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value))
  } catch {
    // Cache is best-effort only; failures should not block app flow.
  }
}
