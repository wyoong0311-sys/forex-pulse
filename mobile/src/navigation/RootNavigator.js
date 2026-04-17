import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Text } from 'react-native'
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
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.panel,
          borderTopColor: colors.border,
          height: 72,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
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
