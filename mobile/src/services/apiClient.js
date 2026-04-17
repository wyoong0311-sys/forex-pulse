import { appConfig } from '../config/appConfig'

async function request(path, options = {}) {
  const {
    timeoutMs = 8000,
    retry = 1,
    ...fetchOptions
  } = options
  const method = (fetchOptions.method ?? 'GET').toUpperCase()
  const retryable = method === 'GET'
  let lastError

  for (let attempt = 0; attempt <= retry; attempt += 1) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
        headers: { 'Content-Type': 'application/json', ...(fetchOptions.headers ?? {}) },
        ...fetchOptions,
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`API error ${response.status}`)
      }

      return response.json()
    } catch (error) {
      lastError = error
      const exhausted = attempt >= retry
      if (exhausted || !retryable) {
        break
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }
  throw lastError ?? new Error('API request failed')
}

export const apiClient = {
  getDashboard: () => request('/api/v1/dashboard'),
  getHomeDashboard: (userId = 1) => request(`/api/v1/dashboard/home?user_id=${userId}`),
  getPairDashboard: (symbol, range = '30d', userId = 1) =>
    request(`/api/v1/dashboard/pair/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&user_id=${userId}`),
  getLatestRates: (symbols) => request(`/rates/latest?symbols=${encodeURIComponent(symbols)}`),
  getRateHistory: (symbol, range = '30d') => request(`/rates/history/${symbol}?range=${range}`),
  getPairDetail: (pair) => request(`/api/v1/pairs/${encodeURIComponent(pair)}`),
  getPrediction: (pair) => request(`/api/v1/predictions/${encodeURIComponent(pair)}`),
  getPredictionPerformance: (symbol) => request(`/api/v1/predictions/performance/${symbol}`),
  getPredictionPerformanceSummary: () => request('/api/v1/predictions/performance-summary'),
  getVolatilityInsights: () => request('/api/v1/insights/volatility'),
  getTopMovers: () => request('/api/v1/insights/top-movers'),
  getModelRankings: () => request('/api/v1/insights/model-rankings'),
  getForecastSummary: () => request('/api/v1/insights/forecast-summary'),
  getAuthSession: () => request('/api/v1/auth/session'),
  getWatchlist: (userId = 1) => request(`/api/v1/watchlist/${userId}`),
  createWatchlistItem: (payload) =>
    request('/api/v1/watchlist', { method: 'POST', body: JSON.stringify(payload) }),
  deleteWatchlistItem: (itemId) => request(`/api/v1/watchlist/${itemId}`, { method: 'DELETE' }),
  getPreferences: (userId = 1) => request(`/api/v1/preferences/${userId}`),
  updatePreferences: (userId = 1, payload) =>
    request(`/api/v1/preferences/${userId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  getDailySummary: (userId = 1) => request(`/api/v1/summary/daily/${userId}`),
  createAlert: (payload) =>
    request('/api/v1/alerts', { method: 'POST', body: JSON.stringify(payload) }),
  getAlerts: (userId = 1) => request(`/api/v1/alerts/${userId}`),
  updateAlert: (alertId, payload) =>
    request(`/api/v1/alerts/${alertId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteAlert: (alertId) => request(`/api/v1/alerts/${alertId}`, { method: 'DELETE' }),
  getAlertLogs: (userId = 1) => request(`/api/v1/alerts/logs/${userId}`),
  registerDeviceToken: (payload) =>
    request('/api/v1/devices/register-token', { method: 'POST', body: JSON.stringify(payload) }),
}
