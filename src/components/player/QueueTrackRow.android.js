import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Host, Text } from '@expo/ui';
import { ListItem, RNHostView } from '@expo/ui/jetpack-compose';
import { size } from '@expo/ui/jetpack-compose/modifiers';
import AppIcon from '../icons/AppIcon';

export default function QueueTrackRow({ title, artist, artwork, selected, onPlay, onRemove }) {
  return (
    <View style={styles.row}>
      <View importantForAccessibility="no-hide-descendants" collapsable={false}>
      <Host colorScheme="dark" style={[styles.host, onRemove && styles.withRemove]} matchContents={{ vertical: true }} pointerEvents="none">
        <ListItem colors={{ containerColor: selected ? '#173222' : '#121212', contentColor: selected ? '#1DB954' : '#FFFFFF', supportingContentColor: '#B3B3B3' }}>
          <ListItem.LeadingContent><RNHostView modifiers={[size(44, 44)]}><Image source={artwork} style={styles.artwork} /></RNHostView></ListItem.LeadingContent>
          <ListItem.HeadlineContent><Text numberOfLines={1} textStyle={{ color: selected ? '#1DB954' : '#FFFFFF', fontSize: 14, fontWeight: '600' }}>{title}</Text></ListItem.HeadlineContent>
          <ListItem.SupportingContent><Text numberOfLines={1} textStyle={styles.artist}>{artist}</Text></ListItem.SupportingContent>
        </ListItem>
      </Host>
      </View>
      <TouchableOpacity style={[styles.play, onRemove && styles.playWithRemove]} onPress={onPlay} accessibilityRole="button" accessibilityLabel={`Play ${title} by ${artist}${selected ? ', now playing' : ''}`} accessibilityState={{ selected }} />
      {onRemove ? <TouchableOpacity style={styles.remove} onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Remove ${title} from queue`}><AppIcon name="close" size={22} color="#B3B3B3" /></TouchableOpacity> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  row: { minHeight: 64, position: 'relative' },
  host: { width: '100%', minHeight: 64 },
  withRemove: { paddingRight: 44 },
  artwork: { width: 44, height: 44, borderRadius: 4, backgroundColor: '#282828' },
  artist: { color: '#B3B3B3', fontSize: 12 },
  play: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  playWithRemove: { right: 44 },
  remove: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 44, alignItems: 'center', justifyContent: 'center' },
});
