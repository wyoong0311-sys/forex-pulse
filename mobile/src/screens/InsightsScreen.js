import React, { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { AccuracyCard } from '../components/AccuracyCard'
import { MetricCard } from '../components/MetricCard'
import { Screen } from '../components/Screen'
import { SectionHeader } from '../components/SectionHeader'
import { Badge } from '../components/Badge'
import { SummaryCard } from '../components/SummaryCard'
import { loadInsightsDashboard, loadPerformanceSummary, loadSymbolPerformance } from '../services/performanceService'
import { sharedStyles } from '../theme/styles'
import { colors } from '../theme/colors'

const fallbackMetrics = {
  mae: 'waiting',
  rmse: 'waiting',
  mape: 'waiting',
  directional: 'waiting',
}

export function InsightsScreen() {
  const [summary, setSummary] = useState([])
  const [symbolPerformance, setSymbolPerformance] = useState(null)
  const [insights, setInsights] = useState({
    volatility: { results: [] },
    movers: { strongest: [], weakest: [] },
    rankings: { results: [] },
    forecasts: { results: [] },
  })
  const [status, setStatus] = useState('Loading model performance...')

  useEffect(() => {
    async function load() {
      try {
        const [summaryData, symbolData, insightsData] = await Promise.all([
          loadPerformanceSummary(),
          loadSymbolPerformance('USDMYR'),
          loadInsightsDashboard(),
        ])
        setSummary(summaryData.results ?? [])
        setSymbolPerformance(symbolData)
        setInsights(insightsData)
        setStatus('')
      } catch {
        setStatus('Performance data unavailable. Run the backend backtest job first.')
      }
    }

    load()
  }, [])

  const latest = symbolPerformance?.latest
  const best = summary.length
    ? [...summary].sort((a, b) => a.mae - b.mae)[0]
    : null
  const comparison = symbolPerformance?.comparisons ?? []
  const strongest = insights.movers.strongest?.[0]
  const weakest = insights.movers.weakest?.[0]
  const volatilitySpikes = insights.volatility.results?.filter((item) => item.spike) ?? []
  const forecastSummary = insights.forecasts.results ?? []
  const bestBySymbol = (insights.rankings.results ?? []).filter((item) => item.rank === 1)

  return (
    <Screen>
      <LinearGradient
        colors={['#15314f', '#081525']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 32, borderColor: colors.border, borderWidth: 1, padding: 22, gap: 14 }}
      >
        <View style={sharedStyles.row}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ color: colors.mutedStrong, fontSize: 13, fontWeight: '800', letterSpacing: 1.4 }}>INSIGHTS</Text>
            <Text style={{ color: colors.text, fontSize: 32, fontWeight: '900', marginTop: 8 }}>Evidence, not hype</Text>
          </View>
          <Badge label={best?.model_name ? 'Scored' : 'Loading'} tone={best ? 'forecast' : 'neutral'} />
        </View>
        <Text style={{ color: colors.mutedStrong, lineHeight: 21 }}>
          Movers, volatility, model rankings, and forecast summaries built from stored market data.
        </Text>
      </LinearGradient>

      {status ? <Text style={{ color: colors.muted }}>{status}</Text> : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <MetricCard label="Best scored model" value={best?.model_name ?? 'Waiting'} tone="up" />
        <MetricCard label="Best MAE" value={best ? `${best.mae}` : 'Waiting'} tone="warning" />
        <MetricCard label="USDMYR direction" value={latest ? `${latest.directional_accuracy}%` : 'Waiting'} />
        <MetricCard label="Samples scored" value={latest ? `${latest.samples_used}` : 'Waiting'} />
        <MetricCard label="Strongest mover" value={strongest ? `${strongest.symbol} ${strongest.change_pct}%` : 'Waiting'} tone="up" />
        <MetricCard label="Weakest mover" value={weakest ? `${weakest.symbol} ${weakest.change_pct}%` : 'Waiting'} tone="down" />
      </View>

      <AccuracyCard
        metrics={
          latest
            ? {
                mae: `${latest.mae}`,
                rmse: `${latest.rmse}`,
                mape: `${latest.mape}%`,
                directional: `${latest.directional_accuracy}%`,
              }
            : fallbackMetrics
        }
      />

      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        <SummaryCard
          title="Strongest mover"
          body={strongest ? `${strongest.symbol} moved ${strongest.change_pct}% on the latest stored close.` : 'Waiting for mover data.'}
          badge={strongest?.symbol ?? 'Waiting'}
          tone="up"
        />
        <SummaryCard
          title="Weakest mover"
          body={weakest ? `${weakest.symbol} moved ${weakest.change_pct}% on the latest stored close.` : 'Waiting for mover data.'}
          badge={weakest?.symbol ?? 'Waiting'}
          tone="down"
        />
      </View>

      <View style={sharedStyles.card}>
        <SectionHeader title="Baseline vs model" subtitle="Recent model comparison for USDMYR." />
        {comparison.length ? (
          comparison.map((item) => (
            <Text key={item.model_name} style={{ color: colors.muted, marginTop: 10, lineHeight: 20 }}>
              {item.model_name}: MAE {item.mae}, RMSE {item.rmse}, direction {item.directional_accuracy}%,
              beats baseline {item.beats_baseline ? 'yes' : 'no'}
            </Text>
          ))
        ) : (
          <Text style={{ color: colors.muted }}>No comparison rows yet.</Text>
        )}
      </View>

      <View style={sharedStyles.card}>
        <SectionHeader title="Volatility regimes" subtitle="Spike flags use recent volatility vs baseline volatility." />
        {insights.volatility.results?.length ? (
          insights.volatility.results.map((item) => (
            <Text key={item.symbol} style={{ color: item.spike ? colors.warning : colors.muted, marginTop: 10, lineHeight: 20 }}>
              {item.symbol}: {item.regime} ({item.recent_volatility_pct}% recent vs {item.baseline_volatility_pct}% baseline)
            </Text>
          ))
        ) : (
          <Text style={{ color: colors.muted }}>No volatility regime rows yet.</Text>
        )}
        {volatilitySpikes.length ? (
          <Text style={{ color: colors.warning, marginTop: 6 }}>
            Spikes detected: {volatilitySpikes.map((item) => item.symbol).join(', ')}
          </Text>
        ) : null}
      </View>

      <View style={sharedStyles.card}>
        <SectionHeader title="Forecast board" subtitle="Direction and confidence remain analytical, not advice." />
        {forecastSummary.length ? (
          forecastSummary.map((item) => (
            <Text key={item.symbol} style={{ color: colors.muted, marginTop: 10, lineHeight: 20 }}>
              {item.symbol}: {item.direction} with {item.model_name}, adjusted confidence {item.performance_adjusted_confidence}, regime {item.volatility_regime}
            </Text>
          ))
        ) : (
          <Text style={{ color: colors.muted }}>No forecast summary yet.</Text>
        )}
      </View>

      <View style={sharedStyles.card}>
        <SectionHeader title="Confidence leaderboard" subtitle="Best model by recent MAE for each symbol." />
        {bestBySymbol.length ? (
          bestBySymbol.map((item) => (
            <Text key={item.symbol} style={{ color: colors.muted, marginTop: 10, lineHeight: 20 }}>
              {item.symbol}: {item.model_name} by MAE {item.mae}, directional {item.directional_accuracy}%
            </Text>
          ))
        ) : (
          <Text style={{ color: colors.muted }}>No model rankings yet.</Text>
        )}
      </View>

      <View style={sharedStyles.card}>
        <SectionHeader title="Last 7 predictions" subtitle="Recent persisted forecast rows for USDMYR." />
        {symbolPerformance?.last_7_predictions?.length ? (
          symbolPerformance.last_7_predictions.map((item) => (
            <Text key={`${item.prediction_time}-${item.model_name}`} style={{ color: colors.muted, marginTop: 10, lineHeight: 20 }}>
              {item.model_name}: {item.direction} at {item.predicted_close}
            </Text>
          ))
        ) : (
          <Text style={{ color: colors.muted }}>No recent persisted predictions yet.</Text>
        )}
      </View>
    </Screen>
  )
}
