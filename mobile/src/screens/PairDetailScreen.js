import React, { useEffect, useMemo, useState } from 'react'
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { ConfidenceBadge } from '../components/ConfidenceBadge'
import { DirectionChip } from '../components/DirectionChip'
import { ModelTrustCard } from '../components/ModelTrustCard'
import { ForecastCard } from '../components/ForecastCard'
import { AccuracyCard } from '../components/AccuracyCard'
import { AlertForm } from '../components/AlertForm'
import { Badge } from '../components/Badge'
import { EmptyState } from '../components/EmptyState'
import { LoadingState } from '../components/LoadingState'
import { PriceSparkline } from '../components/PriceSparkline'
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

function InfoCard({ title, children }) {
  return (
    <View
      style={{
        backgroundColor: '#131a2b',
        borderRadius: 22,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.borderSoft,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: '900' }}>{title}</Text>
      <View style={{ marginTop: 12 }}>{children}</View>
    </View>
  )
}

function KeyValueRow({ label, value }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
      <Text style={{ color: '#9fb0cc', fontSize: 14 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800', marginLeft: 16, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  )
}

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
        if (cachedDetail) setDetail(cachedDetail)
        if (cachedPrediction) setPrediction(cachedPrediction)
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
        if (active) setStale(true)
      }

      loadSymbolPerformance(pair.replace('/', ''))
        .then((data) => {
          if (active) setPerformance(data)
        })
        .catch(() => {
          if (active) setPerformance(null)
        })

      loadAlerts(1)
        .then((alerts) => {
          if (active) {
            setPairAlerts((alerts ?? []).filter((item) => item.symbol === pair.replace('/', '').toUpperCase()))
          }
        })
        .catch(() => {
          if (active) setPairAlerts([])
        })
    })()

    return () => {
      active = false
    }
  }, [pair, range])

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

  if (!detail || !prediction) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0b1020', padding: 18, justifyContent: 'center' }}>
        <LoadingState
          title="Loading pair intelligence..."
          subtitle="Collecting latest price, prediction, and accuracy context."
        />
      </View>
    )
  }

  const updateTimeText = detail.capturedAt ? new Date(detail.capturedAt).toLocaleString() : 'Waiting for sync'
  const latestScore = performance?.latest
  const comparisons = performance?.comparisons ?? []
  const baselineScore = comparisons
    .filter((item) => item.model_name?.includes('baseline') && item.samples_used > 0)
    .sort((a, b) => a.mae - b.mae)[0]
  const bestScored = comparisons
    .filter((item) => item.samples_used > 0)
    .sort((a, b) => a.mae - b.mae)
  const beatBaselineCount = bestScored.filter((item) => item.beats_baseline).length
  const confidenceDelta =
    prediction.confidence == null || baselineScore == null
      ? null
      : (prediction.confidence * 100) - 50

  const explanation = useMemo(() => {
    const lines = []
    lines.push(prediction.direction === 'bullish' ? 'Recent trend is leaning upward.' : prediction.direction === 'bearish' ? 'Recent trend is leaning downward.' : 'Recent trend is relatively flat.')
    lines.push(
      Number(prediction.expectedMovePct) > 0.5
        ? 'Expected move is elevated versus recent baseline.'
        : 'Expected move is currently moderate.'
    )
    lines.push(
      detail.fallbackUsed
        ? 'This forecast includes fallback market data handling.'
        : 'This forecast is based on stored provider market data.'
    )
    return lines.join(' ')
  }, [prediction, detail])

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0b1020' }} contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
      <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Text style={{ color: '#91a2c4', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 }}>
            {pair.replace('/', '')}
          </Text>
          <Text style={{ color: colors.text, fontSize: 36, fontWeight: '900', marginTop: 8 }}>
            {detail.latestPrice.toFixed(4)}
          </Text>
          <Text
            style={{
              color: detail.dailyChangePct >= 0 ? colors.up : colors.down,
              fontSize: 15,
              fontWeight: '800',
              marginTop: 8,
            }}
          >
            {detail.dailyChangePct >= 0 ? '+' : ''}
            {detail.dailyChangePct.toFixed(2)}% today
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <ConfidenceBadge confidence={prediction.confidence} />
          <View style={{ height: 10 }} />
          <DirectionChip direction={prediction.direction} />
        </View>
      </View>

      <Text style={{ color: '#7d8799', fontSize: 12, marginTop: 12, marginBottom: 14 }}>
        Last updated: {updateTimeText}
      </Text>
      {stale || detail.isStale ? (
        <Text style={{ color: '#ffd27a', marginBottom: 10 }}>
          Data is delayed. Displaying cached data while backend refreshes.
        </Text>
      ) : null}

      <View
        style={{
          backgroundColor: '#131a2b',
          borderRadius: 24,
          padding: 16,
          marginBottom: 14,
          borderWidth: 1,
          borderColor: colors.borderSoft,
        }}
      >
        <View style={{ marginBottom: 14 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>Actual vs forecast</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}>
            {DATE_RANGES.map((item) => (
              <Pressable
                key={item.value}
                onPress={() => setRange(item.value)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: range === item.value ? '#2b78ff' : '#0f1524',
                  marginRight: 8,
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: range === item.value ? '#fff' : '#9ca3af', fontSize: 12, fontWeight: '800' }}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ borderRadius: 18, backgroundColor: '#0f1524', padding: 12 }}>
          <PriceSparkline
            values={detail.history}
            prediction={prediction.predictedNextClose ? [prediction.predictedNextClose] : detail.prediction}
            showLegend
          />
          <Text style={{ color: '#8ea0c0', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
            Solid line = actual | Dashed line = forecast
          </Text>
        </View>
      </View>

      <ForecastCard prediction={prediction} />
      <View style={{ height: 12 }} />

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <InfoCard title="Indicators">
            <KeyValueRow label="Volatility" value={detail.isStale ? 'Delayed context' : 'Moderate'} />
            <KeyValueRow label="Momentum" value={prediction.direction === 'bullish' ? 'Positive' : prediction.direction === 'bearish' ? 'Negative' : 'Neutral'} />
            <KeyValueRow label="Expected move" value={`${prediction.expectedMovePct}%`} />
            <KeyValueRow label="Trend" value={`${prediction.direction} short-term`} />
          </InfoCard>
        </View>
        <View style={{ flex: 1 }}>
          <AccuracyCard latest={latestScore} baseline={baselineScore} title="Accuracy" />
        </View>
      </View>

      <ModelTrustCard
        beatBaselineCount={beatBaselineCount}
        totalRuns={bestScored.length || 0}
        directionalAccuracy={latestScore?.directional_accuracy ?? null}
        confidenceDelta={confidenceDelta}
      />

      <View style={{ height: 12 }} />
      <InfoCard title="Why this forecast">
        <Text style={{ color: '#d6deee', fontSize: 14, lineHeight: 22 }}>{explanation}</Text>
      </InfoCard>

      <View style={{ height: 12 }} />
      <InfoCard title="Alerts">
        <View style={{ marginBottom: 10 }}>
          <Badge label={`${pairAlerts.length} active`} tone={pairAlerts.length ? 'up' : 'neutral'} />
        </View>
        {pairAlerts.slice(0, 1).map((item) => (
          <View key={item.id} style={{ backgroundColor: '#0f1524', borderRadius: 16, padding: 14, marginBottom: 10 }}>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>Active alert</Text>
            <Text style={{ color: '#b6c0d4', fontSize: 13, marginTop: 8 }}>
              Notify when {pair.replace('/', '/')} {item.alert_type.replace('_', ' ')} {item.target_price}
            </Text>
          </View>
        ))}
        {!pairAlerts.length ? (
          <EmptyState
            title="No active alert"
            body="Create an alert so we can notify you when this pair crosses your target."
          />
        ) : null}
        <AlertForm
          alertType={alertType}
          targetPrice={targetPrice}
          onChangeAlertType={setAlertType}
          onChangeTargetPrice={setTargetPrice}
          onSubmit={submitAlert}
        />
      </InfoCard>
      {alertStatus ? <Text style={{ color: colors.muted, marginTop: 10 }}>{alertStatus}</Text> : null}
    </ScrollView>
  )
}
