import React from 'react';
import { StyleSheet } from 'react-native';
import { Button, Host } from '@expo/ui';
import { COLORS } from '../../constants/theme';

// Native filled candidate; validation and async work remain with the existing form.
export default function PrimaryButton({ label, onPress, disabled = false, loading = false, seedColor = COLORS.primary, fullWidth = false, style }) {
  const blocked = disabled || loading;
  return (
    <Host matchContents={fullWidth ? { vertical: true } : true} colorScheme="dark" seedColor={seedColor} style={[styles.host, fullWidth && styles.fullWidth, style]}>
      <Button
        label={loading ? `${label}…` : label}
        variant="filled"
        disabled={blocked}
        onPress={blocked ? undefined : onPress}
        style={fullWidth ? styles.fullWidthButton : styles.button}
      />
    </Host>
  );
}

const styles = StyleSheet.create({
  host: { alignSelf: 'center' },
  button: { height: 48 },
  fullWidth: { width: '100%', alignSelf: 'stretch' },
  fullWidthButton: { width: '100%', height: 48 },
});
