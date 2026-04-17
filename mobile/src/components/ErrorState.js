import React from 'react'
import { Pressable, Text, View } from 'react-native'
import { colors } from '../theme/colors'

export function ErrorState({ title = 'Unable to load now', body, actionLabel = 'Retry', onActionPress }) {
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
      <Text style={{ color: colors.danger, fontSize: 16, fontWeight: '900' }}>{title}</Text>
      {body ? <Text style={{ color: colors.muted, marginTop: 8, lineHeight: 20 }}>{body}</Text> : null}
      {onActionPress ? (
        <Pressable
          onPress={onActionPress}
          style={{
            backgroundColor: colors.dangerBg,
            borderRadius: 14,
            alignSelf: 'flex-start',
            paddingHorizontal: 12,
            paddingVertical: 9,
            marginTop: 12,
          }}
        >
          <Text style={{ color: colors.danger, fontWeight: '800' }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}
