import { apiClient } from './apiClient'

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

  return { volatility, movers, rankings, forecasts }
}
