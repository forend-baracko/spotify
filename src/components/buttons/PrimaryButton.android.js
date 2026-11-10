import React from 'react';
import { StyleSheet } from 'react-native';
import { Button, Host } from '@expo/ui';
import { COLORS } from '../../constants/theme';

// Native filled candidate; validation and async work remain with the existing form.
export default function PrimaryButton({ label, onPress, disabled = false, loading = false, seedColor = COLORS.primary, style }) {
  const blocked = disabled || loading;
  return (
    <Host matchContents colorScheme="dark" seedColor={seedColor} style={[styles.host, style]}>
      <Button
        label={loading ? `${label}…` : label}
        variant="filled"
        disabled={blocked}
        onPress={blocked ? undefined : onPress}
        style={styles.button}
      />
    </Host>
  );
}

const styles = StyleSheet.create({
  host: { alignSelf: 'center' },
  button: { height: 48 },
});
