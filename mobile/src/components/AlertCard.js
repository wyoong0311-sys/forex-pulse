import React from 'react'
import { Text, View } from 'react-native'
import { colors } from '../theme/colors'
import { sharedStyles } from '../theme/styles'
import { Badge } from './Badge'

export function AlertCard({ alert }) {
  const isActive = alert.status === 'Active' || alert.is_active
  const pair = alert.pair ?? alert.symbol
  const condition = alert.condition ?? `${alert.alert_type} ${alert.target_price}`

  return (
    <View style={[sharedStyles.card, { marginBottom: 12 }]}>
      <View style={[sharedStyles.row, { alignItems: 'flex-start' }]}>
        <View>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>{pair}</Text>
          <Text style={{ color: colors.muted, marginTop: 6 }}>{condition}</Text>
        </View>
        <Badge label={isActive ? 'Active' : 'Paused'} tone={isActive ? 'up' : 'warning'} />
      </View>
    </View>
  )
}
