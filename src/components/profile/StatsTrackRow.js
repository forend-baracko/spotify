import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../constants/theme';

export default function StatsTrackRow({ rank, track }) {
  return <View style={styles.row}><Text style={styles.rank}>{rank}</Text><View style={styles.info}><Text style={styles.title} numberOfLines={1}>{track.title}</Text><Text style={styles.artist} numberOfLines={1}>{track.artist}</Text></View></View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 50, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.divider },
  rank: { width: 28, color: COLORS.textMuted, fontSize: 13 },
  info: { flex: 1 },
  title: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  artist: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
});
