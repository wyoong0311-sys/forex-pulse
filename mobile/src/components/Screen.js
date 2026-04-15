import React from 'react'
import { ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { sharedStyles } from '../theme/styles'

export function Screen({ children }) {
  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={sharedStyles.content}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  )
}
