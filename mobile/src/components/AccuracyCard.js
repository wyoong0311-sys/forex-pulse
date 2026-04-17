import React from 'react'
import { Text, View } from 'react-native'
import { colors } from '../theme/colors'
import { sharedStyles } from '../theme/styles'
import { Badge } from './Badge'

export function AccuracyCard({ metrics, latest, baseline, title = 'Accuracy Tracker' }) {
  if (metrics) {
    return (
      <View style={sharedStyles.card}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 10 }}>
          {title}
        </Text>
        {Object.entries(metrics).map(([label, value]) => (
          <View key={label} style={[sharedStyles.row, { marginBottom: 8 }]}>
            <Text style={{ color: colors.muted }}>{label.toUpperCase()}</Text>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{value}</Text>
          </View>
        ))}
      </View>
    )
  }

  if (!latest) {
    return (
      <View style={sharedStyles.card}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 10 }}>{title}</Text>
        <Text style={{ color: colors.muted }}>Accuracy appears after backtests run for this pair.</Text>
      </View>
    )
  }

  const latestMae = Number(latest.mae ?? 0)
  const baselineMae = Number(baseline?.mae ?? 0)
  const delta = baselineMae ? (((baselineMae - latestMae) / baselineMae) * 100).toFixed(1) : null

  return (
    <View style={sharedStyles.card}>
      <View style={[sharedStyles.row, { marginBottom: 10 }]}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{title}</Text>
        <Badge label={latest.model_name ?? 'model'} tone="forecast" />
      </View>
      <View style={{ gap: 8 }}>
        <View style={sharedStyles.row}>
          <Text style={{ color: colors.muted }}>Directional hit rate</Text>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{latest.directional_accuracy}%</Text>
        </View>
        <View style={sharedStyles.row}>
          <Text style={{ color: colors.muted }}>Average error (MAE)</Text>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{latest.mae}</Text>
        </View>
        <View style={sharedStyles.row}>
          <Text style={{ color: colors.muted }}>Baseline MAE</Text>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{baselineMae ? baselineMae : 'n/a'}</Text>
        </View>
        <View style={sharedStyles.row}>
          <Text style={{ color: colors.muted }}>Model vs baseline</Text>
          <Text style={{ color: delta == null ? colors.muted : Number(delta) >= 0 ? colors.up : colors.down, fontWeight: '700' }}>
            {delta == null ? 'n/a' : `${Number(delta) >= 0 ? '+' : ''}${delta}%`}
          </Text>
        </View>
        <View style={sharedStyles.row}>
          <Text style={{ color: colors.muted }}>Samples scored</Text>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{latest.samples_used}</Text>
        </View>
      </View>
      <Text style={{ color: colors.muted, marginTop: 12, lineHeight: 20 }}>
        Lower MAE is better. Improvement is measured against the best available baseline.
      </Text>
    </View>
  )
}
