import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function DJPanel({ children, style }) {
  return <View style={[styles.surface, style]}>{children}</View>;
}
const styles = StyleSheet.create({ surface: { borderRadius: 14, backgroundColor: '#22152D', borderColor: '#503366', borderWidth: 1 } });
