import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AppIcon from '../icons/AppIcon';

export default function ProfileDrawerItem({ label, icon, onPress }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7} accessibilityRole="button">
      <View style={styles.icon}><AppIcon name={icon} size={24} color="#FFFFFF" /></View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center' },
  icon: { width: 36 },
  label: { flex: 1, color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
});
