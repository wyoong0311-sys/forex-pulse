import React from 'react'
import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { colors } from '../theme/colors'
import { Badge } from './Badge'
import { ConfidenceBadge } from './ConfidenceBadge'
import { PriceSparkline } from './PriceSparkline'

export function PairCard({ pair, onPress }) {
  const directionTone = pair.change >= 0 ? 'up' : 'down'
  const sparkline = pair.sparkline ?? [
    pair.price * 0.992,
    pair.price * 0.998,
    pair.price * 0.996,
    pair.price * 1.002,
    pair.price,
  ]

  return (
    <Pressable onPress={onPress}>
      <LinearGradient
        colors={['#173351', '#0b1728']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          padding: 18,
          borderRadius: 28,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{pair.symbol}</Text>
          <Badge label={`${pair.change > 0 ? '+' : ''}${pair.change.toFixed(2)}%`} tone={directionTone} />
        </View>
        <Text style={{ color: colors.text, fontSize: 30, fontWeight: '800' }}>{pair.price}</Text>
        <PriceSparkline values={sparkline} prediction={pair.forecast ? [pair.forecast] : []} compact />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>Forecast signal</Text>
            <Badge label={pair.forecastLabel ?? 'Forecast ready'} tone="forecast" />
          </View>
          <ConfidenceBadge confidence={pair.confidence} />
        </View>
      </LinearGradient>
    </Pressable>
  )
}
