import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { MetricCard } from '../components/MetricCard'
import { PriceSparkline } from '../components/PriceSparkline'
import { ForecastCard } from '../components/ForecastCard'
import { AccuracyCard } from '../components/AccuracyCard'
import { AlertForm } from '../components/AlertForm'
import { Badge } from '../components/Badge'
import { DirectionChip } from '../components/DirectionChip'
import { Screen } from '../components/Screen'
import { DATE_RANGES } from '../constants/pairs'
import { createPriceAlert, loadAlerts } from '../services/alertService'
import {
  loadPairDetail,
  loadPairDetailCached,
  loadPrediction,
  loadPredictionCached,
} from '../services/forexService'
import { loadSymbolPerformance } from '../services/performanceService'
import { colors } from '../theme/colors'
import { sharedStyles } from '../theme/styles'

export function PairDetailScreen({ route }) {
  const pair = route.params?.pair ?? 'EUR/USD'
  const [detail, setDetail] = useState(null)
  const [prediction, setPrediction] = useState(null)
  const [performance, setPerformance] = useState(null)
  const [range, setRange] = useState('30d')
  const [alertType, setAlertType] = useState('above')
  const [targetPrice, setTargetPrice] = useState('')
  const [alertStatus, setAlertStatus] = useState('')
  const [stale, setStale] = useState(false)
  const [pairAlerts, setPairAlerts] = useState([])

  useEffect(() => {
    let active = true
    ;(async () => {
      const [cachedDetail, cachedPrediction] = await Promise.all([
        loadPairDetailCached(pair, range),
        loadPredictionCached(pair),
      ])
      if (active && (cachedDetail || cachedPrediction)) {
        if (cachedDetail) {
          setDetail(cachedDetail)
        }
        if (cachedPrediction) {
          setPrediction(cachedPrediction)
        }
        setStale(true)
      }
      try {
        const [freshDetail, freshPrediction] = await Promise.all([
          loadPairDetail(pair, range),
          loadPrediction(pair),
        ])
        if (active) {
          setDetail(freshDetail)
          setPrediction(freshPrediction)
          setStale(false)
        }
      } catch {
        if (active) {
          setStale(true)
        }
      }
      loadSymbolPerformance(pair.replace('/', '')).then(setPerformance).catch(() => setPerformance(null))
      loadAlerts(1)
        .then((alerts) => {
          if (active) {
            setPairAlerts((alerts ?? []).filter((item) => item.symbol === pair.replace('/', '').toUpperCase()))
          }
        })
        .catch(() => {
          if (active) {
            setPairAlerts([])
          }
        })
    })()
    return () => {
      active = false
    }
  }, [pair, range])

  if (!detail || !prediction) {
    return (
      <Screen>
        <ActivityIndicator color={colors.accent} />
        <View style={[sharedStyles.card, { marginTop: 14, gap: 10 }]}>
          <View style={{ width: '48%', height: 14, borderRadius: 999, backgroundColor: colors.panelAlt }} />
          <View style={{ width: '72%', height: 12, borderRadius: 999, backgroundColor: colors.panelAlt }} />
        </View>
      </Screen>
    )
  }

  async function submitAlert() {
    const fallbackPrice = prediction?.projectedHigh ?? detail?.latestPrice
    try {
      await createPriceAlert({
        userId: 1,
        symbol: pair,
        alertType,
        targetPrice: targetPrice || `${fallbackPrice}`,
      })
      setAlertStatus('Alert saved. It will trigger when backend checks cross your rule.')
      const refreshed = await loadAlerts(1)
      setPairAlerts((refreshed ?? []).filter((item) => item.symbol === pair.replace('/', '').toUpperCase()))
    } catch {
      setAlertStatus('Could not save alert yet. Check backend connection.')
    }
  }

  const confidencePct = Math.round(prediction.confidence * 100)
  const latestScore = performance?.latest
  const baselineScore = [...(performance?.comparisons ?? [])]
    .filter((item) => item.model_name?.includes('baseline') && item.samples_used > 0)
    .sort((a, b) => a.mae - b.mae)[0]
  const updateTimeText = detail.capturedAt ? new Date(detail.capturedAt).toLocaleString() : 'Waiting for sync'
  const indicatorCopy = [
    `Observed range: ${detail.projectedRange}`,
    `Expected move: ${prediction.expectedMovePct}%`,
    `Source: ${detail.source}${detail.fallbackUsed ? ' fallback' : ''}`,
    `Model: ${prediction.modelVersion}`,
  ]

  return (
    <Screen>
      <LinearGradient
        colors={['#173a5f', '#081525']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 34,
          borderColor: colors.border,
          borderWidth: 1,
          padding: 22,
          gap: 18,
        }}
      >
        <View style={[sharedStyles.row, { alignItems: 'flex-start' }]}>
          <View>
            <Text style={{ color: colors.mutedStrong, fontSize: 13, fontWeight: '800', letterSpacing: 1.4 }}>
              PAIR DETAIL
            </Text>
            <Text style={{ color: colors.text, fontSize: 36, fontWeight: '900', marginTop: 8 }}>{pair}</Text>
          </View>
          <DirectionChip direction={prediction.direction} />
        </View>

        <View>
          <Text style={{ color: colors.text, fontSize: 42, fontWeight: '900' }}>{detail.latestPrice}</Text>
          <Text style={{ color: detail.dailyChangePct >= 0 ? colors.up : colors.down, marginTop: 4, fontWeight: '800' }}>
            {detail.dailyChangePct > 0 ? '+' : ''}
            {detail.dailyChangePct.toFixed(2)}% today
          </Text>
        </View>

        <Text style={{ color: colors.mutedStrong, lineHeight: 21 }}>
          Updated from {detail.source}. Forecast is separated from actual market history and is not financial advice.
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Last update: {updateTimeText}</Text>
      </LinearGradient>
      {stale ? <Text style={{ color: colors.muted }}>Showing cached pair data while backend refreshes.</Text> : null}

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {DATE_RANGES.map((item) => (
          <Pressable
            key={item.value}
            onPress={() => setRange(item.value)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 999,
              backgroundColor: range === item.value ? colors.accent : colors.panel,
              borderColor: colors.border,
              borderWidth: 1,
            }}
          >
            <Text style={{ color: range === item.value ? colors.page : colors.text, fontWeight: '700' }}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={[sharedStyles.card, { paddingBottom: 22 }]}>
        <View style={[sharedStyles.row, { marginBottom: 8 }]}>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900' }}>Actual vs forecast</Text>
          <Badge label={range.toUpperCase()} tone="neutral" />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <Badge label="Actual (solid)" tone="neutral" />
          <Badge label="Forecast (dashed)" tone="forecast" />
        </View>
        <PriceSparkline
          values={detail.history}
          prediction={prediction.predictedNextClose ? [prediction.predictedNextClose] : detail.prediction}
          showLegend
        />
        <Text style={{ color: colors.muted, marginTop: 8 }}>
          Solid line is stored market data. Dashed amber line is the forecast target.
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <MetricCard label="Direction" value={prediction.direction} tone={prediction.direction === 'bearish' ? 'down' : prediction.direction === 'bullish' ? 'up' : 'warning'} />
        <MetricCard label="Confidence" value={`${confidencePct}%`} tone="up" />
        <MetricCard label="Projected Range" value={`${prediction.projectedLow} - ${prediction.projectedHigh}`} />
        <MetricCard label="Expected Move" value={`${prediction.expectedMovePct}%`} />
      </View>

      <ForecastCard prediction={prediction} />

      <AccuracyCard latest={latestScore} baseline={baselineScore} title="Accuracy card" />

      <View style={sharedStyles.card}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 10 }}>
          Indicator summary
        </Text>
        {indicatorCopy.map((item) => (
          <Text key={item} style={{ color: colors.muted, lineHeight: 21, marginBottom: 6 }}>
            {item}
          </Text>
        ))}
      </View>

      <View style={sharedStyles.card}>
        <View style={[sharedStyles.row, { marginBottom: 10 }]}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>Alert controls</Text>
          <Badge label={`${pairAlerts.length} active`} tone={pairAlerts.length ? 'up' : 'neutral'} />
        </View>
        {pairAlerts.length ? (
          pairAlerts.slice(0, 2).map((item) => (
            <Text key={item.id} style={{ color: colors.muted, marginBottom: 6 }}>
              {item.alert_type} {item.target_price}
            </Text>
          ))
        ) : (
          <Text style={{ color: colors.muted, marginBottom: 10 }}>No active alerts for this pair yet.</Text>
        )}
        <AlertForm
          alertType={alertType}
          targetPrice={targetPrice}
          onChangeAlertType={setAlertType}
          onChangeTargetPrice={setTargetPrice}
          onSubmit={submitAlert}
        />
      </View>
      {alertStatus ? <Text style={{ color: colors.muted }}>{alertStatus}</Text> : null}
    </Screen>
  )
}
