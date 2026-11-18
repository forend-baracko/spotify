import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Host, Icon, Text as ComposeText } from '@expo/ui';
import { ListItem, RNHostView } from '@expo/ui/jetpack-compose';
import { size } from '@expo/ui/jetpack-compose/modifiers';
import AppIcon from '../icons/AppIcon';

export default function SearchResultRow({ track, artwork, onPlay, onMore }) {
  const availability = track.source === 'audius' ? 'Audius · Full track' : track.isPreview ? 'Preview' : 'Full track';
  const subtitle = `${track.artist} · ${availability}`;
  return (
    <View style={styles.row}>
      <Host colorScheme="dark" style={styles.host} matchContents={{ vertical: true }} pointerEvents="none">
        <ListItem colors={{ containerColor: '#202020', contentColor: '#FFFFFF', supportingContentColor: '#B3B3B3' }}>
          <ListItem.LeadingContent>
            {artwork ? <RNHostView modifiers={[size(44, 44)]}><Image source={artwork} style={styles.artwork} /></RNHostView> : <Icon name={require('@expo/material-symbols/music_note.xml')} size={24} color="#B3B3B3" />}
          </ListItem.LeadingContent>
          <ListItem.HeadlineContent><ComposeText numberOfLines={1} textStyle={styles.title}>{track.title}</ComposeText></ListItem.HeadlineContent>
          <ListItem.SupportingContent><ComposeText numberOfLines={1} textStyle={styles.subtitle}>{subtitle}</ComposeText></ListItem.SupportingContent>
        </ListItem>
      </Host>
      <TouchableOpacity style={styles.playTarget} onPress={onPlay} accessibilityRole="button" accessibilityLabel={`Play ${track.title} by ${track.artist}, ${availability}`} activeOpacity={0.75} />
      <TouchableOpacity style={styles.moreTarget} onPress={onMore} accessibilityRole="button" accessibilityLabel={`More options for ${track.title}`} hitSlop={8}>
        <AppIcon name="more" size={22} color="#B3B3B3" />
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  row: { position: 'relative', minHeight: 64 },
  host: { width: '100%', minHeight: 64, paddingRight: 44 },
  artwork: { width: 44, height: 44, borderRadius: 4, backgroundColor: '#333333' },
  title: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  subtitle: { color: '#B3B3B3', fontSize: 12 },
  playTarget: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 44 },
  moreTarget: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 44, alignItems: 'center', justifyContent: 'center' },
});
