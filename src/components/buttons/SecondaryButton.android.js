import React from 'react';
import { StyleSheet } from 'react-native';
import { Button, Host } from '@expo/ui';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import { COLORS } from '../../constants/theme';

// One native secondary control; handlers and operation state stay with the caller.
export default function SecondaryButton({ label, onPress, disabled = false, style, accessibilityLabel }) {
  return (
    <Host matchContents colorScheme="dark" seedColor={COLORS.primary} style={[styles.host, style]}>
      <Button
        label={label}
        variant="outlined"
        modifiers={accessibilityLabel ? [semantics({ contentDescription: accessibilityLabel })] : undefined}
        disabled={disabled}
        onPress={disabled ? undefined : onPress}
        style={styles.button}
      />
    </Host>
  );
}

const styles = StyleSheet.create({
  host: { alignSelf: 'center', marginTop: 12 },
  button: { height: 48, paddingHorizontal: 32 },
});
