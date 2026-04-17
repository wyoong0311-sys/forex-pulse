import React, { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { Badge } from '../components/Badge'
import { AlertCard } from '../components/AlertCard'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { NotificationCard } from '../components/NotificationCard'
import { SectionHeader } from '../components/SectionHeader'
import { createPriceAlert, loadAlertLogs, loadAlerts } from '../services/alertService'
import { useAppState } from '../state/AppContext'
import { colors } from '../theme/colors'

const USER_ID = 1

const TYPES = [
  ['above', 'Above target'],
  ['below', 'Below target'],
  ['crosses_above', 'Crosses above'],
  ['crosses_below', 'Crosses below'],
]

export function AlertsScreen() {
  const { selectedPair } = useAppState()
  const [symbol, setSymbol] = useState(selectedPair.replace('/', ''))
  const [alertType, setAlertType] = useState('above')
  const [targetPrice, setTargetPrice] = useState('')
  const [alerts, setAlerts] = useState([])
  const [logs, setLogs] = useState([])
  const [status, setStatus] = useState('Loading alerts...')
  const [isRefreshing, setIsRefreshing] = useState(true)
  const [loadError, setLoadError] = useState('')

  async function refresh() {
    setIsRefreshing(true)
    try {
      const [nextAlerts, nextLogs] = await Promise.all([loadAlerts(USER_ID), loadAlertLogs(USER_ID)])
      setAlerts(nextAlerts ?? [])
      setLogs(nextLogs ?? [])
      setStatus('')
      setLoadError('')
    } catch {
      setStatus('Backend unavailable. Alerts will sync when API is reachable.')
      setLoadError('Could not load alerts and logs from backend.')
    } finally {
      setIsRefreshing(false)
    }
  }

  async function submitAlert() {
    try {
      await createPriceAlert({
        userId: USER_ID,
        symbol: symbol || selectedPair,
        alertType,
        targetPrice,
      })
      setStatus('Alert saved.')
      await refresh()
    } catch {
      setStatus('Could not save alert yet. Check backend connection.')
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const activeAlerts = alerts.filter((item) => item.is_active)
  const recentLogs = useMemo(() => (logs ?? []).slice(0, 5), [logs])

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0b1020' }} contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
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
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: '900' }}>Alerts</Text>
          <Badge label={`${activeAlerts.length} active`} tone={activeAlerts.length ? 'up' : 'neutral'} />
        </View>
        <Text style={{ color: colors.muted, marginTop: 8, lineHeight: 20 }}>
          Create alerts in seconds and monitor trigger history with delivery status.
        </Text>
      </View>

      {loadError ? <ErrorState title="Alerts unavailable" body={loadError} onActionPress={refresh} /> : null}
      {isRefreshing && !alerts.length ? (
        <LoadingState title="Loading alerts..." subtitle="Syncing active rules and trigger logs." />
      ) : null}

      <View
        style={{
          backgroundColor: '#131a2b',
          borderRadius: 22,
          padding: 16,
          marginTop: 12,
          borderWidth: 1,
          borderColor: colors.borderSoft,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 10 }}>Quick create</Text>
        <Text style={{ color: colors.muted, marginBottom: 6 }}>Pair</Text>
        <TextInput
          value={symbol}
          onChangeText={(value) => setSymbol(value.toUpperCase().replace('/', ''))}
          placeholder="USDMYR"
          placeholderTextColor={colors.muted}
          style={{
            color: colors.text,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 10,
            backgroundColor: '#0f1524',
          }}
        />

        <Text style={{ color: colors.muted, marginBottom: 8 }}>Condition</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {TYPES.map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setAlertType(key)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: alertType === key ? colors.accent : colors.border,
                backgroundColor: alertType === key ? colors.accentSoft : '#0f1524',
              }}
            >
              <Text
                style={{
                  color: alertType === key ? colors.accent : colors.mutedStrong,
                  fontSize: 12,
                  fontWeight: '800',
                }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={{ color: colors.muted, marginBottom: 6 }}>Target price</Text>
        <TextInput
          value={targetPrice}
          onChangeText={setTargetPrice}
          placeholder="3.9900"
          keyboardType="decimal-pad"
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
        <Pressable
          onPress={submitAlert}
          style={{
            backgroundColor: '#2b78ff',
            paddingVertical: 14,
            borderRadius: 16,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '900' }}>Save Alert</Text>
        </Pressable>
        {status ? <Text style={{ color: colors.muted, marginTop: 10 }}>{status}</Text> : null}
      </View>

      <View style={{ marginTop: 14 }}>
        <SectionHeader title="Active alerts" />
        {activeAlerts.length ? (
          activeAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
        ) : (
          <EmptyState title="No active alerts yet" body="Create your first alert in Quick create above." />
        )}
      </View>

      <View style={{ marginTop: 10 }}>
        <SectionHeader title="Alert history" />
        {recentLogs.length ? (
          recentLogs.map((log) => (
            <NotificationCard
              key={log.id}
              title="Triggered alert"
              body={log.message}
              timeLabel={log.sent_at ? new Date(log.sent_at).toLocaleString() : ''}
              badgeLabel="Log"
              badgeTone="forecast"
              style={{ marginBottom: 8 }}
            />
          ))
        ) : (
          <EmptyState title="No trigger logs yet" body="Triggered alerts will appear here with timestamps." />
        )}
      </View>
    </ScrollView>
  )
}
