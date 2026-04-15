import React, { createContext, useContext, useMemo, useState } from 'react'
import { alertsSeed, pairCards } from '../data/mockData'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [selectedPair, setSelectedPair] = useState(pairCards[0].symbol)
  const [alerts, setAlerts] = useState(alertsSeed)

  const value = useMemo(
    () => ({
      selectedPair,
      setSelectedPair,
      alerts,
      addAlert: (alert) =>
        setAlerts((current) => [{ id: `${Date.now()}`, ...alert }, ...current]),
    }),
    [alerts, selectedPair],
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
