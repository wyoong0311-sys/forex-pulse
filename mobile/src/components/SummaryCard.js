import React from 'react'
import { Text, View } from 'react-native'
import { colors } from '../theme/colors'
import { sharedStyles } from '../theme/styles'
import { Badge } from './Badge'

export function SummaryCard({ title, value, subtitle, body, badge, tone = 'neutral', style }) {
  const content = body ?? value ?? ''
  const helper = subtitle

  return (
    <View style={[sharedStyles.card, style]}>
      <View style={[sharedStyles.row, { alignItems: 'flex-start', marginBottom: 10 }]}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900', flex: 1, paddingRight: 10 }}>
          {title}
        </Text>
        {badge ? <Badge label={badge} tone={tone} /> : null}
      </View>
      <Text
        style={{
          color: colors.text,
          fontSize: value != null && body == null ? 16 : 14,
          fontWeight: value != null && body == null ? '900' : '500',
          lineHeight: 21,
        }}
      >
        {content}
      </Text>
      {helper ? <Text style={{ color: colors.muted, marginTop: 6 }}>{helper}</Text> : null}
    </View>
  )
}
