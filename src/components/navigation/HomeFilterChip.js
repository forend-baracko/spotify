import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

export default function HomeFilterChip({ label, accessibilityLabel, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.active]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.65}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={[styles.label, selected && styles.activeLabel]}>{label}</Text>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  chip: { minHeight: 36, minWidth: 48, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: '#6A6A6A', backgroundColor: '#282828', marginRight: 8 },
  active: { borderColor: '#1ED760', backgroundColor: '#1ED760' },
  label: { color: '#FFFFFF', fontSize: 13 },
  activeLabel: { color: '#101010', fontWeight: '600' },
});
