import { apiClient } from './apiClient'

export const LOCAL_USER_ID = 1

export function formatSymbol(symbol) {
  const normalized = symbol.replace('/', '').toUpperCase()
  return normalized.length === 6 ? `${normalized.slice(0, 3)}/${normalized.slice(3)}` : symbol
}

export async function loadWatchlist(userId = LOCAL_USER_ID) {
  return apiClient.getWatchlist(userId)
}

export async function addWatchlistSymbol(symbol, userId = LOCAL_USER_ID) {
  return apiClient.createWatchlistItem({ user_id: userId, symbol })
}

export async function removeWatchlistItem(itemId) {
  return apiClient.deleteWatchlistItem(itemId)
}

export async function loadPreferences(userId = LOCAL_USER_ID) {
  return apiClient.getPreferences(userId)
}

export async function savePreferences(payload, userId = LOCAL_USER_ID) {
  return apiClient.updatePreferences(userId, payload)
}

export async function loadDailySummary(userId = LOCAL_USER_ID) {
  return apiClient.getDailySummary(userId)
}
