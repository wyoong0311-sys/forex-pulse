import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../theme/colors'
import { AlertsScreen } from '../screens/AlertsScreen'
import { HomeScreen } from '../screens/HomeScreen'
import { InsightsScreen } from '../screens/InsightsScreen'
import { MarketsScreen } from '../screens/MarketsScreen'
import { PairDetailScreen } from '../screens/PairDetailScreen'
import { SettingsScreen } from '../screens/SettingsScreen'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.panel },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.page },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PairDetail" component={PairDetailScreen} options={{ title: 'Pair Detail' }} />
    </Stack.Navigator>
  )
}

function MarketsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.panel },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.page },
      }}
    >
      <Stack.Screen name="MarketsHome" component={MarketsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PairDetail" component={PairDetailScreen} options={{ title: 'Pair Detail' }} />
    </Stack.Navigator>
  )
}

function tabIcon(label) {
  return ({ color }) => <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{label}</Text>
}

export function RootNavigator() {
  const insets = useSafeAreaInsets()
  const tabBarBottom = Math.max(insets.bottom, 8) + 6
  const tabBarHeight = 58 + tabBarBottom

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: tabBarBottom,
          backgroundColor: colors.panel,
          borderTopColor: 'transparent',
          borderTopWidth: 0,
          borderRadius: 22,
          height: tabBarHeight,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          elevation: 18,
          shadowColor: '#000',
          shadowOpacity: 0.35,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
          letterSpacing: 0.4,
        },
        tabBarItemStyle: {
          borderRadius: 14,
        },
      }}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ tabBarIcon: tabIcon('HOME') }} />
      <Tab.Screen name="Markets" component={MarketsStack} options={{ tabBarIcon: tabIcon('MKT') }} />
      <Tab.Screen name="Alerts" component={AlertsScreen} options={{ tabBarIcon: tabIcon('ALRT') }} />
      <Tab.Screen name="Insights" component={InsightsScreen} options={{ tabBarIcon: tabIcon('AI') }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarIcon: tabIcon('SET') }} />
    </Tab.Navigator>
  )
}
