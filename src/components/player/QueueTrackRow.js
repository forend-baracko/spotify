import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AppIcon from '../icons/AppIcon';

export default function QueueTrackRow({ title, artist, artwork, selected, onPlay, onRemove }) {
  return (
    <View style={[styles.row, selected && styles.selected]}>
      <TouchableOpacity style={styles.info} onPress={onPlay} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`Play ${title} by ${artist}${selected ? ', now playing' : ''}`} accessibilityState={{ selected }}>
        <Image source={artwork} style={styles.artwork} />
        <View style={styles.meta}><Text style={[styles.title, selected && styles.green]} numberOfLines={1}>{title}</Text><Text style={styles.artist} numberOfLines={1}>{artist}</Text></View>
      </TouchableOpacity>
      {onRemove ? <TouchableOpacity onPress={onRemove} style={styles.remove} accessibilityRole="button" accessibilityLabel={`Remove ${title} from queue`}><AppIcon name="close" size={22} color="#B3B3B3" /></TouchableOpacity> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 6 },
  selected: { backgroundColor: 'rgba(29,185,84,0.1)' },
  info: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  artwork: { width: 44, height: 44, borderRadius: 4, backgroundColor: '#282828' },
  meta: { marginLeft: 12, flex: 1 },
  title: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  green: { color: '#1DB954' },
  artist: { color: '#B3B3B3', fontSize: 12, marginTop: 2 },
  remove: { padding: 8 },
});
