import React from 'react';
import { StyleSheet } from 'react-native';
import { Host, OutlinedButton, Text, CircularProgressIndicator } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, semantics, size } from '@expo/ui/jetpack-compose/modifiers';

export default function GoogleAuthButton({ onPress, disabled = false, loading = false }) {
  const blocked = disabled || loading;
  return (
    <Host colorScheme="dark" matchContents={{ vertical: true }} style={styles.host}>
      <OutlinedButton
        enabled={!blocked}
        onClick={blocked ? undefined : onPress}
        colors={{ contentColor: '#FFFFFF', containerColor: 'transparent' }}
        modifiers={[fillMaxWidth(), semantics({ contentDescription: loading ? 'Continuing with Google' : 'Continue with Google' })]}
      >
        {loading ? <CircularProgressIndicator color="#FFFFFF" strokeWidth={2} modifiers={[size(20)]} /> : <Text color="#FFFFFF" style={styles.text}>Continue with Google</Text>}
      </OutlinedButton>
    </Host>
  );
}
const styles = StyleSheet.create({ host: { width: '100%', minHeight: 48 }, text: { fontSize: 15, fontWeight: '600' } });
