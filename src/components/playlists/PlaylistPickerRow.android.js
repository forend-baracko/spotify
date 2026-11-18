import React from 'react';
import { StyleSheet, Text as RNText, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Host, Icon, Text } from '@expo/ui';
import { ListItem, RNHostView } from '@expo/ui/jetpack-compose';
import { size } from '@expo/ui/jetpack-compose/modifiers';

const addIcon = require('@expo/material-symbols/add.xml');

export default function PlaylistPickerRow({ playlist, alreadyAdded, onPress }) {
  const { width, fontScale } = useWindowDimensions();
  const compact = width <= 340 && fontScale >= 1.2;
  const count = playlist.tracks ? playlist.tracks.length : 0;
  const countLabel = `${count} ${count === 1 ? 'song' : 'songs'}`;
  return (
    <View style={styles.row}>
      <View importantForAccessibility="no-hide-descendants" collapsable={false}>
        <Host colorScheme="dark" style={styles.host} matchContents={{ vertical: true }} pointerEvents="none">
          <ListItem colors={{ containerColor: '#1E1E1E', contentColor: '#FFFFFF', supportingContentColor: '#B3B3B3' }}>
            <ListItem.LeadingContent>
              <RNHostView modifiers={[size(44, 44)]}>
                <View style={styles.artwork}><RNText style={styles.emoji}>{playlist.icon || '🎶'}</RNText></View>
              </RNHostView>
            </ListItem.LeadingContent>
            <ListItem.HeadlineContent><Text numberOfLines={2} textStyle={compact ? styles.compactTitle : styles.title}>{playlist.title}</Text></ListItem.HeadlineContent>
            <ListItem.SupportingContent><Text numberOfLines={1} textStyle={compact ? styles.compactDetail : styles.detail}>{countLabel}</Text></ListItem.SupportingContent>
            <ListItem.TrailingContent>
              {alreadyAdded ? <Text textStyle={styles.added}>Added ✓</Text> : <Icon name={addIcon} size={24} color="#B3B3B3" />}
            </ListItem.TrailingContent>
          </ListItem>
        </Host>
      </View>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onPress} accessibilityRole="button" accessibilityLabel={alreadyAdded ? `${playlist.title}, ${countLabel}, already added` : `Add to ${playlist.title}, ${countLabel}`} activeOpacity={0.7} />
    </View>
  );
}
const styles = StyleSheet.create({
  row: { minHeight: 64, borderBottomWidth: 0.5, borderBottomColor: '#282828' },
  host: { width: '100%', minHeight: 64 },
  artwork: { width: 44, height: 44, borderRadius: 4, backgroundColor: '#2C2C2C', alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 22 },
  title: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  detail: { color: '#B3B3B3', fontSize: 12 },
  compactTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  compactDetail: { color: '#B3B3B3', fontSize: 10 },
  added: { color: '#1ED760', fontSize: 11, fontWeight: '600' },
});
