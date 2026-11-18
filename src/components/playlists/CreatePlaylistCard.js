import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SPACE, RADIUS } from '../../constants/theme';
import AppIcon from '../icons/AppIcon';

export default function CreatePlaylistCard({ title = 'Playlist', desc = 'Build a playlist with songs or episodes', icon = 'playlistAdd', onPress }) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.iconBox}><AppIcon name={icon} size={30} color="#FFFFFF" /></View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.desc}>{desc}</Text>
      </View>
      <AppIcon name="add" size={24} color="#FFFFFF" />
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceElevated, padding: SPACE.md, borderRadius: RADIUS.md, marginBottom: SPACE.md, borderWidth: 1, borderColor: '#2D2D2D' },
  iconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#353535', justifyContent: 'center', alignItems: 'center', marginRight: SPACE.md },
  text: { flex: 1 },
  title: { color: COLORS.textPrimary, fontSize: 16, fontWeight: 'bold' },
  desc: { color: COLORS.textSecondary, fontSize: 12, marginTop: 3 },
});
