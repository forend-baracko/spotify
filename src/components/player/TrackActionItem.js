import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AppIcon from '../icons/AppIcon';

export default function TrackActionItem({ title, icon, destructive, onPress }) {
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      <View style={styles.icon}><AppIcon name={icon} size={24} color={destructive ? '#FF6B6B' : '#FFFFFF'} /></View>
      <Text style={[styles.title, destructive && styles.destructive]}>{title}</Text>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  icon: { width: 36, alignItems: 'center', marginRight: 16 },
  title: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
  destructive: { color: '#FF5252' },
});
