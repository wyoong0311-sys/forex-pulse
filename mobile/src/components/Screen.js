import React from 'react'
import { ScrollView, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { sharedStyles } from '../theme/styles'

export function Screen({ children }) {
  const insets = useSafeAreaInsets()
  const tabOverlayPadding = Math.max(insets.bottom + 24, 32)

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={[sharedStyles.content, { paddingBottom: tabOverlayPadding }]}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  )
}
