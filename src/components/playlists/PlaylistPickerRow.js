import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SPACE, RADIUS } from '../../constants/theme';

export default function PlaylistPickerRow({ playlist, alreadyAdded, onPress }) {
  const count = playlist.tracks ? playlist.tracks.length : 0;
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.iconBox}><Text style={styles.emoji}>{playlist.icon || '🎶'}</Text></View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{playlist.title}</Text>
        <Text style={styles.meta}>{count} {count === 1 ? 'song' : 'songs'}</Text>
      </View>
      {alreadyAdded ? <View style={styles.badge}><Text style={styles.badgeText}>Added ✓</Text></View> : <Text style={styles.plus}>+</Text>}
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#282828' },
  iconBox: { width: 44, height: 44, borderRadius: 4, backgroundColor: '#2C2C2C', justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 20 },
  info: { flex: 1, marginLeft: SPACE.md },
  title: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '500' },
  meta: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  badge: { backgroundColor: '#1E382B', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  badgeText: { color: COLORS.primary, fontSize: 11, fontWeight: '600' },
  plus: { color: COLORS.textSecondary, fontSize: 22, paddingHorizontal: 8 },
});
