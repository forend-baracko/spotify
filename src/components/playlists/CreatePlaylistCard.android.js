import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Host, Icon, Text } from '@expo/ui';
import { Card, ListItem } from '@expo/ui/jetpack-compose';

const playlistIcon = require('@expo/material-symbols/playlist_add.xml');
const addIcon = require('@expo/material-symbols/add.xml');

export default function CreatePlaylistCard({ title = 'Playlist', desc = 'Build a playlist with songs or episodes', onPress }) {
  return (
    <View style={styles.wrapper}>
      <View importantForAccessibility="no-hide-descendants" collapsable={false}>
        <Host colorScheme="dark" style={styles.host} matchContents={{ vertical: true }} pointerEvents="none">
          <Card colors={{ containerColor: '#242424' }}>
            <ListItem colors={{ containerColor: '#242424', contentColor: '#FFFFFF', supportingContentColor: '#B3B3B3' }}>
              <ListItem.LeadingContent><Icon name={playlistIcon} size={28} color="#FFFFFF" /></ListItem.LeadingContent>
              <ListItem.HeadlineContent><Text numberOfLines={2} textStyle={styles.title}>{title}</Text></ListItem.HeadlineContent>
              <ListItem.SupportingContent><Text numberOfLines={2} textStyle={styles.description}>{desc}</Text></ListItem.SupportingContent>
              <ListItem.TrailingContent><Icon name={addIcon} size={24} color="#FFFFFF" /></ListItem.TrailingContent>
            </ListItem>
          </Card>
        </Host>
      </View>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onPress} accessibilityRole="button" accessibilityLabel="Create playlist" activeOpacity={0.7} />
    </View>
  );
}
const styles = StyleSheet.create({
  wrapper: { marginBottom: 16, minHeight: 80 },
  host: { width: '100%', minHeight: 80 },
  title: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  description: { color: '#B3B3B3', fontSize: 12 },
});
