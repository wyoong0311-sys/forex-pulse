import { StyleSheet } from 'react-native'
import { colors } from './colors'

export const sharedStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.page,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 26,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  cardSoft: {
    backgroundColor: colors.panelAlt,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
})
