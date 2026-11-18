import React from 'react';
import { StyleSheet } from 'react-native';
import { Host, TextInput, useNativeState } from '@expo/ui';
import { COLORS, SPACE, RADIUS } from '../../constants/theme';
export default function AuthPasswordField({ value, onChangeText, placeholder, secure, autoComplete, standalone = false }) {
  const nativeValue = useNativeState(value);
  return (
    <Host colorScheme="dark" style={standalone ? styles.standaloneHost : styles.host} matchContents={{ vertical: true }}>
      <TextInput value={nativeValue} onChangeText={onChangeText} placeholder={placeholder} accessibilityLabel={placeholder} placeholderTextColor={COLORS.textMuted} secureTextEntry={secure} autoCapitalize="none" autoCorrect={false} autoComplete={autoComplete} textStyle={styles.text} style={standalone ? styles.standaloneInput : styles.input} />
    </Host>
  );
}
const styles = StyleSheet.create({
  host: { flex: 1, minHeight: 52 },
  standaloneHost: { width: '100%', minHeight: 52, marginBottom: SPACE.sm },
  text: { color: COLORS.textPrimary, fontSize: 15 },
  input: { width: '100%', paddingHorizontal: SPACE.md, paddingVertical: SPACE.md },
  standaloneInput: { width: '100%', backgroundColor: COLORS.inputBackground, borderRadius: RADIUS.xs, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACE.md, paddingVertical: SPACE.md },
});
