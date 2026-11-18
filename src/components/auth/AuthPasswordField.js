import React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { COLORS, SPACE } from '../../constants/theme';
export default function AuthPasswordField({ value, onChangeText, placeholder, secure, standalone = false }) {
  return <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} accessibilityLabel={placeholder} placeholderTextColor={COLORS.textMuted} secureTextEntry={secure} autoCapitalize="none" style={standalone ? styles.standalone : styles.input} />;
}
const styles = StyleSheet.create({ input: { flex: 1, color: COLORS.textPrimary, paddingHorizontal: SPACE.md, paddingVertical: SPACE.md, fontSize: 15 }, standalone: { color: COLORS.textPrimary, backgroundColor: COLORS.inputBackground, borderColor: COLORS.border, borderWidth: 1, borderRadius: 4, paddingHorizontal: SPACE.md, paddingVertical: SPACE.md, marginBottom: SPACE.sm, fontSize: 15 } });
