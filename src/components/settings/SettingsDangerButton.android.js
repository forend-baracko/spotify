import React from 'react';
import { StyleSheet } from 'react-native';
import { Host, Text } from '@expo/ui';
import { OutlinedButton } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, semantics } from '@expo/ui/jetpack-compose/modifiers';

const colors = { contentColor: '#FF8A8A', containerColor: 'transparent' };
export default function SettingsDangerButton({ label, onPress, fullWidth = false, style }) {
  const modifiers = fullWidth ? [fillMaxWidth(), semantics({ contentDescription: label })] : [semantics({ contentDescription: label })];
  return (
    <Host colorScheme="dark" matchContents={fullWidth ? { vertical: true } : true} style={[fullWidth ? styles.full : styles.compact, style]}>
      <OutlinedButton onClick={onPress} colors={colors} modifiers={modifiers}>
        <Text textStyle={styles.label}>{label}</Text>
      </OutlinedButton>
    </Host>
  );
}
const styles = StyleSheet.create({
  compact: { alignSelf: 'flex-start' },
  full: { width: '100%' },
  label: { color: '#FF8A8A', fontSize: 14, fontWeight: '600' },
});
