import { historySeed, pairCards } from '../data/mockData'
import { apiClient } from './apiClient'

function normalizePair(pair) {
  return pair.replace('/', '').toUpperCase()
}

export async function loadDashboard(symbols = 'USDMYR,EURUSD,GBPUSD,USDJPY') {
  try {
    const [data, forecastSummary] = await Promise.all([
      apiClient.getLatestRates(symbols),
      apiClient.getForecastSummary().catch(() => ({ results: [] })),
    ])
    const confidenceBySymbol = new Map(
      (forecastSummary?.results ?? []).map((item) => [
        item.symbol,
        item.performance_adjusted_confidence ?? item.raw_confidence ?? 0,
      ])
    )
    return {
      pairs: data.rates.map((rate) => ({
        symbol: `${rate.symbol.slice(0, 3)}/${rate.symbol.slice(3)}`,
        price: rate.close,
        change: 0,
        confidence: confidenceBySymbol.get(rate.symbol) ?? 0,
        source: rate.source,
      })),
      highlights: [
        { label: 'Rate source', value: data.rates[0]?.source ?? 'backend', tone: 'up' },
        { label: 'Tracked pairs', value: `${data.rates.length}`, tone: 'neutral' },
        { label: 'Prediction', value: 'Ranked', tone: 'warning' },
        { label: 'Fallback', value: data.rates.some((rate) => rate.source.includes('mock')) ? 'Used' : 'Off', tone: 'up' },
      ],
    }
  } catch {
    return {
      pairs: pairCards,
      highlights: [
        { label: 'Signal quality', value: '68%', tone: 'up' },
        { label: 'Open alerts', value: '12', tone: 'warning' },
        { label: 'Win rate 30D', value: '57%', tone: 'neutral' },
        { label: 'Model drift', value: 'Low', tone: 'up' },
      ],
    }
  }
}

export async function loadPairDetail(pair, range = '30d') {
  try {
    const symbol = normalizePair(pair)
    const [latestData, historyData] = await Promise.all([
      apiClient.getLatestRates(symbol),
      apiClient.getRateHistory(symbol, range),
    ])
    const latest = latestData.rates[0]
    const history = historyData.actual.map((point) => point.close)
    const previous = history.at(-2) ?? latest.close
    const dailyChangePct = previous ? ((latest.close - previous) / previous) * 100 : 0

    return {
      pair,
      latestPrice: latest.close,
      dailyChangePct,
      projectedRange: `${Math.min(...history).toFixed(4)} - ${Math.max(...history).toFixed(4)}`,
      confidence: 0,
      history,
      prediction: [],
      source: latest.source,
      fallbackUsed: historyData.fallback_used,
    }
  } catch {
    return {
      pair,
      latestPrice: 1.0864,
      dailyChangePct: 0.42,
      projectedRange: '1.0820 - 1.0915',
      confidence: 0.68,
      history: historySeed,
      prediction: [1.087, 1.088, 1.089, 1.0895],
      source: 'mock-fallback',
      fallbackUsed: true,
    }
  }
}

export async function loadPrediction(pair) {
  try {
    const data = await apiClient.getPrediction(pair)
    return {
      pair: data.pair,
      direction: data.direction,
      confidence: data.confidence_score ?? data.confidence,
      expectedMovePct: data.expected_move_pct,
      projectedHigh: data.upper_bound ?? data.projected_high,
      projectedLow: data.lower_bound ?? data.projected_low,
      predictedNextClose: data.predicted_close ?? data.predicted_next_close,
      modelVersion: data.model_name ?? data.model_version,
      predictionTime: data.prediction_time,
      forecastTargetTime: data.forecast_target_time,
    }
  } catch {
    return {
      pair,
      direction: 'Bullish',
      confidence: 0.68,
      expectedMovePct: 0.31,
      projectedHigh: 1.0915,
      projectedLow: 1.082,
      modelVersion: 'demo-trend-v1',
      predictionTime: null,
      forecastTargetTime: null,
    }
  }
}
