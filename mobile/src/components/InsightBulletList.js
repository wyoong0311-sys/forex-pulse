import React from 'react'
import { Text, View } from 'react-native'
import { colors } from '../theme/colors'
import { sharedStyles } from '../theme/styles'

export function InsightBulletList({ items }) {
  return (
    <View style={sharedStyles.card}>
      {items.map((item) => (
        <View
          key={item}
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              backgroundColor: colors.accent,
              marginTop: 6,
            }}
          />
          <Text style={{ color: colors.muted, flex: 1, lineHeight: 20 }}>{item}</Text>
        </View>
      ))}
    </View>
  )
}
