import React from 'react'
import { Text, View } from 'react-native'
import { sharedStyles } from '../theme/styles'

export function SectionTitle({ title, subtitle }) {
  return (
    <View>
      <Text style={sharedStyles.title}>{title}</Text>
      {subtitle ? <Text style={sharedStyles.subtitle}>{subtitle}</Text> : null}
    </View>
  )
}
