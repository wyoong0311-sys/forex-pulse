import React from 'react'
import { Text, View } from 'react-native'
import { colors } from '../theme/colors'
import { sharedStyles } from '../theme/styles'
import { ConfidenceBadge } from './ConfidenceBadge'
import { DirectionChip } from './DirectionChip'

export function ForecastCard({ prediction }) {
  return (
    <View style={sharedStyles.card}>
      <View style={[sharedStyles.row, { alignItems: 'flex-start', marginBottom: 14 }]}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900' }}>Forecast board</Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>Performance-aware forecast, not trading advice.</Text>
        </View>
        <DirectionChip direction={prediction.direction} />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <View style={[sharedStyles.cardSoft, { flex: 1, minWidth: '47%' }]}>
          <Text style={{ color: colors.muted, marginBottom: 6 }}>Predicted close</Text>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900' }}>{prediction.predictedNextClose}</Text>
        </View>
        <View style={[sharedStyles.cardSoft, { flex: 1, minWidth: '47%' }]}>
          <Text style={{ color: colors.muted, marginBottom: 6 }}>Confidence</Text>
          <ConfidenceBadge confidence={prediction.confidence} />
        </View>
      </View>

      <View style={{ marginTop: 14, gap: 8 }}>
        <View style={sharedStyles.row}>
          <Text style={{ color: colors.muted }}>Expected range</Text>
          <Text style={{ color: colors.text, fontWeight: '800' }}>
            {prediction.projectedLow} - {prediction.projectedHigh}
          </Text>
        </View>
        <View style={sharedStyles.row}>
          <Text style={{ color: colors.muted }}>Model</Text>
          <Text style={{ color: colors.text, fontWeight: '800' }}>{prediction.modelVersion}</Text>
        </View>
        <View style={sharedStyles.row}>
          <Text style={{ color: colors.muted }}>Target</Text>
          <Text style={{ color: colors.text, fontWeight: '800' }}>
            {prediction.forecastTargetTime ? new Date(prediction.forecastTargetTime).toLocaleString() : 'next close'}
          </Text>
        </View>
      </View>
    </View>
  )
}
