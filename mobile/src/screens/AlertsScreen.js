import React, { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { AlertForm } from '../components/AlertForm'
import { AlertCard } from '../components/AlertCard'
import { Screen } from '../components/Screen'
import { SectionHeader } from '../components/SectionHeader'
import { Badge } from '../components/Badge'
import { SummaryCard } from '../components/SummaryCard'
import { createPriceAlert, loadAlertLogs, loadAlerts } from '../services/alertService'
import { useAppState } from '../state/AppContext'
import { colors } from '../theme/colors'
import { sharedStyles } from '../theme/styles'

const USER_ID = 1

export function AlertsScreen() {
  const { selectedPair } = useAppState()
  const [alertType, setAlertType] = useState('above')
  const [targetPrice, setTargetPrice] = useState('4.00')
  const [alerts, setAlerts] = useState([])
  const [logs, setLogs] = useState([])
  const [status, setStatus] = useState('')

  async function refresh() {
    try {
      const [nextAlerts, nextLogs] = await Promise.all([
        loadAlerts(USER_ID),
        loadAlertLogs(USER_ID),
      ])
      setAlerts(nextAlerts)
      setLogs(nextLogs)
    } catch {
      setStatus('Backend unavailable. Alert list will refresh when API is reachable.')
    }
  }

  async function submitAlert() {
    try {
      await createPriceAlert({
        userId: USER_ID,
        symbol: selectedPair,
        alertType,
        targetPrice,
      })
      setStatus('Alert saved to backend.')
      await refresh()
    } catch {
      setStatus('Could not save alert yet. Check backend connection.')
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <Screen>
      <LinearGradient
        colors={['#18395c', '#081525']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 32, borderColor: colors.border, borderWidth: 1, padding: 22, gap: 14 }}
      >
        <View style={sharedStyles.row}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ color: colors.mutedStrong, fontSize: 13, fontWeight: '800', letterSpacing: 1.4 }}>ALERT CENTER</Text>
            <Text style={{ color: colors.text, fontSize: 32, fontWeight: '900', marginTop: 8 }}>Stay ahead of moves</Text>
          </View>
          <Badge label={`${alerts.length} active`} tone={alerts.length ? 'up' : 'neutral'} />
        </View>
        <Text style={{ color: colors.mutedStrong, lineHeight: 21 }}>
          Fast alert creation, trigger history, and notification readiness in one workflow.
        </Text>
      </LinearGradient>

      <AlertForm
        alertType={alertType}
        targetPrice={targetPrice}
        onChangeAlertType={setAlertType}
        onChangeTargetPrice={setTargetPrice}
        onSubmit={submitAlert}
      />

      {status ? <Text style={{ color: colors.muted }}>{status}</Text> : null}

      <View>
        <SectionHeader title="Active alerts" subtitle="Rules stored in the backend and evaluated after rate updates." />
        {alerts.length ? (
          alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
        ) : (
          <SummaryCard
            title="No active alerts yet"
            body="Create one above. Start with a simple above/below rule before using forecast-based alerting."
            badge="Empty"
          />
        )}
      </View>

      <View style={sharedStyles.card}>
        <SectionHeader title="Notification history" subtitle="Recent backend alert trigger logs." />
        {logs.length ? (
          logs.slice(0, 5).map((log) => (
            <Text key={log.id} style={{ color: colors.muted, marginTop: 12, lineHeight: 20 }}>
              {log.message}
            </Text>
          ))
        ) : (
          <Text style={{ color: colors.muted, marginTop: 12 }}>No alert triggers logged yet.</Text>
        )}
      </View>
    </Screen>
  )
}
