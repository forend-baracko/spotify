import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SPACE, RADIUS } from '../../constants/theme';
import AppIcon from '../icons/AppIcon';

export default function LibraryPlaylistRow({ playlist, onPress }) {
  const count = playlist.tracks ? playlist.tracks.length : 0;
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => onPress?.(playlist)}>
      <View style={styles.iconBox}><Text style={styles.emoji}>{playlist.icon || '🎶'}</Text></View>
      <View style={styles.info}>
        <Text style={styles.title}>{playlist.title}</Text>
        <Text style={styles.meta}>{playlist.type} • {count} {count === 1 ? 'song' : 'songs'}</Text>
      </View>
      <AppIcon name="forward" size={24} color="#B3B3B3" />
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACE.sm, borderBottomWidth: 0.5, borderBottomColor: '#202020' },
  iconBox: { width: 52, height: 52, borderRadius: RADIUS.xs, backgroundColor: '#262626', justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 24 },
  info: { flex: 1, marginLeft: SPACE.md },
  title: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600' },
  meta: { color: COLORS.textSecondary, fontSize: 12, marginTop: 3 },
});
