import { useEffect, useState } from 'react'
import { loadDashboard, loadDashboardCached } from '../services/forexService'

export function useDashboardData(symbols = 'USDMYR,EURUSD,GBPUSD,USDJPY') {
  const [state, setState] = useState({
    loading: true,
    stale: false,
    data: { pairs: [], highlights: [] },
  })

  useEffect(() => {
    let active = true

    ;(async () => {
      const cached = await loadDashboardCached(symbols)
      if (active && cached) {
        setState({ loading: true, stale: true, data: cached })
      }
      try {
        const data = await loadDashboard(symbols)
        if (active) {
          setState({ loading: false, stale: false, data })
        }
      } catch {
        if (active) {
          setState((previous) => ({ ...previous, loading: false, stale: true }))
        }
      }
    })()

    return () => {
      active = false
    }
  }, [symbols])

  return state
}
