import { apiClient } from './apiClient'

export async function loadAlerts(userId = 1) {
  return apiClient.getAlerts(userId)
}

export async function loadAlertLogs(userId = 1) {
  return apiClient.getAlertLogs(userId)
}

export async function createPriceAlert({ userId = 1, symbol, alertType, targetPrice }) {
  return apiClient.createAlert({
    user_id: userId,
    symbol: symbol.replace('/', '').toUpperCase(),
    alert_type: alertType,
    target_price: Number(targetPrice),
  })
}
