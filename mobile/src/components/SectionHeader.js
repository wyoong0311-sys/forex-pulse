import React from 'react'
import { Pressable, Text, View } from 'react-native'
import { colors } from '../theme/colors'

export function SectionHeader({ title, subtitle, action, actionLabel, onActionPress }) {
  return (
    <View
      style={{
        marginTop: 8,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: subtitle ? 'flex-end' : 'center',
        gap: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900' }}>{title}</Text>
        {subtitle ? <Text style={{ color: colors.muted, marginTop: 4, lineHeight: 19 }}>{subtitle}</Text> : null}
      </View>
      {action ?? null}
      {!action && actionLabel ? (
        <Pressable onPress={onActionPress}>
          <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '700' }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}
