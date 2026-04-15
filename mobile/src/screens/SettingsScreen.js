import React, { useEffect, useState } from 'react'
import { Pressable, Switch, Text, TextInput, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { registerDeviceTokenWithBackend } from '../services/notifications'
import { loadDailySummary, loadPreferences, savePreferences } from '../services/userService'
import { Screen } from '../components/Screen'
import { SectionHeader } from '../components/SectionHeader'
import { Badge } from '../components/Badge'
import { SummaryCard } from '../components/SummaryCard'
import { sharedStyles } from '../theme/styles'
import { colors } from '../theme/colors'

export function SettingsScreen() {
  const [pushStatus, setPushStatus] = useState('Not connected')
  const [saveStatus, setSaveStatus] = useState('Loading saved preferences...')
  const [dailySummary, setDailySummary] = useState(null)
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
    const result = await registerDeviceTokenWithBackend(1)
    setPushStatus(result.token ? `Connected: ${result.token.slice(0, 18)}...` : result.reason)
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
      try {
        const [saved, summary] = await Promise.all([loadPreferences(1), loadDailySummary(1)])
        setPreferences(saved)
        setDailySummary(summary)
        setSaveStatus('')
      } catch {
        setSaveStatus('Using local default preferences until backend is available.')
      }
    }

    load()
  }, [])

  return (
    <Screen>
      <LinearGradient
        colors={['#173553', '#081525']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 32, borderColor: colors.border, borderWidth: 1, padding: 22, gap: 14 }}
      >
        <View style={sharedStyles.row}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ color: colors.mutedStrong, fontSize: 13, fontWeight: '800', letterSpacing: 1.4 }}>SETTINGS</Text>
            <Text style={{ color: colors.text, fontSize: 32, fontWeight: '900', marginTop: 8 }}>Your control room</Text>
          </View>
          <Badge label="Saved" tone="forecast" />
        </View>
        <Text style={{ color: colors.mutedStrong, lineHeight: 21 }}>
          Notifications, refresh cadence, and daily summaries stay tied to your local user profile.
        </Text>
      </LinearGradient>

      <View style={sharedStyles.card}>
        <SectionHeader title="Push notifications" subtitle="Register this device with the backend notification flow." />
        <Text style={{ color: colors.muted, marginBottom: 16 }}>
          This starter uses Expo notifications on-device. For production Android push, add Firebase Android credentials and backend device-token storage.
        </Text>
        <Pressable
          onPress={connectPush}
          style={{
            backgroundColor: colors.panelAlt,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 16,
            paddingVertical: 14,
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '700' }}>Register Push</Text>
        </Pressable>
        <Text style={{ color: colors.muted }}>{pushStatus}</Text>
      </View>

      <View style={sharedStyles.card}>
        <SectionHeader title="Saved preferences" subtitle="Personal settings persisted through the backend preferences endpoint." />
        {saveStatus ? <Text style={{ color: colors.muted, marginBottom: 12 }}>{saveStatus}</Text> : null}

        <Text style={{ color: colors.muted, marginBottom: 6 }}>Refresh interval seconds</Text>
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
            marginBottom: 14,
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
            marginBottom: 14,
          }}
        />

        {[
          ['notifications_enabled', 'Notifications enabled'],
          ['price_alerts_enabled', 'Price alerts'],
          ['forecast_alerts_enabled', 'Forecast alerts'],
          ['daily_summary_enabled', 'Daily summary'],
        ].map(([key, label]) => (
          <View key={key} style={[sharedStyles.row, { marginBottom: 10 }]}>
            <Text style={{ color: colors.muted }}>{label}</Text>
            <Switch
              value={Boolean(preferences[key])}
              onValueChange={(value) => setPreferences((current) => ({ ...current, [key]: value }))}
            />
          </View>
        ))}

        <Pressable
          onPress={save}
          style={{
            backgroundColor: colors.panelAlt,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 16,
            paddingVertical: 14,
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '700' }}>Save Preferences</Text>
        </Pressable>
      </View>

      <View style={sharedStyles.card}>
        <SectionHeader title="Daily summary preview" subtitle="Payload generated from your watchlist and insights." />
        {dailySummary ? (
          <>
            <Text style={{ color: colors.muted, marginBottom: 8 }}>
              Sends at {dailySummary.summary_time} {dailySummary.timezone}
            </Text>
            <Text style={{ color: colors.muted }}>
              Watchlist: {dailySummary.watchlist.join(', ')}
            </Text>
          </>
        ) : (
          <Text style={{ color: colors.muted }}>Summary payload unavailable.</Text>
        )}
      </View>

      <SummaryCard
        title="What forecasts mean"
        badge="Important"
        tone="warning"
        body="Forecasts are model estimates with confidence and accuracy tracking. They are not guarantees, and they should not be read as buy or sell instructions."
      />
    </Screen>
  )
}
