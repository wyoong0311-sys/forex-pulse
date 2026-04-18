import { apiClient } from './apiClient'
import { readCache, writeCache } from './cacheStore'

const INSIGHTS_CACHE_KEY = 'insights:dashboard'

export async function loadPerformanceSummary() {
  return apiClient.getPredictionPerformanceSummary()
}

export async function loadSymbolPerformance(symbol = 'USDMYR') {
  return apiClient.getPredictionPerformance(symbol)
}

export async function loadInsightsDashboard() {
  const [volatility, movers, rankings, forecasts] = await Promise.all([
    apiClient.getVolatilityInsights(),
    apiClient.getTopMovers(),
    apiClient.getModelRankings(),
    apiClient.getForecastSummary(),
  ])

  const payload = { volatility, movers, rankings, forecasts }
  await writeCache(INSIGHTS_CACHE_KEY, payload)
  return payload
}

export function loadInsightsDashboardCached() {
  return readCache(INSIGHTS_CACHE_KEY)
}
