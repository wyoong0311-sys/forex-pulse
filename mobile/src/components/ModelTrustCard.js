import React from 'react'
import { Text, View } from 'react-native'
import { colors } from '../theme/colors'
import { sharedStyles } from '../theme/styles'

export function ModelTrustCard({
  beatBaselineCount = 0,
  totalRuns = 0,
  directionalAccuracy = null,
  confidenceDelta = null,
}) {
  const directionalText =
    directionalAccuracy == null ? '--' : `${Math.round(directionalAccuracy)}%`
  const deltaText =
    confidenceDelta == null
      ? '--'
      : `${confidenceDelta > 0 ? '+' : ''}${Math.round(confidenceDelta)}%`
  const deltaColor =
    confidenceDelta == null
      ? colors.muted
      : confidenceDelta >= 0
        ? colors.up
        : colors.down

  return (
    <View style={sharedStyles.card}>
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 10 }}>
        Model trust
      </Text>
      <View style={{ gap: 8 }}>
        <View style={sharedStyles.row}>
          <Text style={{ color: colors.muted }}>Beat baseline</Text>
          <Text style={{ color: colors.text, fontWeight: '800' }}>
            {beatBaselineCount}/{totalRuns}
          </Text>
        </View>
        <View style={sharedStyles.row}>
          <Text style={{ color: colors.muted }}>Directional hit rate</Text>
          <Text style={{ color: colors.text, fontWeight: '800' }}>{directionalText}</Text>
        </View>
        <View style={sharedStyles.row}>
          <Text style={{ color: colors.muted }}>Confidence change</Text>
          <Text style={{ color: deltaColor, fontWeight: '800' }}>{deltaText}</Text>
        </View>
      </View>
    </View>
  )
}
