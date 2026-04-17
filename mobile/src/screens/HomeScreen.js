import React, { useEffect, useMemo, useState } from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useDashboardData } from '../hooks/useDashboardData'
import { ConfidenceBadge } from '../components/ConfidenceBadge'
import { DirectionChip } from '../components/DirectionChip'
import { Badge } from '../components/Badge'
import { EmptyState } from '../components/EmptyState'
import { LoadingState } from '../components/LoadingState'
import { SectionHeader } from '../components/SectionHeader'
import { useAppState } from '../state/AppContext'
import { loadAlertLogs } from '../services/alertService'
import { loadInsightsDashboard } from '../services/performanceService'
import {
  addWatchlistSymbol,
  formatSymbol,
  loadWatchlist,
  removeWatchlistItem,
} from '../services/userService'
import { colors } from '../theme/colors'

function SummaryCard({ title, value, subtitle }) {
  return (
    <View
      style={{
        width: '48.5%',
        backgroundColor: '#131a2b',
        borderRadius: 18,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.borderSoft,
      }}
    >
      <Text style={{ color: '#8ea0c0', fontSize: 12, fontWeight: '700' }}>{title}</Text>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 8 }}>{value}</Text>
      {subtitle ? <Text style={{ color: colors.muted, marginTop: 6 }}>{subtitle}</Text> : null}
    </View>
  )
}

function WatchlistCard({ item, onPress }) {
  const moveColor = item.change > 0 ? colors.up : item.change < 0 ? colors.down : colors.muted
  const changeText = `${item.change > 0 ? '+' : ''}${(item.change ?? 0).toFixed(2)}%`

  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 268,
        backgroundColor: '#131a2b',
        borderRadius: 22,
        padding: 16,
        marginRight: 14,
        borderWidth: 1,
        borderColor: colors.borderSoft,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: '#8ea0c0', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 }}>
            {item.symbol}
          </Text>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: '900', marginTop: 6 }}>
            {item.price.toFixed(4)}
          </Text>
        </View>
        <ConfidenceBadge confidence={item.confidence} />
      </View>

      <View style={{ marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: moveColor, fontWeight: '800', fontSize: 15 }}>{changeText}</Text>
        <DirectionChip direction={item.forecastLabel?.split('|')?.[0] ?? 'sideways'} />
      </View>

      <View
        style={{
          marginTop: 16,
          height: 56,
          borderRadius: 14,
          backgroundColor: '#0f1524',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#59647a', fontSize: 12 }}>Mini chart</Text>
      </View>

      <View style={{ marginTop: 12, alignSelf: 'flex-start' }}>
        <Badge label={item.forecastLabel ?? 'Forecast ready'} tone="forecast" />
      </View>
      {item.isStale ? (
        <View
          style={{
            marginTop: 10,
            alignSelf: 'flex-start',
            backgroundColor: '#392b10',
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
          }}
        >
          <Text style={{ color: '#ffd27a', fontSize: 11, fontWeight: '800' }}>Data delayed</Text>
        </View>
      ) : null}
    </Pressable>
  )
}

export function HomeScreen({ navigation }) {
  const [watchlist, setWatchlist] = useState([])
  const [newSymbol, setNewSymbol] = useState('')
  const [watchlistStatus, setWatchlistStatus] = useState('Loading watchlist...')
  const [insights, setInsights] = useState(null)
  const [notifications, setNotifications] = useState([])
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

  async function refreshData() {
    await Promise.all([
      refreshWatchlist(),
      loadInsightsDashboard().then(setInsights).catch(() => setInsights(null)),
      loadAlertLogs(1).then(setNotifications).catch(() => setNotifications([])),
    ])
  }

  async function addSymbol() {
    if (!newSymbol.trim()) return
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
    refreshData()
  }, [])

  const strongest = insights?.movers?.strongest?.[0]
  const weakest = insights?.movers?.weakest?.[0]
  const volatilitySpike = insights?.volatility?.results?.find((item) => item.spike)
  const bestConfidence = [...(insights?.forecasts?.results ?? [])].sort(
    (a, b) =>
      (b.performance_adjusted_confidence ?? b.raw_confidence ?? 0) -
      (a.performance_adjusted_confidence ?? a.raw_confidence ?? 0),
  )[0]
  const latestCaptureText = data.pairs?.[0]?.capturedAt
    ? new Date(data.pairs[0].capturedAt).toLocaleString()
    : 'Waiting for sync'

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#0b1020' }}
      contentContainerStyle={{ padding: 18, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={refreshData} tintColor="#fff" />}
    >
      <View style={{ marginTop: 10, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: '900' }}>Forex Pulse</Text>
          <Text style={{ color: '#98a2b3', marginTop: 6, fontSize: 13 }}>Latest sync: {latestCaptureText}</Text>
        </View>
        <View style={{ backgroundColor: '#16213d', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text style={{ color: '#9ecbff', fontSize: 12, fontWeight: '800' }}>{stale ? 'Cached View' : 'Live Market'}</Text>
        </View>
      </View>

      <SectionHeader title="Watchlist" actionLabel="Manage" />

      {loading && !data.pairs.length ? (
        <LoadingState title="Loading watchlist..." subtitle="Fetching rates and forecast confidence." />
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
        {data.pairs.map((item) => (
          <WatchlistCard
            key={item.symbol}
            item={item}
            onPress={() => {
              setSelectedPair(item.symbol)
              navigation.navigate('PairDetail', { pair: item.symbol })
            }}
          />
        ))}
      </ScrollView>
      {!loading && !data.pairs.length ? (
        <EmptyState
          title="Watchlist is empty"
          body="Add a pair in Watchlist manager to start tracking live movement."
        />
      ) : null}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, marginTop: 8 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Market summary</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <SummaryCard title="Strongest mover" value={strongest ? `${formatSymbol(strongest.symbol)} ${strongest.change_pct}%` : 'Waiting'} />
        <SummaryCard title="Weakest mover" value={weakest ? `${formatSymbol(weakest.symbol)} ${weakest.change_pct}%` : 'Waiting'} />
        <SummaryCard title="Highest volatility" value={volatilitySpike ? formatSymbol(volatilitySpike.symbol) : 'Normal'} />
        <SummaryCard
          title="Best confidence"
          value={
            bestConfidence
              ? `${formatSymbol(bestConfidence.symbol)} ${Math.round((bestConfidence.performance_adjusted_confidence ?? bestConfidence.raw_confidence ?? 0) * 100)}%`
              : 'Waiting'
          }
        />
      </View>

      <View style={{ backgroundColor: '#151c31', borderRadius: 22, padding: 16, marginTop: 6 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Daily AI summary</Text>
        <Text style={{ color: '#d6deee', lineHeight: 21, marginTop: 10 }}>
          {bestConfidence
            ? `${formatSymbol(bestConfidence.symbol)} remains ${bestConfidence.direction} with ${
                bestConfidence.volatility_regime
              }. Confidence is adjusted by recent model performance, not certainty.`
            : 'Summary appears after forecast and model ranking data loads.'}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', marginTop: 16, marginBottom: 8 }}>
        <Pressable
          onPress={() => navigation.getParent()?.navigate('Alerts')}
          style={{ flex: 1, backgroundColor: '#2b78ff', paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginRight: 8 }}
        >
          <Text style={{ color: '#fff', fontWeight: '900' }}>Set Alert</Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.getParent()?.navigate('Insights')}
          style={{ flex: 1, backgroundColor: '#161f36', paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginLeft: 8 }}
        >
          <Text style={{ color: '#cbd5e1', fontWeight: '800' }}>View Insights</Text>
        </Pressable>
      </View>

      <View style={{ marginTop: 10 }}>
        <View style={{ backgroundColor: '#10281d', borderRadius: 18, padding: 16, marginBottom: 10 }}>
          <Text style={{ color: '#9fb3d6', fontSize: 12, fontWeight: '800' }}>OPPORTUNITY</Text>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 8 }}>
            {strongest ? `${formatSymbol(strongest.symbol)} trend holding` : 'Waiting for mover'}
          </Text>
          <Text style={{ color: '#d6deee', fontSize: 13, lineHeight: 20, marginTop: 8 }}>
            Confidence and direction are ranked from model output and recent performance.
          </Text>
        </View>
        <View style={{ backgroundColor: '#2a1717', borderRadius: 18, padding: 16 }}>
          <Text style={{ color: '#9fb3d6', fontSize: 12, fontWeight: '800' }}>RISK</Text>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 8 }}>
            {volatilitySpike ? `${formatSymbol(volatilitySpike.symbol)} volatility spike` : 'No major spike'}
          </Text>
          <Text style={{ color: '#d6deee', fontSize: 13, lineHeight: 20, marginTop: 8 }}>
            Elevated volatility lowers short-term forecast trust.
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginBottom: 10 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Recent notifications</Text>
        <Text style={{ color: '#7cc7ff', fontSize: 13, fontWeight: '700' }}>See all</Text>
      </View>
      {(notifications ?? []).slice(0, 2).map((log) => (
        <View
          key={log.id}
          style={{
            backgroundColor: '#131a2b',
            borderRadius: 18,
            padding: 15,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: colors.borderSoft,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>Alert event</Text>
          <Text style={{ color: '#b6c0d4', fontSize: 13, lineHeight: 20, marginTop: 8 }}>{log.message}</Text>
          <Text style={{ color: '#7d8799', fontSize: 12, marginTop: 10 }}>
            {log.sent_at ? new Date(log.sent_at).toLocaleString() : ''}
          </Text>
        </View>
      ))}
      {!notifications.length ? (
        <EmptyState
          title="No recent notifications"
          body="Triggered alerts and summary messages will appear here."
          actionLabel="Set alert"
          onActionPress={() => navigation.getParent()?.navigate('Alerts')}
        />
      ) : null}

      <View style={{ marginTop: 12, backgroundColor: '#131a2b', borderRadius: 18, padding: 15 }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 8 }}>Watchlist manager</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
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
          <Pressable onPress={addSymbol} style={{ backgroundColor: '#161f36', borderRadius: 14, paddingHorizontal: 16, justifyContent: 'center' }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>Add</Text>
          </Pressable>
        </View>
        {watchlistStatus ? <Text style={{ color: colors.muted, marginBottom: 8 }}>{watchlistStatus}</Text> : null}
        {watchlist.map((item) => (
          <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: colors.mutedStrong }}>{formatSymbol(item.symbol)}</Text>
            <Pressable onPress={() => removeSymbol(item.id)}>
              <Text style={{ color: colors.down, fontWeight: '700' }}>Remove</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}
