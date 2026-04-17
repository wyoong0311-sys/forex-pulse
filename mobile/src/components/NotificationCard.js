import React from 'react'
import { Text, View } from 'react-native'
import { colors } from '../theme/colors'
import { sharedStyles } from '../theme/styles'
import { Badge } from './Badge'

export function NotificationCard({ title, body, timeLabel, badgeLabel, badgeTone = 'neutral', style }) {
  return (
    <View style={[sharedStyles.card, style]}>
      <View style={[sharedStyles.row, { alignItems: 'flex-start' }]}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800', flex: 1, paddingRight: 12 }}>
          {title}
        </Text>
        {badgeLabel ? <Badge label={badgeLabel} tone={badgeTone} /> : null}
      </View>
      <Text style={{ color: colors.mutedStrong, fontSize: 13, lineHeight: 20, marginTop: 8 }}>{body}</Text>
      {timeLabel ? <Text style={{ color: colors.textSubtle, fontSize: 12, marginTop: 10 }}>{timeLabel}</Text> : null}
    </View>
  )
}
