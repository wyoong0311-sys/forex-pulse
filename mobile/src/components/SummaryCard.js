import React from 'react'
import { Text, View } from 'react-native'
import { colors } from '../theme/colors'
import { sharedStyles } from '../theme/styles'
import { Badge } from './Badge'

export function SummaryCard({ title, body, badge, tone = 'neutral', style }) {
  return (
    <View style={[sharedStyles.card, style]}>
      <View style={[sharedStyles.row, { alignItems: 'flex-start', marginBottom: 10 }]}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900', flex: 1, paddingRight: 10 }}>
          {title}
        </Text>
        {badge ? <Badge label={badge} tone={tone} /> : null}
      </View>
      <Text style={{ color: colors.mutedStrong, lineHeight: 21 }}>{body}</Text>
    </View>
  )
}
