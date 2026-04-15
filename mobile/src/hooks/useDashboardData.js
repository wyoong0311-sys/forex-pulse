import { useEffect, useState } from 'react'
import { loadDashboard } from '../services/forexService'

export function useDashboardData(symbols = 'USDMYR,EURUSD,GBPUSD,USDJPY') {
  const [state, setState] = useState({
    loading: true,
    data: { pairs: [], highlights: [] },
  })

  useEffect(() => {
    let active = true

    loadDashboard(symbols).then((data) => {
      if (active) {
        setState({ loading: false, data })
      }
    })

    return () => {
      active = false
    }
  }, [symbols])

  return state
}
