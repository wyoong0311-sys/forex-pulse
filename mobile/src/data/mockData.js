export const pairCards = [
  { symbol: 'USD/MYR', price: 4.7362, change: 0.18, confidence: 0.62 },
  { symbol: 'EUR/USD', price: 1.0864, change: 0.42, confidence: 0.68 },
  { symbol: 'GBP/USD', price: 1.2741, change: -0.13, confidence: 0.55 },
  { symbol: 'USD/JPY', price: 152.34, change: 0.61, confidence: 0.73 },
  { symbol: 'AUD/USD', price: 0.6618, change: -0.22, confidence: 0.51 },
]

export const insightBullets = [
  'Volatility is expanding on yen pairs after the latest impulse move.',
  'Dollar strength remains broad, but confidence weakens when the daily range compresses.',
  'Use the accuracy tracker before trusting any pair-specific model output.',
]

export const alertsSeed = [
  { id: '1', pair: 'EUR/USD', condition: 'Above 1.0900', status: 'Active' },
  { id: '2', pair: 'USD/JPY', condition: 'Below 151.20', status: 'Paused' },
]

export const historySeed = [1.074, 1.078, 1.082, 1.079, 1.085, 1.087, 1.086, 1.089]
