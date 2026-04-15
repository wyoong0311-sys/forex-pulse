import React from 'react'
import { Text, View } from 'react-native'
import Svg, { Line, Path } from 'react-native-svg'
import { colors } from '../theme/colors'

function buildPath(values, width, height, min, max) {
  const span = max - min || 1

  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width
      const y = height - ((value - min) / span) * height
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

export function PriceSparkline({ values = [], prediction = [], compact = false, showLegend = false }) {
  const safeValues = values.length ? values : [0, 0]
  const projectedValues = prediction.length ? [safeValues[safeValues.length - 1], ...prediction] : []
  const allValues = [...safeValues, ...projectedValues]
  const min = Math.min(...allValues)
  const max = Math.max(...allValues)
  const chartHeight = compact ? 54 : 150
  const actualWidth = compact ? 220 : 245
  const forecastWidth = compact ? 90 : 95
  const actualPath = buildPath(safeValues, actualWidth, chartHeight - 18, min, max)
  const predictionPath = prediction.length ? buildPath(projectedValues, forecastWidth, chartHeight - 18, min, max) : ''

  return (
    <View style={{ marginTop: compact ? 4 : 12 }}>
      {showLegend ? (
        <View style={{ flexDirection: 'row', gap: 14, marginBottom: 10 }}>
          <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '800' }}>Actual market</Text>
          <Text style={{ color: colors.forecast, fontSize: 12, fontWeight: '800' }}>Forecast</Text>
        </View>
      ) : null}
      <Svg width="100%" height={chartHeight} viewBox={`0 0 360 ${chartHeight}`}>
        {!compact ? (
          <>
            <Line x1="0" y1="18" x2="360" y2="18" stroke={colors.borderSoft} strokeWidth="1" />
            <Line x1="0" y1={chartHeight - 18} x2="360" y2={chartHeight - 18} stroke={colors.borderSoft} strokeWidth="1" />
            <Line x1="258" y1="8" x2="258" y2={chartHeight - 8} stroke={colors.border} strokeWidth="1.5" strokeDasharray="6 8" />
          </>
        ) : null}
        <Path d={actualPath} stroke={colors.accent} strokeWidth={compact ? 3 : 4} fill="none" />
        {predictionPath ? (
          <Path
            d={predictionPath}
            stroke={colors.forecast}
            strokeWidth={compact ? 2.5 : 4}
            fill="none"
            strokeDasharray="8 6"
            transform={`translate(${compact ? 230 : 262}, 0)`}
          />
        ) : null}
      </Svg>
    </View>
  )
}
