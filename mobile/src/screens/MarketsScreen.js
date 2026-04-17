import React, { useMemo, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { Screen } from '../components/Screen'
import { Badge } from '../components/Badge'
import { PairCard } from '../components/PairCard'
import { SectionHeader } from '../components/SectionHeader'
import { useDashboardData } from '../hooks/useDashboardData'
import { useAppState } from '../state/AppContext'
import { colors } from '../theme/colors'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'major', label: 'Major' },
  { key: 'asia', label: 'Asia Focus' },
  { key: 'volatility', label: 'High Volatility' },
]

const ASIA_SYMBOLS = new Set(['USDMYR', 'USDJPY'])
const MAJOR_SYMBOLS = new Set(['EURUSD', 'GBPUSD', 'USDJPY', 'USDMYR'])

export function MarketsScreen({ navigation }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('move')
  const [marketError, setMarketError] = useState('')
  const { data, loading, stale, refresh } = useDashboardData('USDMYR,EURUSD,GBPUSD,USDJPY')
  const { setSelectedPair } = useAppState()

  const pairs = useMemo(() => {
    const normalized = query.trim().toUpperCase().replace('/', '')
    let next = [...(data.pairs ?? [])]

    if (normalized) {
      next = next.filter((item) => item.symbol.replace('/', '').includes(normalized))
    }
    if (filter === 'major') {
      next = next.filter((item) => MAJOR_SYMBOLS.has(item.symbol.replace('/', '')))
    } else if (filter === 'asia') {
      next = next.filter((item) => ASIA_SYMBOLS.has(item.symbol.replace('/', '')))
    } else if (filter === 'volatility') {
      next = next.filter((item) => Math.abs(item.change ?? 0) >= 0.3)
    } else if (filter === 'favorites') {
      next = next.filter((item) => item.symbol === 'USD/MYR' || item.symbol === 'EUR/USD')
    }

    if (sort === 'confidence') {
      next.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    } else {
      next.sort((a, b) => Math.abs(b.change ?? 0) - Math.abs(a.change ?? 0))
    }

    return next
  }, [data.pairs, filter, query, sort])

  async function retryRefresh() {
    try {
      setMarketError('')
      await refresh()
    } catch {
      setMarketError('Could not refresh market data right now. Try again in a moment.')
    }
  }

  return (
    <Screen>
      <View
        style={{
          backgroundColor: '#131a2b',
          borderRadius: 24,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.borderSoft,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: '900' }}>Markets</Text>
          <Badge label={stale ? 'Delayed' : 'Live'} tone={stale ? 'warning' : 'forecast'} />
        </View>
        <Text style={{ color: colors.muted, lineHeight: 20 }}>
          Browse pairs, compare confidence, and jump into detail analysis quickly.
        </Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search symbol e.g. USDMYR"
          placeholderTextColor={colors.muted}
          autoCapitalize="characters"
          style={{
            color: colors.text,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: '#0f1524',
          }}
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {FILTERS.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => setFilter(item.key)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: filter === item.key ? colors.accent : colors.border,
              backgroundColor: filter === item.key ? colors.accentSoft : '#0f1524',
            }}
          >
            <Text
              style={{
                color: filter === item.key ? colors.accent : colors.mutedStrong,
                fontSize: 12,
                fontWeight: '800',
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={() => setSort('move')}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: sort === 'move' ? colors.accent : colors.border,
            backgroundColor: sort === 'move' ? colors.accentSoft : '#0f1524',
          }}
        >
          <Text style={{ color: sort === 'move' ? colors.accent : colors.mutedStrong, fontWeight: '800' }}>
            Sort: Move
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setSort('confidence')}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: sort === 'confidence' ? colors.accent : colors.border,
            backgroundColor: sort === 'confidence' ? colors.accentSoft : '#0f1524',
          }}
        >
          <Text style={{ color: sort === 'confidence' ? colors.accent : colors.mutedStrong, fontWeight: '800' }}>
            Sort: Confidence
          </Text>
        </Pressable>
      </View>

      {marketError ? (
        <ErrorState
          title="Market feed unavailable"
          body={marketError}
          onActionPress={retryRefresh}
        />
      ) : null}

      {loading && !pairs.length ? (
        <LoadingState title="Refreshing market rows..." subtitle="Syncing rates, confidence, and trend context." />
      ) : null}

      <SectionHeader title="Available pairs" actionLabel="Refresh" onActionPress={retryRefresh} />

      {pairs.map((pair) => (
        <PairCard
          key={pair.symbol}
          pair={pair}
          onPress={() => {
            setSelectedPair(pair.symbol)
            navigation.navigate('PairDetail', { pair: pair.symbol })
          }}
        />
      ))}
      {!loading && !pairs.length ? (
        <EmptyState
          title="No pairs found"
          body="No market pairs match the current search and filters."
          actionLabel="Reset filters"
          onActionPress={() => {
            setQuery('')
            setFilter('all')
          }}
        />
      ) : null}
    </Screen>
  )
}
