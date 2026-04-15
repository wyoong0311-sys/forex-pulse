import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { RootNavigator } from './src/navigation/RootNavigator'
import { AppProvider } from './src/state/AppContext'

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#07111f',
    card: '#0c1a2c',
    text: '#eff6ff',
    primary: '#67e8f9',
    border: '#16324f',
    notification: '#22c55e',
  },
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  )
}
