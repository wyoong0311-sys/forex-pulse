import React from 'react'
import { Text, View } from 'react-native'
import { colors } from '../theme/colors'

export function Badge({ label, tone = 'neutral' }) {
  const toneMap = {
    neutral: { bg: colors.panelAlt, fg: colors.mutedStrong, border: colors.border },
    up: { bg: '#123524', fg: colors.up, border: '#1f6d45' },
    down: { bg: '#3a1721', fg: colors.down, border: '#7f2a3b' },
    warning: { bg: colors.warningSoft, fg: colors.warning, border: '#7c6221' },
    forecast: { bg: colors.accentSoft, fg: colors.accent, border: '#1b6b78' },
  }
  const active = toneMap[tone] ?? toneMap.neutral

  return (
    <View
      style={{
        backgroundColor: active.bg,
        borderColor: active.border,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}
    >
      <Text style={{ color: active.fg, fontSize: 12, fontWeight: '800' }}>{label}</Text>
    </View>
  )
}
