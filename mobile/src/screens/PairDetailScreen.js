import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { MetricCard } from '../components/MetricCard'
import { PriceSparkline } from '../components/PriceSparkline'
import { ForecastCard } from '../components/ForecastCard'
import { AlertForm } from '../components/AlertForm'
import { Badge } from '../components/Badge'
import { Screen } from '../components/Screen'
import { DATE_RANGES } from '../constants/pairs'
import { createPriceAlert } from '../services/alertService'
import { loadPairDetail, loadPrediction } from '../services/forexService'
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

  useEffect(() => {
    loadPairDetail(pair, range).then(setDetail)
    loadPrediction(pair).then(setPrediction)
    loadSymbolPerformance(pair.replace('/', '')).then(setPerformance).catch(() => setPerformance(null))
  }, [pair, range])

  if (!detail || !prediction) {
    return (
      <Screen>
        <ActivityIndicator color={colors.accent} />
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
    } catch {
      setAlertStatus('Could not save alert yet. Check backend connection.')
    }
  }

  const directionTone = prediction.direction === 'bearish' ? 'down' : prediction.direction === 'bullish' ? 'up' : 'warning'
  const confidencePct = Math.round(prediction.confidence * 100)
  const latestScore = performance?.latest
  const indicatorCopy = [
    `Range: ${detail.projectedRange}`,
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
          <Badge label={prediction.direction} tone={prediction.direction === 'bearish' ? 'down' : prediction.direction === 'bullish' ? 'up' : 'warning'} />
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
      </LinearGradient>

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

      <View style={sharedStyles.card}>
        <View style={[sharedStyles.row, { marginBottom: 8 }]}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900' }}>Actual vs forecast</Text>
          <Badge label={range.toUpperCase()} tone="neutral" />
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
        <MetricCard label="Direction" value={prediction.direction} tone={directionTone} />
        <MetricCard label="Confidence" value={`${confidencePct}%`} tone="up" />
        <MetricCard label="Projected Range" value={`${prediction.projectedLow} - ${prediction.projectedHigh}`} />
        <MetricCard label="Expected Move" value={`${prediction.expectedMovePct}%`} />
      </View>

      <ForecastCard prediction={prediction} />

      <View style={sharedStyles.card}>
        <View style={[sharedStyles.row, { marginBottom: 10 }]}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>Accuracy card</Text>
          <Badge label={latestScore?.model_name ?? 'Waiting'} tone="forecast" />
        </View>
        {latestScore ? (
          <View style={{ gap: 8 }}>
            <View style={sharedStyles.row}>
              <Text style={{ color: colors.muted }}>Directional accuracy</Text>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{latestScore.directional_accuracy}%</Text>
            </View>
            <View style={sharedStyles.row}>
              <Text style={{ color: colors.muted }}>Recent MAE</Text>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{latestScore.mae}</Text>
            </View>
            <View style={sharedStyles.row}>
              <Text style={{ color: colors.muted }}>Samples scored</Text>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{latestScore.samples_used}</Text>
            </View>
          </View>
        ) : (
          <Text style={{ color: colors.muted }}>Accuracy appears after backtests run for this pair.</Text>
        )}
      </View>

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

      <AlertForm
        alertType={alertType}
        targetPrice={targetPrice}
        onChangeAlertType={setAlertType}
        onChangeTargetPrice={setTargetPrice}
        onSubmit={submitAlert}
      />
      {alertStatus ? <Text style={{ color: colors.muted }}>{alertStatus}</Text> : null}
    </Screen>
  )
}
