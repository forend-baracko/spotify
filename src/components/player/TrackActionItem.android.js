import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Host, Icon, Text } from '@expo/ui';
import { ListItem } from '@expo/ui/jetpack-compose';

const icons = {
  favorite: require('@expo/material-symbols/favorite.xml'),
  queue: require('@expo/material-symbols/queue_music.xml'),
  playlistAdd: require('@expo/material-symbols/playlist_add.xml'),
  delete: require('@expo/material-symbols/delete.xml'),
  share: require('@expo/material-symbols/share.xml'),
};
export default function TrackActionItem({ title, icon, destructive, onPress }) {
  const color = destructive ? '#FF6B6B' : '#FFFFFF';
  return (
    <View>
      <View importantForAccessibility="no-hide-descendants" collapsable={false}>
      <Host colorScheme="dark" style={styles.host} matchContents={{ vertical: true }} pointerEvents="none">
        <ListItem colors={{ containerColor: '#1E1E1E', contentColor: color, leadingContentColor: color }}>
          <ListItem.LeadingContent><Icon name={icons[icon]} size={24} color={color} /></ListItem.LeadingContent>
          <ListItem.HeadlineContent><Text textStyle={{ color, fontSize: 15, fontWeight: '500' }}>{title}</Text></ListItem.HeadlineContent>
        </ListItem>
      </Host>
      </View>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onPress} accessibilityRole="button" accessibilityLabel={title} activeOpacity={0.7} />
    </View>
  );
}
const styles = StyleSheet.create({ host: { width: '100%', minHeight: 56 } });
