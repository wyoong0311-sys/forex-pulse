import React, { useEffect, useMemo, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Badge } from '../components/Badge'
import { AccuracyCard } from '../components/AccuracyCard'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { SectionHeader } from '../components/SectionHeader'
import { SummaryCard } from '../components/SummaryCard'
import { loadInsightsDashboard, loadPerformanceSummary, loadSymbolPerformance } from '../services/performanceService'
import { colors } from '../theme/colors'

function StatPill({ label, value }) {
  return (
    <View
      style={{
        minWidth: '47%',
        backgroundColor: '#131a2b',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.borderSoft,
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '900', marginTop: 6 }}>{value}</Text>
    </View>
  )
}

export function InsightsScreen() {
  const insets = useSafeAreaInsets()
  const tabOverlayPadding = Math.max(insets.bottom + 24, 32)
  const [summary, setSummary] = useState([])
  const [symbolPerformance, setSymbolPerformance] = useState(null)
  const [insights, setInsights] = useState({
    volatility: { results: [] },
    movers: { strongest: [], weakest: [] },
    rankings: { results: [] },
    forecasts: { results: [] },
  })
  const [status, setStatus] = useState('Loading insights...')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    async function load() {
      setIsLoading(true)
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
        setLoadError('')
      } catch {
        setStatus('Performance data unavailable. Run backtests first.')
        setLoadError('Insights and performance data could not be fetched.')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const latest = symbolPerformance?.latest
  const comparison = symbolPerformance?.comparisons ?? []
  const strongest = insights.movers?.strongest?.[0]
  const weakest = insights.movers?.weakest?.[0]
  const spikes = insights.volatility?.results?.filter((item) => item.spike) ?? []
  const forecastSummary = insights.forecasts?.results ?? []
  const bestBySymbol = (insights.rankings?.results ?? []).filter((item) => item.rank === 1)
  const bestModel = useMemo(
    () => [...(summary ?? [])].filter((item) => item.samples_used > 0).sort((a, b) => a.mae - b.mae)[0],
    [summary],
  )
  const largestShift = forecastSummary
    .slice()
    .sort((a, b) => Math.abs(b.upper_bound - b.lower_bound) - Math.abs(a.upper_bound - a.lower_bound))[0]

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0b1020' }} contentContainerStyle={{ padding: 18, paddingBottom: tabOverlayPadding }}>
      <View
        style={{
          backgroundColor: '#131a2b',
          borderRadius: 24,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.borderSoft,
          marginTop: 10,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: '900' }}>Insights</Text>
          <Badge label={bestModel ? 'Scored' : 'Loading'} tone={bestModel ? 'forecast' : 'neutral'} />
        </View>
        <Text style={{ color: colors.muted, marginTop: 8, lineHeight: 20 }}>
          Model evidence, volatility context, and forecast confidence in one board.
        </Text>
      </View>

      <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <StatPill label="Best model today" value={bestModel?.model_name ?? 'Waiting'} />
        <StatPill label="Highest volatility" value={spikes[0]?.symbol ?? 'Normal'} />
        <StatPill
          label="Strongest confidence"
          value={
            forecastSummary[0]
              ? `${forecastSummary[0].symbol} ${Math.round((forecastSummary[0].performance_adjusted_confidence ?? 0) * 100)}%`
              : 'Waiting'
          }
        />
        <StatPill label="Biggest forecast shift" value={largestShift ? largestShift.symbol : 'Waiting'} />
      </View>

      {loadError ? (
        <View style={{ marginTop: 10 }}>
          <ErrorState title="Insights unavailable" body={loadError} />
        </View>
      ) : null}
      {isLoading ? (
        <View style={{ marginTop: 10 }}>
          <LoadingState title="Loading insights..." subtitle="Evaluating movers, volatility, and model rankings." />
        </View>
      ) : null}
      {status && !isLoading ? <Text style={{ color: colors.muted, marginTop: 10 }}>{status}</Text> : null}

      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
        <SummaryCard
          title="Bullish setup"
          body={strongest ? `${strongest.symbol} leads with ${strongest.change_pct}% move.` : 'Waiting for mover data.'}
          badge={strongest?.symbol ?? 'Waiting'}
          tone="up"
          style={{ flex: 1, minWidth: '47%' }}
        />
        <SummaryCard
          title="Bearish setup"
          body={weakest ? `${weakest.symbol} is weakest at ${weakest.change_pct}% move.` : 'Waiting for mover data.'}
          badge={weakest?.symbol ?? 'Waiting'}
          tone="down"
          style={{ flex: 1, minWidth: '47%' }}
        />
      </View>

      <View style={{ marginTop: 10 }}>
        <AccuracyCard
          latest={latest}
          baseline={
            comparison
              .filter((item) => item.model_name?.includes('baseline') && item.samples_used > 0)
              .sort((a, b) => a.mae - b.mae)[0]
          }
          title="Model accuracy summary"
        />
      </View>

      <View
        style={{
          marginTop: 12,
          backgroundColor: '#131a2b',
          borderRadius: 18,
          padding: 15,
          borderWidth: 1,
          borderColor: colors.borderSoft,
        }}
      >
        <SectionHeader title="Forecast board" />
        {forecastSummary.length ? (
          forecastSummary.map((item) => (
            <View key={item.symbol} style={{ marginBottom: 10 }}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>
                {item.symbol}: {item.direction}
              </Text>
              <Text style={{ color: colors.muted, marginTop: 4 }}>
                Confidence {Math.round((item.performance_adjusted_confidence ?? 0) * 100)}% | Range {item.lower_bound} - {item.upper_bound}
              </Text>
            </View>
          ))
        ) : (
          <EmptyState title="No forecast rows yet" body="Forecast board appears after prediction jobs complete." />
        )}
      </View>

      <View
        style={{
          marginTop: 10,
          backgroundColor: '#131a2b',
          borderRadius: 18,
          padding: 15,
          borderWidth: 1,
          borderColor: colors.borderSoft,
        }}
      >
        <SectionHeader title="Confidence leaderboard" />
        {bestBySymbol.length ? (
          bestBySymbol.map((item) => (
            <Text key={`${item.symbol}-${item.model_name}`} style={{ color: colors.muted, marginBottom: 8 }}>
              {item.symbol}: {item.model_name} | MAE {item.mae} | Dir {item.directional_accuracy}%
            </Text>
          ))
        ) : (
          <EmptyState title="No rankings yet" body="Run backtesting to score and rank models per symbol." />
        )}
      </View>
    </ScrollView>
  )
}
