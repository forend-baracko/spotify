import React from 'react';
import { Switch } from 'react-native';
import { COLORS } from '../../constants/theme';

export default function PrivateSessionSwitch({ value, onValueChange }) {
  return <Switch value={value} onValueChange={onValueChange} accessibilityLabel="Private session" trackColor={{ false: '#444444', true: COLORS.primary }} thumbColor={COLORS.white} />;
}
