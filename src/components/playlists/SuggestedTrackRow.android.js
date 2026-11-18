import React from 'react';
import { Image, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Host, Text } from '@expo/ui';
import { ListItem, RNHostView } from '@expo/ui/jetpack-compose';
import { size } from '@expo/ui/jetpack-compose/modifiers';
import { getArtworkSource } from '../../utils/artworkHelper';
import AppIcon from '../icons/AppIcon';

export default function SuggestedTrackRow({ track, disabled = false, busy = false, onPress }) {
  const { width, fontScale } = useWindowDimensions();
  const compact = width <= 340 && fontScale >= 1.2;
  return (
    <View style={styles.row}>
      <View importantForAccessibility="no-hide-descendants" collapsable={false}>
        <Host colorScheme="dark" style={styles.host} matchContents={{ vertical: true }} pointerEvents="none">
          <ListItem colors={{ containerColor: '#121212', contentColor: '#FFFFFF', supportingContentColor: '#B3B3B3' }}>
            <ListItem.LeadingContent><RNHostView modifiers={[size(48, 48)]}><Image source={getArtworkSource(track.artwork)} style={styles.artwork} /></RNHostView></ListItem.LeadingContent>
            <ListItem.HeadlineContent><Text numberOfLines={2} textStyle={compact ? styles.compactTitle : styles.title}>{track.title}</Text></ListItem.HeadlineContent>
            <ListItem.SupportingContent><Text numberOfLines={2} textStyle={compact ? styles.compactArtist : styles.artist}>{track.artist}</Text></ListItem.SupportingContent>
          </ListItem>
        </Host>
      </View>
      <TouchableOpacity style={styles.addButton} accessibilityRole="button" accessibilityLabel={`Add ${track.title} by ${track.artist || 'Unknown artist'} to this playlist`} accessibilityState={{ disabled, busy }} disabled={disabled} onPress={onPress}>
        <View style={styles.plusCircle}><AppIcon name={busy ? 'more' : 'add'} size={18} color="#D0D0D0" /></View>
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  row: { minHeight: 76, position: 'relative' },
  host: { width: '100%', minHeight: 76, paddingRight: 48 },
  artwork: { width: 48, height: 48, borderRadius: 4, backgroundColor: '#303030' },
  title: { color: '#FFFFFF', fontSize: 16 },
  artist: { color: '#B3B3B3', fontSize: 13 },
  compactTitle: { color: '#FFFFFF', fontSize: 13 },
  compactArtist: { color: '#B3B3B3', fontSize: 10 },
  addButton: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 48, alignItems: 'center', justifyContent: 'center' },
  plusCircle: { width: 24, height: 24, borderWidth: 1.5, borderColor: '#B3B3B3', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
