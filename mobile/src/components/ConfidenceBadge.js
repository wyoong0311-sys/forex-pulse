import React from 'react'
import { Text, View } from 'react-native'
import { colors } from '../theme/colors'

function getTier(confidence) {
  if (confidence == null) {
    return { label: 'Unknown', tone: colors.muted, bg: colors.panelAlt, border: colors.border }
  }
  if (confidence >= 0.75) {
    return { label: 'High', tone: colors.up, bg: '#103425', border: '#1f6d45' }
  }
  if (confidence >= 0.5) {
    return { label: 'Moderate', tone: colors.warning, bg: colors.warningSoft, border: '#7c6221' }
  }
  return { label: 'Low', tone: colors.down, bg: '#3a1721', border: '#7f2a3b' }
}

export function ConfidenceBadge({ confidence }) {
  const tier = getTier(confidence)
  const pct = confidence == null ? '--' : `${Math.round(confidence * 100)}%`

  return (
    <View
      style={{
        backgroundColor: tier.bg,
        borderColor: tier.border,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}
    >
      <Text style={{ color: tier.tone, fontSize: 10, fontWeight: '800', letterSpacing: 0.4 }}>{tier.label}</Text>
      <Text style={{ color: colors.text, fontSize: 12, fontWeight: '900', marginTop: 1 }}>{pct}</Text>
    </View>
  )
}
