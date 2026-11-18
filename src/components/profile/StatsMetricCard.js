import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACE, RADIUS } from '../../constants/theme';

export default function StatsMetricCard({ value, label }) {
  return <View style={styles.card}><Text style={styles.value}>{value}</Text><Text style={styles.label}>{label}</Text></View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderColor: COLORS.divider, borderWidth: 1, borderRadius: RADIUS.md, padding: SPACE.md },
  value: { color: COLORS.primary, fontSize: 24, fontWeight: '700' },
  label: { color: COLORS.textSecondary, fontSize: 13, marginTop: SPACE.xs },
});
