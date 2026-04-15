import React from 'react'
import { Text, View } from 'react-native'
import { colors } from '../theme/colors'
import { sharedStyles } from '../theme/styles'

export function MetricCard({ label, value, tone = 'neutral' }) {
  const toneMap = {
    neutral: colors.text,
    up: colors.up,
    down: colors.down,
    warning: colors.warning,
  }

  return (
    <View style={[sharedStyles.card, { flex: 1, minWidth: '47%' }]}>
      <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 6 }}>{label}</Text>
      <Text style={{ color: toneMap[tone], fontSize: 22, fontWeight: '700' }}>{value}</Text>
    </View>
  )
}
