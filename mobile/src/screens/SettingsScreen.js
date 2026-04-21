import React, { useEffect, useState } from 'react'
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Badge } from '../components/Badge'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { SummaryCard } from '../components/SummaryCard'
import { registerDeviceTokenWithBackend } from '../services/notifications'
import { loadDailySummary, loadPreferences, savePreferences } from '../services/userService'
import { colors } from '../theme/colors'

export function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const tabOverlayPadding = Math.max(insets.bottom + 130, 150)
  const [pushStatus, setPushStatus] = useState('Not connected')
  const [saveStatus, setSaveStatus] = useState('Loading saved preferences...')
  const [dailySummary, setDailySummary] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [preferences, setPreferences] = useState({
    refresh_interval_seconds: 900,
    notifications_enabled: true,
    price_alerts_enabled: true,
    forecast_alerts_enabled: false,
    daily_summary_enabled: true,
    daily_summary_time: '08:00',
    timezone: 'Asia/Singapore',
  })

  async function connectPush() {
    try {
      const result = await registerDeviceTokenWithBackend(1)
      setPushStatus(result.token ? `Connected: ${result.token.slice(0, 18)}...` : result.reason)
    } catch {
      setPushStatus('Push registration failed.')
    }
  }

  async function save() {
    try {
      const saved = await savePreferences({
        ...preferences,
        refresh_interval_seconds: Number(preferences.refresh_interval_seconds) || 900,
      })
      setPreferences(saved)
      setSaveStatus('Preferences saved.')
      const summary = await loadDailySummary(1)
      setDailySummary(summary)
    } catch {
      setSaveStatus('Could not save preferences yet. Check backend connection.')
    }
  }

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const [saved, summary] = await Promise.all([loadPreferences(1), loadDailySummary(1)])
        setPreferences(saved)
        setDailySummary(summary)
        setSaveStatus('')
        setLoadError('')
      } catch {
        setSaveStatus('Using local defaults until backend is available.')
        setLoadError('Saved settings could not be loaded from backend.')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0b1020' }} contentContainerStyle={{ padding: 18, paddingBottom: tabOverlayPadding }}>
      <View
        style={{
          backgroundColor: '#131a2b',
          borderRadius: 24,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.borderSoft,
          marginTop: 10,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: '900' }}>Settings</Text>
          <Badge label="Profile 1" tone="forecast" />
        </View>
        <Text style={{ color: colors.muted, marginTop: 8, lineHeight: 20 }}>
          Notifications, refresh cadence, summary schedule, and trust context.
        </Text>
      </View>
      {loadError ? (
        <View style={{ marginTop: 12 }}>
          <ErrorState title="Settings sync delayed" body={loadError} />
        </View>
      ) : null}
      {isLoading ? (
        <View style={{ marginTop: 12 }}>
          <LoadingState title="Loading settings..." subtitle="Syncing preferences and daily summary profile." />
        </View>
      ) : null}

      <View
        style={{
          marginTop: 12,
          backgroundColor: '#131a2b',
          borderRadius: 18,
          padding: 15,
          borderWidth: 1,
          borderColor: colors.borderSoft,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '900', marginBottom: 8 }}>
          Push registration
        </Text>
        <Text style={{ color: colors.muted, marginBottom: 12 }}>
          Register this phone for alert notifications.
        </Text>
        <Pressable
          onPress={connectPush}
          style={{
            backgroundColor: '#2b78ff',
            borderRadius: 14,
            alignItems: 'center',
            paddingVertical: 12,
            marginBottom: 10,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '900' }}>Register Push</Text>
        </Pressable>
        <Text style={{ color: colors.muted }}>{pushStatus}</Text>
      </View>

      <View
        style={{
          marginTop: 12,
          backgroundColor: '#131a2b',
          borderRadius: 18,
          padding: 15,
          borderWidth: 1,
          borderColor: colors.borderSoft,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '900', marginBottom: 8 }}>
          Preferences
        </Text>
        {saveStatus ? <Text style={{ color: colors.muted, marginBottom: 8 }}>{saveStatus}</Text> : null}

        <Text style={{ color: colors.muted, marginBottom: 6 }}>Refresh interval (seconds)</Text>
        <TextInput
          value={`${preferences.refresh_interval_seconds}`}
          onChangeText={(value) => setPreferences((current) => ({ ...current, refresh_interval_seconds: value }))}
          keyboardType="number-pad"
          style={{
            color: colors.text,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 12,
            backgroundColor: '#0f1524',
          }}
        />

        <Text style={{ color: colors.muted, marginBottom: 6 }}>Daily summary time</Text>
        <TextInput
          value={preferences.daily_summary_time}
          onChangeText={(value) => setPreferences((current) => ({ ...current, daily_summary_time: value }))}
          placeholder="08:00"
          placeholderTextColor={colors.muted}
          style={{
            color: colors.text,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 12,
            backgroundColor: '#0f1524',
          }}
        />

        {[
          ['notifications_enabled', 'Notifications'],
          ['price_alerts_enabled', 'Price alerts'],
          ['forecast_alerts_enabled', 'Forecast alerts'],
          ['daily_summary_enabled', 'Daily summary'],
        ].map(([key, label]) => (
          <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ color: colors.mutedStrong }}>{label}</Text>
            <Switch
              value={Boolean(preferences[key])}
              onValueChange={(value) => setPreferences((current) => ({ ...current, [key]: value }))}
            />
          </View>
        ))}

        <Pressable
          onPress={save}
          style={{
            backgroundColor: '#161f36',
            borderRadius: 14,
            alignItems: 'center',
            paddingVertical: 12,
            marginTop: 4,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '800' }}>Save Preferences</Text>
        </Pressable>
      </View>

      <View
        style={{
          marginTop: 12,
          backgroundColor: '#131a2b',
          borderRadius: 18,
          padding: 15,
          borderWidth: 1,
          borderColor: colors.borderSoft,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '900', marginBottom: 8 }}>
          Daily summary preview
        </Text>
        {dailySummary ? (
          <>
            <Text style={{ color: colors.muted }}>
              Sends at {dailySummary.summary_time} {dailySummary.timezone}
            </Text>
            <Text style={{ color: colors.muted, marginTop: 6 }}>
              Watchlist: {dailySummary.watchlist.join(', ')}
            </Text>
          </>
        ) : (
          <EmptyState title="Summary payload unavailable" body="Daily summary appears after summary scheduling is enabled." />
        )}
      </View>

      <SummaryCard
        title="What forecasts mean"
        badge="Important"
        tone="warning"
        body="Forecasts are analytical estimates based on historical patterns and model performance. They are not guaranteed outcomes."
        style={{ marginTop: 12 }}
      />
    </ScrollView>
  )
}
