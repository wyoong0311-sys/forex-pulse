import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useDashboardData } from '../hooks/useDashboardData'
import { PairCard } from '../components/PairCard'
import { Screen } from '../components/Screen'
import { MetricCard } from '../components/MetricCard'
import { Badge } from '../components/Badge'
import { SummaryCard } from '../components/SummaryCard'
import { useAppState } from '../state/AppContext'
import { loadAlertLogs } from '../services/alertService'
import { loadInsightsDashboard } from '../services/performanceService'
import { addWatchlistSymbol, formatSymbol, loadWatchlist, removeWatchlistItem } from '../services/userService'
import { sharedStyles } from '../theme/styles'
import { colors } from '../theme/colors'

export function HomeScreen({ navigation }) {
  const [watchlist, setWatchlist] = useState([])
  const [newSymbol, setNewSymbol] = useState('')
  const [watchlistStatus, setWatchlistStatus] = useState('Loading watchlist...')
  const [insights, setInsights] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [sortMode, setSortMode] = useState('default')
  const symbols = useMemo(
    () => (watchlist.length ? watchlist.map((item) => item.symbol).join(',') : 'USDMYR,EURUSD,GBPUSD,USDJPY'),
    [watchlist],
  )
  const { data, loading, stale } = useDashboardData(symbols)
  const { selectedPair, setSelectedPair } = useAppState()

  async function refreshWatchlist() {
    try {
      const response = await loadWatchlist(1)
      setWatchlist(response.items ?? [])
      setWatchlistStatus('')
    } catch {
      setWatchlistStatus('Using default watchlist until backend preferences are available.')
    }
  }

  async function addSymbol() {
    if (!newSymbol.trim()) {
      return
    }
    try {
      await addWatchlistSymbol(newSymbol, 1)
      setNewSymbol('')
      await refreshWatchlist()
    } catch {
      setWatchlistStatus('Could not save that symbol. Use supported pairs like USDMYR or EURUSD.')
    }
  }

  async function removeSymbol(itemId) {
    try {
      await removeWatchlistItem(itemId)
      await refreshWatchlist()
    } catch {
      setWatchlistStatus('Could not remove that watchlist item yet.')
    }
  }

  useEffect(() => {
    refreshWatchlist()
    loadInsightsDashboard().then(setInsights).catch(() => setInsights(null))
    loadAlertLogs(1).then(setNotifications).catch(() => setNotifications([]))
  }, [])

  const strongest = insights?.movers?.strongest?.[0]
  const weakest = insights?.movers?.weakest?.[0]
  const forecast = insights?.forecasts?.results?.[0]
  const bestConfidence = [...(insights?.forecasts?.results ?? [])].sort(
    (a, b) => (b.performance_adjusted_confidence ?? b.raw_confidence ?? 0) - (a.performance_adjusted_confidence ?? a.raw_confidence ?? 0)
  )[0]
  const volatilitySpike = insights?.volatility?.results?.find((item) => item.spike)
  const latestCaptureText = data.pairs?.[0]?.capturedAt
    ? new Date(data.pairs[0].capturedAt).toLocaleString()
    : 'Waiting for sync'
  const sortedPairs = useMemo(() => {
    const pairs = [...data.pairs]
    if (sortMode === 'confidence') {
      return pairs.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    }
    if (sortMode === 'move') {
      return pairs.sort((a, b) => Math.abs(b.change ?? 0) - Math.abs(a.change ?? 0))
    }
    return pairs
  }, [data.pairs, sortMode])

  return (
    <Screen>
      <LinearGradient
        colors={['#163553', '#081525']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 32,
          borderColor: colors.border,
          borderWidth: 1,
          padding: 22,
          gap: 18,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ color: colors.mutedStrong, fontSize: 13, fontWeight: '800', letterSpacing: 1.4 }}>
              FOREX PULSE
            </Text>
            <Text style={{ color: colors.text, fontSize: 34, fontWeight: '900', marginTop: 8, lineHeight: 38 }}>
              Daily market command center
            </Text>
          </View>
          <Badge label={stale ? 'Cached view' : 'Live data'} tone={stale ? 'warning' : 'forecast'} />
        </View>

        <Text style={{ color: colors.mutedStrong, lineHeight: 21 }}>
          Actual rates, ranked forecasts, alert history, and volatility context in one calm view.
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          Latest sync: {latestCaptureText}
        </Text>

        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <Pressable
            onPress={() => navigation.navigate('PairDetail', { pair: selectedPair })}
            style={[sharedStyles.cardSoft, { flexGrow: 1, paddingVertical: 12 }]}
          >
            <Text style={{ color: colors.text, fontWeight: '800' }}>View Markets</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.getParent()?.navigate('Alerts')}
            style={[sharedStyles.cardSoft, { flexGrow: 1, paddingVertical: 12 }]}
          >
            <Text style={{ color: colors.text, fontWeight: '800' }}>Create Alert</Text>
          </Pressable>
        </View>
      </LinearGradient>

      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      {stale ? <Text style={{ color: colors.muted }}>Showing cached data while backend refreshes.</Text> : null}
      {watchlistStatus ? <Text style={{ color: colors.muted }}>{watchlistStatus}</Text> : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {data.highlights.map((item) => (
          <MetricCard key={item.label} label={item.label} value={item.value} tone={item.tone} />
        ))}
      </View>

      <View>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 10 }}>Market summary</Text>
        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
          <SummaryCard
            title="Strongest mover"
            body={strongest ? `${formatSymbol(strongest.symbol)} moved ${strongest.change_pct}% on latest close.` : 'Waiting for mover data from backend.'}
            badge={strongest ? formatSymbol(strongest.symbol) : 'Waiting'}
            tone="up"
            style={{ flex: 1, minWidth: '47%' }}
          />
          <SummaryCard
            title="Weakest mover"
            body={weakest ? `${formatSymbol(weakest.symbol)} moved ${weakest.change_pct}% on latest close.` : 'Waiting for mover data from backend.'}
            badge={weakest ? formatSymbol(weakest.symbol) : 'Waiting'}
            tone="down"
            style={{ flex: 1, minWidth: '47%' }}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
          <SummaryCard
            title="Volatility focus"
            body={volatilitySpike ? `${formatSymbol(volatilitySpike.symbol)} is in ${volatilitySpike.regime}.` : 'No spike detected. Market is currently stable.'}
            badge={volatilitySpike ? formatSymbol(volatilitySpike.symbol) : 'Normal'}
            tone={volatilitySpike ? 'warning' : 'neutral'}
            style={{ flex: 1, minWidth: '47%' }}
          />
          <SummaryCard
            title="Best confidence"
            body={bestConfidence ? `${formatSymbol(bestConfidence.symbol)} is ${bestConfidence.direction} with adjusted confidence ${Math.round((bestConfidence.performance_adjusted_confidence ?? bestConfidence.raw_confidence ?? 0) * 100)}%.` : 'Waiting for forecast confidence ranking.'}
            badge={bestConfidence ? `${Math.round((bestConfidence.performance_adjusted_confidence ?? bestConfidence.raw_confidence ?? 0) * 100)}%` : 'Waiting'}
            tone="forecast"
            style={{ flex: 1, minWidth: '47%' }}
          />
        </View>
      </View>

      <View style={sharedStyles.card}>
        <View style={[sharedStyles.row, { marginBottom: 10 }]}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Daily AI summary</Text>
          <Badge label="Plain language" tone="neutral" />
        </View>
        <Text style={{ color: colors.mutedStrong, lineHeight: 21 }}>
          {forecast
            ? `${formatSymbol(forecast.symbol)} is currently ${forecast.direction} with ${forecast.volatility_regime}. Confidence is performance-adjusted, not guaranteed.`
            : 'Summary will appear after forecasts and model rankings are loaded from the backend.'}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        <View style={[sharedStyles.card, { flex: 1, minWidth: '47%' }]}>
          <Badge label="Top opportunity" tone="up" />
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 12 }}>
            {strongest ? formatSymbol(strongest.symbol) : 'Waiting'}
          </Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>
            {strongest ? `${strongest.change_pct}% latest move` : 'Needs backend mover data'}
          </Text>
        </View>
        <View style={[sharedStyles.card, { flex: 1, minWidth: '47%' }]}>
          <Badge label="Top risk" tone="warning" />
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 12 }}>
            {volatilitySpike ? formatSymbol(volatilitySpike.symbol) : weakest ? formatSymbol(weakest.symbol) : 'Waiting'}
          </Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>
            {volatilitySpike ? volatilitySpike.regime : weakest ? `${weakest.change_pct}% weakest move` : 'Needs backend risk data'}
          </Text>
        </View>
      </View>

      <View style={sharedStyles.card}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 10 }}>
          Your Watchlist
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <TextInput
            value={newSymbol}
            onChangeText={setNewSymbol}
            placeholder="USDMYR"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            style={{
              flex: 1,
              color: colors.text,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 14,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          />
          <Pressable
            onPress={addSymbol}
            style={{
              backgroundColor: colors.panelAlt,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 14,
              paddingHorizontal: 16,
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors.text, fontWeight: '700' }}>Add</Text>
          </Pressable>
        </View>
        {watchlist.map((item) => (
          <View key={item.id} style={[sharedStyles.row, { marginBottom: 8 }]}>
            <Text style={{ color: colors.muted }}>{formatSymbol(item.symbol)}</Text>
            <Pressable onPress={() => removeSymbol(item.id)}>
              <Text style={{ color: colors.down, fontWeight: '700' }}>Remove</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={{ gap: 14 }}>
        <View style={[sharedStyles.row, { alignItems: 'center' }]}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Watchlist cards</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {[
              ['default', 'Default'],
              ['confidence', 'Confidence'],
              ['move', 'Move'],
            ].map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => setSortMode(value)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: sortMode === value ? colors.accentSoft : colors.panelAlt,
                  borderColor: sortMode === value ? colors.accent : colors.border,
                  borderWidth: 1,
                }}
              >
                <Text
                  style={{
                    color: sortMode === value ? colors.accent : colors.mutedStrong,
                    fontWeight: '800',
                    fontSize: 12,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        {sortedPairs.length ? (
          sortedPairs.map((pair) => (
            <PairCard
              key={pair.symbol}
              pair={pair}
              onPress={() => {
                setSelectedPair(pair.symbol)
                navigation.navigate('PairDetail', { pair: pair.symbol })
              }}
            />
          ))
        ) : loading ? (
          [...Array(3)].map((_, index) => (
            <View
              key={index}
              style={{
                borderRadius: 18,
                backgroundColor: colors.panel,
                borderColor: colors.border,
                borderWidth: 1,
                padding: 16,
                gap: 10,
              }}
            >
              <View style={{ width: '42%', height: 14, borderRadius: 999, backgroundColor: colors.panelAlt }} />
              <View style={{ width: '68%', height: 12, borderRadius: 999, backgroundColor: colors.panelAlt }} />
            </View>
          ))
        ) : null}
      </View>

      <View style={sharedStyles.card}>
        <View style={[sharedStyles.row, { marginBottom: 10 }]}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Recent notification</Text>
          <Badge label={`${notifications.length}`} tone={notifications.length ? 'forecast' : 'neutral'} />
        </View>
        <Text style={{ color: colors.muted, lineHeight: 20 }}>
          {notifications[0]?.message ?? 'No alert triggers yet. Create a price alert to start building history.'}
        </Text>
      </View>
    </Screen>
  )
}
