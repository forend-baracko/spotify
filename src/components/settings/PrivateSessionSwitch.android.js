import React from 'react';
import { StyleSheet } from 'react-native';
import { Host } from '@expo/ui';
import { Switch } from '@expo/ui/jetpack-compose';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import { COLORS } from '../../constants/theme';

const colors = {
  checkedThumbColor: COLORS.white,
  checkedTrackColor: COLORS.primary,
  checkedBorderColor: COLORS.primary,
  uncheckedThumbColor: COLORS.white,
  uncheckedTrackColor: '#444444',
  uncheckedBorderColor: '#444444',
};
export default function PrivateSessionSwitch({ value, onValueChange }) {
  return (
    <Host colorScheme="dark" style={styles.host}>
      <Switch value={!!value} onCheckedChange={onValueChange} colors={colors} modifiers={[semantics({ contentDescription: 'Private session' })]} />
    </Host>
  );
}
const styles = StyleSheet.create({ host: { width: 60, height: 48 } });
