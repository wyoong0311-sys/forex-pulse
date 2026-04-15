import React from 'react'
import { Text, View } from 'react-native'
import { colors } from '../theme/colors'

export function SectionHeader({ title, subtitle, action }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900' }}>{title}</Text>
        {subtitle ? <Text style={{ color: colors.muted, marginTop: 4, lineHeight: 19 }}>{subtitle}</Text> : null}
      </View>
      {action ?? null}
    </View>
  )
}
