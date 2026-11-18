import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Host, Icon, Text } from '@expo/ui';
import { ListItem } from '@expo/ui/jetpack-compose';


const icons = {
  history: require('@expo/material-symbols/history.xml'),
  stats: require('@expo/material-symbols/bar_chart.xml'),
  settings: require('@expo/material-symbols/settings.xml'),
};

export default function ProfileDrawerItem({ label, icon, onPress }) {
  return (
    <View>
    <Host colorScheme="dark" style={styles.host} matchContents={{ vertical: true }} pointerEvents="none">
      <ListItem
        colors={{ containerColor: '#1C1C1C', contentColor: '#FFFFFF', leadingContentColor: '#FFFFFF' }}
      >
        <ListItem.LeadingContent><Icon name={icons[icon]} size={24} color="#FFFFFF" /></ListItem.LeadingContent>
        <ListItem.HeadlineContent><Text textStyle={styles.label}>{label}</Text></ListItem.HeadlineContent>
      </ListItem>
    </Host>
    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onPress} accessibilityRole="button" accessibilityLabel={label} activeOpacity={0.7} />
    </View>
  );
}

const styles = StyleSheet.create({ host: { width: '100%', minHeight: 56 }, label: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' } });
