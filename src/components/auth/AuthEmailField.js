import React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { COLORS, SPACE, RADIUS } from '../../constants/theme';
export default function AuthEmailField({ value, onChangeText, placeholder }) {
  return <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} accessibilityLabel={placeholder} placeholderTextColor={COLORS.textMuted} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" style={styles.input} />;
}
const styles = StyleSheet.create({ input: { backgroundColor: COLORS.inputBackground, color: COLORS.textPrimary, borderRadius: RADIUS.xs, paddingHorizontal: SPACE.md, paddingVertical: SPACE.md, fontSize: 15, marginBottom: SPACE.sm, borderWidth: 1, borderColor: COLORS.border } });
