import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AppIcon from '../icons/AppIcon';

export default function SearchResultRow({ track, artwork, onPlay, onMore }) {
  const availability = track.source === 'audius' ? 'Audius · Full track' : track.isPreview ? 'Preview' : 'Full track';
  const subtitle = `${track.artist} · ${availability}`;
  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.main} onPress={onPlay} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={`Play ${track.title} by ${track.artist}, ${availability}`}>
        {artwork ? <Image source={artwork} style={styles.artwork} /> : <View style={[styles.artwork, styles.placeholder]}><Text style={styles.symbol}>♪</Text></View>}
        <View style={styles.meta}><Text style={styles.title} numberOfLines={1}>{track.title}</Text><Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text></View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.more} onPress={onMore} accessibilityRole="button" accessibilityLabel={`More options for ${track.title}`} hitSlop={8}>
        <AppIcon name="more" size={22} color="#B3B3B3" />
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  main: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center' },
  artwork: { width: 44, height: 44, borderRadius: 4, backgroundColor: '#333333' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  symbol: { color: '#B3B3B3', fontSize: 20 },
  meta: { flex: 1, marginLeft: 12 },
  title: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  subtitle: { color: '#B3B3B3', fontSize: 12, marginTop: 3 },
  more: { minWidth: 40, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
