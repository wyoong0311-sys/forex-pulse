import React from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { colors } from '../theme/colors'
import { sharedStyles } from '../theme/styles'
import { ALERT_TYPES } from '../constants/pairs'

export function AlertForm({ alertType, targetPrice, onChangeAlertType, onChangeTargetPrice, onSubmit }) {
  return (
    <View style={sharedStyles.card}>
      <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 10 }}>Create Alert</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {ALERT_TYPES.filter((item) => item.value.includes('above') || item.value.includes('below')).map((item) => (
          <Pressable
            key={item.value}
            onPress={() => onChangeAlertType(item.value)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: alertType === item.value ? colors.accent : colors.panelAlt,
            }}
          >
            <Text style={{ color: alertType === item.value ? colors.page : colors.text, fontWeight: '700' }}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        value={targetPrice}
        onChangeText={onChangeTargetPrice}
        keyboardType="decimal-pad"
        placeholder="Target price, e.g. 4.00"
        placeholderTextColor={colors.muted}
        style={{
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 14,
          padding: 14,
          color: colors.text,
          marginBottom: 14,
        }}
      />
      <Pressable
        onPress={onSubmit}
        style={{
          backgroundColor: colors.accentStrong,
          borderRadius: 16,
          paddingVertical: 14,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#042032', fontWeight: '800' }}>Add Alert</Text>
      </Pressable>
    </View>
  )
}
