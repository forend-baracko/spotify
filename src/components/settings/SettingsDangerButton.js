import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { COLORS, SPACE, RADIUS } from '../../constants/theme';
export default function SettingsDangerButton({ label, onPress, fullWidth = false, style }) {
  return <TouchableOpacity style={[fullWidth ? styles.full : styles.compact, style]} onPress={onPress} accessibilityRole="button"><Text style={styles.label}>{label}</Text></TouchableOpacity>;
}
const styles = StyleSheet.create({
  compact: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#743B3B', borderRadius: RADIUS.circle, paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm },
  full: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.circle },
  label: { color: '#FF8A8A', fontSize: 14, fontWeight: '600' },
});
