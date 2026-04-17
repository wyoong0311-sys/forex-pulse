import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { alertsSeed, pairCards } from '../data/mockData'
import { registerDeviceTokenWithBackend } from '../services/notifications'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [selectedPair, setSelectedPair] = useState(pairCards[0].symbol)
  const [alerts, setAlerts] = useState(alertsSeed)
  const [pushRegistration, setPushRegistration] = useState({ token: null, reason: '' })

  useEffect(() => {
    let isMounted = true

    async function registerPush() {
      try {
        const result = await registerDeviceTokenWithBackend(1)
        if (isMounted) {
          setPushRegistration(result)
        }
      } catch (error) {
        if (isMounted) {
          setPushRegistration({ token: null, reason: error?.message ?? 'Push registration failed.' })
        }
      }
    }

    registerPush()
    return () => {
      isMounted = false
    }
  }, [])

  const value = useMemo(
    () => ({
      selectedPair,
      setSelectedPair,
      alerts,
      pushRegistration,
      addAlert: (alert) =>
        setAlerts((current) => [{ id: `${Date.now()}`, ...alert }, ...current]),
    }),
    [alerts, pushRegistration, selectedPair],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppState() {
  const context = useContext(AppContext)

  if (!context) {
    throw new Error('useAppState must be used inside AppProvider')
  }

  return context
}
