import React from 'react';
import { StyleSheet } from 'react-native';
import { Host, Text } from '@expo/ui';
import { OutlinedButton } from '@expo/ui/jetpack-compose';
import { selectable, semantics } from '@expo/ui/jetpack-compose/modifiers';

const selectedColors = { containerColor: '#65D66E', contentColor: '#101010' };
const unselectedColors = { containerColor: '#121212', contentColor: '#FFFFFF' };

export default function HomeFilterChip({ label, accessibilityLabel, selected, onPress }) {
  return (
    <Host matchContents colorScheme="dark" seedColor="#1ED760" style={styles.host}>
      <OutlinedButton
        onClick={onPress}
        colors={selected ? selectedColors : unselectedColors}
        modifiers={[
          selectable(selected, onPress, 'tab'),
          semantics({ contentDescription: `${accessibilityLabel}, ${selected ? 'selected' : 'not selected'}` }),
        ]}
      >
        <Text>{label}</Text>
      </OutlinedButton>
    </Host>
  );
}

const styles = StyleSheet.create({ host: { marginRight: 8 } });
