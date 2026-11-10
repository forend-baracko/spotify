import React from 'react';
import { StyleSheet } from 'react-native';
import { Host, Text } from '@expo/ui';
import { Button } from '@expo/ui/jetpack-compose';

const PRIMARY = { containerColor: '#1ED760', contentColor: '#000000', disabledContainerColor: '#344A3B', disabledContentColor: '#A6B6AB' };
const NEUTRAL = { containerColor: '#FFFFFF', contentColor: '#000000', disabledContainerColor: '#333333', disabledContentColor: '#B3B3B3' };
const CONTENT_PADDING = { start: 28, end: 28, top: 14, bottom: 14 };

// Ready-made Material button, themed only for the screenshot-pinned playlist flow.
export default function PlaylistButton({ label, onPress, disabled = false, loading = false, neutral = false }) {
  const blocked = disabled || loading;
  return (
    <Host matchContents colorScheme="dark" seedColor="#1ED760" style={styles.host}>
      <Button
        enabled={!blocked}
        onClick={blocked ? undefined : onPress}
        colors={neutral ? NEUTRAL : PRIMARY}
        contentPadding={CONTENT_PADDING}
      >
        <Text textStyle={styles.label}>{loading ? `${label}…` : label}</Text>
      </Button>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: { alignSelf: 'center' },
  label: { fontSize: 16, fontWeight: '700' },
});
