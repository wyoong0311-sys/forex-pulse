import { startTransition, useDeferredValue, useEffect, useState } from 'react'
import './App.css'

const FOREX_PAIRS = [
  { symbol: 'EUR/USD', base: 'EUR', quote: 'USD', label: 'Euro vs US Dollar' },
  { symbol: 'GBP/USD', base: 'GBP', quote: 'USD', label: 'Pound vs US Dollar' },
  { symbol: 'USD/JPY', base: 'USD', quote: 'JPY', label: 'US Dollar vs Japanese Yen' },
  { symbol: 'AUD/USD', base: 'AUD', quote: 'USD', label: 'Australian Dollar vs US Dollar' },
  { symbol: 'USD/CHF', base: 'USD', quote: 'CHF', label: 'US Dollar vs Swiss Franc' },
  { symbol: 'USD/CAD', base: 'USD', quote: 'CAD', label: 'US Dollar vs Canadian Dollar' },
]

const DAY_WINDOWS = [
  { label: '1M', value: 30 },
  { label: '6W', value: 42 },
  { label: '3M', value: 90 },
]

const formatPrice = (value) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: value >= 20 ? 2 : 4,
    maximumFractionDigits: value >= 20 ? 2 : 4,
  }).format(value)

const formatDelta = (value) => `${value > 0 ? '+' : ''}${value.toFixed(2)}%`

const formatDateLabel = (value) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(value),
  )

const getDateRange = (days) => {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - days)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value))

function buildFallbackSeries(pair, days) {
  const today = new Date()
  const startingPointMap = {
    'EUR/USD': 1.083,
    'GBP/USD': 1.271,
    'USD/JPY': 151.2,
    'AUD/USD': 0.658,
    'USD/CHF': 0.904,
    'USD/CAD': 1.356,
  }
  const seed = pair.symbol.split('').reduce((accumulator, letter) => accumulator + letter.charCodeAt(0), 0)
  const baseValue = startingPointMap[pair.symbol] ?? 1
  const series = []

  for (let index = days; index >= 0; index -= 1) {
    const pointDate = new Date(today)
    pointDate.setDate(today.getDate() - index)

    if ([0, 6].includes(pointDate.getDay())) {
      continue
    }

    const phase = (days - index + seed) / 3.5
    const wave = Math.sin(phase) * baseValue * 0.012
    const drift = (days - index) * baseValue * 0.0005
    const noise = Math.cos(phase * 1.7) * baseValue * 0.0025

    series.push({
      date: pointDate.toISOString().slice(0, 10),
      value: Number((baseValue + wave + noise + drift).toFixed(4)),
    })
  }

  return series
}

function buildForecast(series, points = 5) {
  const sample = series.slice(-10)

  if (sample.length < 4) {
    return []
  }

  const xs = sample.map((_, index) => index)
  const ys = sample.map((item) => item.value)
  const xMean = mean(xs)
  const yMean = mean(ys)

  const numerator = xs.reduce(
    (sum, x, index) => sum + (x - xMean) * (ys[index] - yMean),
    0,
  )
  const denominator = xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0) || 1
  const slope = numerator / denominator
  const intercept = yMean - slope * xMean

  return Array.from({ length: points }, (_, index) => {
    const futureDate = new Date(`${series.at(-1).date}T00:00:00`)
    futureDate.setDate(futureDate.getDate() + index + 1)

    while ([0, 6].includes(futureDate.getDay())) {
      futureDate.setDate(futureDate.getDate() + 1)
    }

    const futureX = xs.at(-1) + index + 1
    const prediction = intercept + slope * futureX

    return {
      date: futureDate.toISOString().slice(0, 10),
      value: Number(prediction.toFixed(4)),
    }
  })
}

function buildInsights(series, forecast) {
  const latest = series.at(-1)?.value ?? 0
  const previous = series.at(-2)?.value ?? latest
  const weekAgo = series.at(-6)?.value ?? previous
  const moveToday = previous ? ((latest - previous) / previous) * 100 : 0
  const weeklyMove = weekAgo ? ((latest - weekAgo) / weekAgo) * 100 : 0
  const high = Math.max(...series.map((item) => item.value))
  const low = Math.min(...series.map((item) => item.value))
  const average = mean(series.map((item) => item.value))
  const dailyReturns = series
    .slice(1)
    .map((item, index) => ((item.value - series[index].value) / series[index].value) * 100)
  const averageReturn = dailyReturns.length ? mean(dailyReturns) : 0
  const volatility = dailyReturns.length
    ? Math.sqrt(mean(dailyReturns.map((item) => (item - averageReturn) ** 2)))
    : 0
  const projected = forecast.at(-1)?.value ?? latest

  return {
    latest,
    moveToday,
    weeklyMove,
    rangeSpread: ((high - low) / average) * 100,
    volatility,
    projected,
    bias:
      projected > latest
        ? 'Forecast leans bullish over the next few sessions.'
        : 'Forecast leans softer unless momentum improves.',
  }
}

function buildPath(points, width, height, minValue, maxValue) {
  if (!points.length) {
    return ''
  }

  const usableHeight = height - 30
  const valueRange = maxValue - minValue || 1

  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * (width - 16) + 8
      const y =
        usableHeight - ((point.value - minValue) / valueRange) * usableHeight + 10

      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

function LineChart({ actual, forecast, height = 280 }) {
  const width = 900
  const combined = [...actual, ...forecast]
  const minValue = Math.min(...combined.map((item) => item.value)) * 0.995
  const maxValue = Math.max(...combined.map((item) => item.value)) * 1.005
  const actualPath = buildPath(actual, width, height, minValue, maxValue)
  const forecastSeries = actual.at(-1) ? [actual.at(-1), ...forecast] : forecast
  const forecastPath = buildPath(forecastSeries, width, height, minValue, maxValue)
  const labels = [
    actual[0]?.date,
    actual[Math.floor(actual.length / 2)]?.date,
    actual.at(-1)?.date,
    forecast.at(-1)?.date,
  ].filter(Boolean)

  return (
    <div className="chart-shell">
      <svg viewBox={`0 0 ${width} ${height}`} className="chart" role="img" aria-label="Forex price line chart">
        {[0, 1, 2, 3].map((row) => {
          const y = 18 + row * ((height - 40) / 3)
          return <line key={y} x1="8" x2={width - 8} y1={y} y2={y} className="chart-grid" />
        })}
        <path d={actualPath} className="chart-line" />
        <path d={forecastPath} className="chart-line chart-line--forecast" />
      </svg>
      <div className="chart-labels">
        {labels.map((label) => (
          <span key={label}>{formatDateLabel(label)}</span>
        ))}
      </div>
    </div>
  )
}

function Metric({ label, value, tone = 'neutral' }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong className={`metric-value metric-value--${tone}`}>{value}</strong>
    </div>
  )
}

function App() {
  const [selectedPair, setSelectedPair] = useState(FOREX_PAIRS[0])
  const [selectedWindow, setSelectedWindow] = useState(DAY_WINDOWS[1].value)
  const deferredPair = useDeferredValue(selectedPair)
  const [marketState, setMarketState] = useState({
    loading: true,
    error: '',
    source: 'Live',
    series: buildFallbackSeries(FOREX_PAIRS[0], DAY_WINDOWS[1].value),
  })

  useEffect(() => {
    let isCancelled = false

    async function loadSeries() {
      setMarketState((current) => ({ ...current, loading: true, error: '' }))

      const range = getDateRange(selectedWindow)
      const fallbackSeries = buildFallbackSeries(deferredPair, selectedWindow)

      try {
        const url = `https://api.frankfurter.app/${range.start}..${range.end}?from=${deferredPair.base}&to=${deferredPair.quote}`
        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const payload = await response.json()
        const liveSeries = Object.entries(payload.rates ?? {}).map(([date, values]) => ({
          date,
          value: values[deferredPair.quote],
        }))

        if (!liveSeries.length) {
          throw new Error('No market data returned.')
        }

        if (!isCancelled) {
          setMarketState({
            loading: false,
            error: '',
            source: 'Live ECB feed',
            series: liveSeries,
          })
        }
      } catch (error) {
        if (!isCancelled) {
          setMarketState({
            loading: false,
            error: error.message,
            source: 'Demo fallback data',
            series: fallbackSeries,
          })
        }
      }
    }

    loadSeries()

    return () => {
      isCancelled = true
    }
  }, [deferredPair, selectedWindow])

  const forecast = buildForecast(marketState.series)
  const insights = buildInsights(marketState.series, forecast)

  const miniCards = FOREX_PAIRS.map((pair, index) => {
    const fallback = buildFallbackSeries(pair, 14)
    const latest = fallback.at(-1)?.value ?? 0
    const previous = fallback.at(-2)?.value ?? latest
    const change = previous ? ((latest - previous) / previous) * 100 : 0

    return {
      ...pair,
      latest,
      change,
      intensity: clamp(Math.abs(change) * 10 + index * 6, 12, 96),
    }
  })

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Daily forex monitor</p>
          <h1>Track major currency pairs, see trend lines, and follow a short-horizon forecast.</h1>
          <p className="hero-text">
            This dashboard watches daily FX movement, plots the recent line chart, and adds a simple projection based on the latest trend. Use it as a decision aid, not as guaranteed trading advice.
          </p>
        </div>

        <div className="status-panel">
          <div>
            <span className="status-label">Selected pair</span>
            <strong>{selectedPair.symbol}</strong>
            <p>{selectedPair.label}</p>
          </div>
          <div>
            <span className="status-label">Data source</span>
            <strong>{marketState.source}</strong>
            <p>{marketState.loading ? 'Refreshing now...' : 'Updated on load'}</p>
          </div>
        </div>
      </section>

      <section className="market-strip" aria-label="Quick market snapshot">
        {miniCards.map((pair) => (
          <button
            key={pair.symbol}
            className={`ticker-chip ${pair.symbol === selectedPair.symbol ? 'ticker-chip--active' : ''}`}
            onClick={() => {
              startTransition(() => {
                setSelectedPair(pair)
              })
            }}
          >
            <span>{pair.symbol}</span>
            <strong>{formatPrice(pair.latest)}</strong>
            <small className={pair.change >= 0 ? 'tone-up' : 'tone-down'}>
              {formatDelta(pair.change)}
            </small>
            <i style={{ width: `${pair.intensity}%` }} />
          </button>
        ))}
      </section>

      <section className="workspace">
        <div className="workspace-header">
          <div>
            <h2>Daily trend and prediction</h2>
            <p>
              Actual daily close on the solid line, model estimate on the dashed line.
              Weekends may be absent because forex reference feeds typically publish business days only.
            </p>
          </div>
          <div className="window-switcher" role="tablist" aria-label="Date range">
            {DAY_WINDOWS.map((window) => (
              <button
                key={window.value}
                className={window.value === selectedWindow ? 'window-switcher--active' : ''}
                onClick={() => setSelectedWindow(window.value)}
              >
                {window.label}
              </button>
            ))}
          </div>
        </div>

        <div className="chart-panel">
          <LineChart actual={marketState.series} forecast={forecast} />
        </div>

        <div className="metrics-grid">
          <Metric label="Last price" value={formatPrice(insights.latest)} />
          <Metric
            label="1-day move"
            value={formatDelta(insights.moveToday)}
            tone={insights.moveToday >= 0 ? 'up' : 'down'}
          />
          <Metric
            label="1-week move"
            value={formatDelta(insights.weeklyMove)}
            tone={insights.weeklyMove >= 0 ? 'up' : 'down'}
          />
          <Metric label="Range width" value={formatDelta(insights.rangeSpread)} />
          <Metric label="Daily volatility" value={formatDelta(insights.volatility)} />
          <Metric label="Projected 5-day" value={formatPrice(insights.projected)} />
        </div>
      </section>

      <section className="insight-grid">
        <article className="insight-panel">
          <p className="eyebrow">Model read</p>
          <h3>{insights.bias}</h3>
          <p>
            The projection is generated from the recent slope in the last 10 trading sessions. Stronger spikes, news shocks, and central-bank decisions can invalidate it quickly, so treat it as a direction clue only.
          </p>
        </article>

        <article className="insight-panel">
          <p className="eyebrow">What else this site can show</p>
          <ul>
            <li>economic calendar events that may move the selected pair</li>
            <li>buy and sell alert zones you set yourself</li>
            <li>support and resistance levels from recent highs and lows</li>
            <li>news sentiment and AI-written daily market summary</li>
            <li>export to CSV or a simple trade journal</li>
          </ul>
        </article>

        <article className="insight-panel">
          <p className="eyebrow">Current feed note</p>
          <h3>{marketState.error ? 'Using fallback dataset right now.' : 'Live historical feed loaded.'}</h3>
          <p>
            {marketState.error
              ? `The app switched to demo data because the live request returned: ${marketState.error}`
              : 'The chart is using historical rates from a public European Central Bank-backed feed through Frankfurter.'}
          </p>
        </article>
      </section>
    </main>
  )
}

export default App
