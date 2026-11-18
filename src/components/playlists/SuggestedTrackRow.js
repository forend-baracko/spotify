import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getArtworkSource } from '../../utils/artworkHelper';
import AppIcon from '../icons/AppIcon';

export default function SuggestedTrackRow({ track, disabled = false, busy = false, onPress }) {
  return (
    <View style={styles.row}>
      <Image source={getArtworkSource(track.artwork)} style={styles.artwork} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{track.title}</Text>
        <Text style={styles.artist} numberOfLines={1}>{track.artist}</Text>
      </View>
      <TouchableOpacity style={styles.button} accessibilityRole="button" accessibilityLabel={`Add ${track.title} to this playlist`} accessibilityState={{ disabled, busy }} disabled={disabled} onPress={onPress}>
        <View style={styles.circle}><AppIcon name={busy ? 'more' : 'add'} size={18} color="#D0D0D0" /></View>
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 76, paddingVertical: 8 },
  artwork: { width: 48, height: 48, borderRadius: 4, backgroundColor: '#303030' },
  info: { flex: 1, paddingHorizontal: 12 },
  title: { color: '#FFFFFF', fontSize: 16 },
  artist: { color: '#B3B3B3', fontSize: 13, marginTop: 4 },
  button: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  circle: { width: 24, height: 24, borderWidth: 1.5, borderColor: '#B3B3B3', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
