import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { COLORS } from '../../constants/theme';

export default function PrimaryButton({ label, onPress, disabled = false, loading = false, seedColor = COLORS.primary, style }) {
  const blocked = disabled || loading;
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: seedColor }, blocked && styles.disabled, style]}
      disabled={blocked}
      onPress={blocked ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: blocked, busy: loading }}
    >
      <Text style={styles.label}>{loading ? `${label}…` : label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { alignSelf: 'center', backgroundColor: COLORS.primary, borderRadius: 24, paddingVertical: 12, paddingHorizontal: 32 },
  disabled: { opacity: 0.6 },
  label: { color: COLORS.black, fontSize: 15, fontWeight: 'bold', textAlign: 'center' },
});
