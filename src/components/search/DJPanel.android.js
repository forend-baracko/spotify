import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Host } from '@expo/ui';
import { Card } from '@expo/ui/jetpack-compose';
import { fillMaxSize } from '@expo/ui/jetpack-compose/modifiers';

export default function DJPanel({ children, style }) {
  return (
    <View style={style}>
      <Host colorScheme="dark" style={StyleSheet.absoluteFill} pointerEvents="none">
        <Card colors={{ containerColor: '#22152D' }} border={{ width: 1, color: '#503366' }} modifiers={[fillMaxSize()]} />
      </Host>
      {children}
    </View>
  );
}
