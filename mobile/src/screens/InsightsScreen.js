import React, { useEffect, useMemo, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { Badge } from '../components/Badge'
import { AccuracyCard } from '../components/AccuracyCard'
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
  const [summary, setSummary] = useState([])
  const [symbolPerformance, setSymbolPerformance] = useState(null)
  const [insights, setInsights] = useState({
    volatility: { results: [] },
    movers: { strongest: [], weakest: [] },
    rankings: { results: [] },
    forecasts: { results: [] },
  })
  const [status, setStatus] = useState('Loading insights...')

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
        setStatus('Performance data unavailable. Run backtests first.')
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
    <ScrollView style={{ flex: 1, backgroundColor: '#0b1020' }} contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
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

      {status ? <Text style={{ color: colors.muted, marginTop: 10 }}>{status}</Text> : null}

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
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '900', marginBottom: 8 }}>
          Forecast board
        </Text>
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
          <Text style={{ color: colors.muted }}>No forecast rows yet.</Text>
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
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '900', marginBottom: 8 }}>
          Confidence leaderboard
        </Text>
        {bestBySymbol.length ? (
          bestBySymbol.map((item) => (
            <Text key={`${item.symbol}-${item.model_name}`} style={{ color: colors.muted, marginBottom: 8 }}>
              {item.symbol}: {item.model_name} | MAE {item.mae} | Dir {item.directional_accuracy}%
            </Text>
          ))
        ) : (
          <Text style={{ color: colors.muted }}>No rankings yet.</Text>
        )}
      </View>
    </ScrollView>
  )
}
