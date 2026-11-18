import React from 'react';
import { StyleSheet, Text as RNText, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Host, Icon, Text } from '@expo/ui';
import { ListItem, RNHostView } from '@expo/ui/jetpack-compose';
import { size } from '@expo/ui/jetpack-compose/modifiers';

const forwardIcon = require('@expo/material-symbols/chevron_right.xml');

export default function LibraryPlaylistRow({ playlist, onPress }) {
  const { width, fontScale } = useWindowDimensions();
  const compact = width <= 340 && fontScale >= 1.2;
  const count = playlist.tracks ? playlist.tracks.length : 0;
  const detail = [playlist.type, `${count} ${count === 1 ? 'song' : 'songs'}`].filter(Boolean).join(' • ');
  return (
    <View style={styles.row}>
      <View importantForAccessibility="no-hide-descendants" collapsable={false}>
        <Host colorScheme="dark" style={styles.host} matchContents={{ vertical: true }} pointerEvents="none">
          <ListItem colors={{ containerColor: '#121212', contentColor: '#FFFFFF', supportingContentColor: '#B3B3B3' }}>
            <ListItem.LeadingContent>
              <RNHostView modifiers={[size(52, 52)]}>
                <View style={styles.artwork}><RNText style={styles.emoji}>{playlist.icon || '🎶'}</RNText></View>
              </RNHostView>
            </ListItem.LeadingContent>
            <ListItem.HeadlineContent><Text numberOfLines={2} textStyle={compact ? styles.compactTitle : styles.title}>{playlist.title}</Text></ListItem.HeadlineContent>
            <ListItem.SupportingContent><Text numberOfLines={2} textStyle={compact ? styles.compactDetail : styles.detail}>{detail}</Text></ListItem.SupportingContent>
            <ListItem.TrailingContent><Icon name={forwardIcon} size={24} color="#B3B3B3" /></ListItem.TrailingContent>
          </ListItem>
        </Host>
      </View>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => onPress?.(playlist)} accessibilityRole="button" accessibilityLabel={`Open ${playlist.title}, ${detail}`} activeOpacity={0.7} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 68 },
  host: { width: '100%', minHeight: 68 },
  artwork: { width: 52, height: 52, borderRadius: 4, backgroundColor: '#262626', justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 24 },
  title: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  detail: { color: '#B3B3B3', fontSize: 12 },
  compactTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  compactDetail: { color: '#B3B3B3', fontSize: 10 },
});
