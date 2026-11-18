import React from 'react';
import { StyleSheet } from 'react-native';
import { Host, Text } from '@expo/ui';
import { Card, Column } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
import { COLORS, SPACE } from '../../constants/theme';

export default function StatsMetricCard({ value, label }) {
  return (
    <Host colorScheme="dark" style={styles.host} matchContents={{ vertical: true }}>
      <Card colors={{ containerColor: COLORS.surface }} modifiers={[fillMaxWidth()]}>
        <Column verticalArrangement={{ spacedBy: SPACE.xs }} modifiers={[fillMaxWidth(), paddingAll(SPACE.md)]}>
          <Text textStyle={styles.value}>{String(value)}</Text>
          <Text textStyle={styles.label}>{label}</Text>
        </Column>
      </Card>
    </Host>
  );
}
const styles = StyleSheet.create({
  host: { width: '100%', minHeight: 75 },
  value: { color: COLORS.primary, fontSize: 24, fontWeight: '700' },
  label: { color: COLORS.textSecondary, fontSize: 13 },
});
