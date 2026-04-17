import React from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { colors } from '../theme/colors'

export function LoadingState({ title = 'Refreshing market data...', subtitle = 'Please wait while we sync live data.' }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.borderSoft,
        padding: 16,
      }}
    >
      <View
        style={{
          height: 74,
          borderRadius: 14,
          backgroundColor: colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800', marginTop: 12 }}>{title}</Text>
      <Text style={{ color: colors.muted, marginTop: 6, lineHeight: 19 }}>{subtitle}</Text>
    </View>
  )
}
