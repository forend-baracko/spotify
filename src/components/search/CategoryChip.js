import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

export default function CategoryChip({ category, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.selected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Category: ${category}`}
      accessibilityState={{ selected }}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>{category}</Text>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  chip: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: '#68477A', backgroundColor: '#30203B' },
  selected: { borderColor: '#D5A5E8', backgroundColor: '#8E24AA' },
  label: { color: '#E5D7EB', fontSize: 12, fontWeight: '600' },
  selectedLabel: { color: '#FFFFFF' },
});
