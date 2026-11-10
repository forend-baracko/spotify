import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

export default function SecondaryButton({ label, onPress, disabled = false, style, accessibilityLabel }) {
  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled }}
    >
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { paddingVertical: 16, borderRadius: 24, backgroundColor: '#333333', marginTop: 12 },
  label: { color: '#FFFFFF', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
});
