import React from 'react';
import { Host, Text } from '@expo/ui';
import { FilterChip } from '@expo/ui/jetpack-compose';
import { selectable, semantics } from '@expo/ui/jetpack-compose/modifiers';

const colors = { containerColor: '#30203B', labelColor: '#E5D7EB', selectedContainerColor: '#8E24AA', selectedLabelColor: '#FFFFFF' };

export default function CategoryChip({ category, selected, onPress }) {
  return (
    <Host matchContents colorScheme="dark" seedColor="#8E24AA">
      <FilterChip
        selected={selected}
        onClick={onPress}
        colors={colors}
        modifiers={[
          selectable(selected, onPress, 'tab'),
          semantics({ contentDescription: `Category: ${category}, ${selected ? 'selected' : 'not selected'}` }),
        ]}
      >
        <FilterChip.Label><Text>{selected ? `✓ ${category}` : category}</Text></FilterChip.Label>
      </FilterChip>
    </Host>
  );
}
