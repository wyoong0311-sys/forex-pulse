import { historySeed, pairCards } from '../data/mockData'
import { apiClient } from './apiClient'
import { readCache, writeCache } from './cacheStore'

function normalizePair(pair) {
  return pair.replace('/', '').toUpperCase()
}

function isStale(capturedAt, maxAgeMinutes = 90) {
  if (!capturedAt) {
    return false
  }
  const captured = new Date(capturedAt).getTime()
  if (Number.isNaN(captured)) {
    return false
  }
  const ageMs = Date.now() - captured
  return ageMs > maxAgeMinutes * 60 * 1000
}

function dashboardKey(symbols) {
  return `dashboard:${symbols}`
}

function pairDetailKey(pair, range) {
  return `pair_detail:${normalizePair(pair)}:${range}`
}

function predictionKey(pair) {
  return `prediction:${normalizePair(pair)}`
}

function pairDashboardKey(pair, range) {
  return `pair_dashboard:${normalizePair(pair)}:${range}`
}

function downsampleSeries(values = [], maxPoints = 120) {
  if (!Array.isArray(values) || values.length <= maxPoints || maxPoints <= 0) {
    return values
  }
  const step = (values.length - 1) / (maxPoints - 1)
  const seen = new Set()
  const result = []
  for (let index = 0; index < maxPoints; index += 1) {
    const sourceIndex = Math.round(index * step)
    if (!seen.has(sourceIndex)) {
      seen.add(sourceIndex)
      result.push(values[sourceIndex])
    }
  }
  return result
}

export function loadDashboardCached(symbols = 'USDMYR,EURUSD,GBPUSD,USDJPY') {
  return readCache(dashboardKey(symbols))
}

export function loadPairDetailCached(pair, range = '30d') {
  return readCache(pairDetailKey(pair, range))
}

export function loadPredictionCached(pair) {
  return readCache(predictionKey(pair))
}

export function loadPairDashboardCached(pair, range = '30d') {
  return readCache(pairDashboardKey(pair, range))
}

export async function loadDashboard(symbols = 'USDMYR,EURUSD,GBPUSD,USDJPY') {
  try {
    const data = await apiClient.getHomeDashboard(1)
    const payload = {
      generatedAt: data.generated_at,
      updatedMinutesAgo: data.updated_minutes_ago ?? 0,
      isStale: Boolean(data.is_stale),
      dailyAiSummary: data.daily_ai_summary,
      notificationsPreview: data.notifications_preview ?? [],
      alertsActiveCount: data.alerts_active_count ?? 0,
      pairs: (data.pairs ?? []).map((rate) => ({
        symbol: rate.symbol,
        price: rate.price,
        change: rate.change ?? 0,
        confidence: rate.confidence ?? 0,
        source: rate.source,
        capturedAt: rate.captured_at,
        isStale: rate.is_stale ?? isStale(rate.captured_at),
        forecastLabel: rate.forecast_label,
        forecast: rate.forecast,
      })),
      highlights: (data.highlights ?? []).map((item) => ({
        label: item.label,
        value: item.value,
        tone: item.tone,
      })),
      marketSummary: {
        strongestMover: data.strongest_mover,
        weakestMover: data.weakest_mover,
        highestVolatility: data.highest_volatility,
        bestConfidence: data.best_confidence,
      },
    }
    await writeCache(dashboardKey(symbols), payload)
    return payload
  } catch {
    return {
      generatedAt: null,
      updatedMinutesAgo: null,
      isStale: true,
      dailyAiSummary: null,
      notificationsPreview: [],
      alertsActiveCount: 0,
      pairs: pairCards,
      marketSummary: {
        strongestMover: null,
        weakestMover: null,
        highestVolatility: null,
        bestConfidence: null,
      },
      highlights: [
        { label: 'Signal quality', value: '68%', tone: 'up' },
        { label: 'Open alerts', value: '12', tone: 'warning' },
        { label: 'Win rate 30D', value: '57%', tone: 'neutral' },
        { label: 'Model drift', value: 'Low', tone: 'up' },
      ],
    }
  }
}

export async function loadPairDashboard(pair, range = '30d') {
  const normalized = normalizePair(pair)
  const data = await apiClient.getPairDashboard(normalized, range, 1)
  const rawHistory = (data.history ?? []).map((point) => point.close)
  const maxPoints = range === '1y' ? 120 : range === '90d' ? 90 : 180
  const history = downsampleSeries(rawHistory, maxPoints)
  const latestPrice = data.latest_rate?.close ?? history.at(-1) ?? 0
  const previous = history.at(-2) ?? latestPrice
  const dailyChangePct = previous ? ((latestPrice - previous) / previous) * 100 : 0

  const prediction = {
    pair: normalized,
    direction: data.prediction?.direction ?? 'sideways',
    confidence: data.prediction?.confidence_score ?? 0,
    expectedMovePct: data.prediction?.expected_move_pct ?? 0,
    projectedHigh: data.prediction?.upper_bound ?? latestPrice,
    projectedLow: data.prediction?.lower_bound ?? latestPrice,
    predictedNextClose: data.prediction?.predicted_close ?? latestPrice,
    modelVersion: data.prediction?.model_name ?? 'unknown-model',
    predictionTime: data.generated_at ?? null,
    forecastTargetTime: data.prediction?.forecast_target_time ?? null,
  }

  const detail = {
    pair: normalized,
    latestPrice,
    dailyChangePct,
    projectedRange: `${prediction.projectedLow.toFixed(4)} - ${prediction.projectedHigh.toFixed(4)}`,
    confidence: prediction.confidence,
    history,
    prediction: [prediction.predictedNextClose],
    source: data.latest_rate?.source ?? 'backend',
    capturedAt: data.latest_rate?.captured_at ?? null,
    isStale: data.is_stale ?? false,
    updatedMinutesAgo: data.updated_minutes_ago ?? 0,
    fallbackUsed: String(data.latest_rate?.source ?? '').includes('mock'),
  }

  const performance = {
    symbol: normalized,
    latest: data.performance
      ? {
          symbol: normalized,
          model_name: data.performance.model_name,
          mae: data.performance.mae,
          directional_accuracy: data.performance.directional_accuracy,
          samples_used: data.performance.samples_used,
        }
      : null,
    comparisons: [],
    trust: data.trust ?? null,
  }

  const alertsActiveCount = data.alerts_active_count ?? 0
  const pairAlerts = (data.alerts_preview ?? []).map((item) => ({
    id: item.id,
    alert_type: item.alert_type,
    target_price: item.target_price,
  }))
  const payload = { detail, prediction, performance, alertsActiveCount, pairAlerts }
  await Promise.all([
    writeCache(pairDashboardKey(pair, range), payload),
    writeCache(pairDetailKey(pair, range), detail),
    writeCache(predictionKey(pair), prediction),
  ])
  return payload
}

export async function loadPairDetail(pair, range = '30d') {
  try {
    const payload = await loadPairDashboard(pair, range)
    return payload.detail
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
    const range = '30d'
    const cachedDashboard = await loadPairDashboardCached(pair, range)
    if (cachedDashboard?.prediction) {
      return cachedDashboard.prediction
    }
    const payload = await loadPairDashboard(pair, range)
    return payload.prediction
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

export async function prefetchPairDashboards(symbols = [], range = '30d') {
  const normalizedSymbols = symbols
    .map((symbol) => normalizePair(symbol))
    .filter((symbol, index, list) => symbol && list.indexOf(symbol) === index)

  await Promise.allSettled(normalizedSymbols.map((symbol) => loadPairDashboard(symbol, range)))
}
