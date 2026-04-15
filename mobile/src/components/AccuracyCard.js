import React from 'react'
import { Text, View } from 'react-native'
import { colors } from '../theme/colors'
import { sharedStyles } from '../theme/styles'

export function AccuracyCard({ metrics }) {
  return (
    <View style={sharedStyles.card}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 10 }}>
        Accuracy Tracker
      </Text>
      {Object.entries(metrics).map(([label, value]) => (
        <View key={label} style={[sharedStyles.row, { marginBottom: 8 }]}>
          <Text style={{ color: colors.muted }}>{label.toUpperCase()}</Text>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{value}</Text>
        </View>
      ))}
    </View>
  )
}
