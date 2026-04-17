import React from 'react'
import { Text, View } from 'react-native'
import { colors } from '../theme/colors'

const toneMap = {
  bullish: { bg: '#123524', fg: colors.up, border: '#1f6d45' },
  bearish: { bg: '#3a1717', fg: colors.down, border: '#7f2a3b' },
  sideways: { bg: '#332b12', fg: colors.warning, border: '#7c6221' },
}

export function DirectionChip({ direction }) {
  const normalized = `${direction ?? 'unknown'}`.toLowerCase()
  const tone = toneMap[normalized] ?? { bg: colors.panelAlt, fg: colors.mutedStrong, border: colors.border }

  return (
    <View
      style={{
        backgroundColor: tone.bg,
        borderColor: tone.border,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}
    >
      <Text style={{ color: tone.fg, fontWeight: '900', fontSize: 11, letterSpacing: 0.3 }}>
        {normalized.toUpperCase()}
      </Text>
    </View>
  )
}
