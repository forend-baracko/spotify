import React from 'react';
import { StyleSheet } from 'react-native';
import { Host } from '@expo/ui';
import { ListItem, Text } from '@expo/ui/jetpack-compose';
import { COLORS } from '../../constants/theme';

export default function StatsTrackRow({ rank, track }) {
  return (
    <Host colorScheme="dark" style={styles.host} matchContents={{ vertical: true }}>
      <ListItem colors={{ containerColor: COLORS.surface, contentColor: COLORS.textPrimary, supportingContentColor: COLORS.textSecondary }}>
        <ListItem.LeadingContent><Text color={COLORS.textMuted} style={styles.rank}>{String(rank)}</Text></ListItem.LeadingContent>
        <ListItem.HeadlineContent><Text color={COLORS.textPrimary} maxLines={2} overflow="ellipsis" style={styles.title}>{track.title || ''}</Text></ListItem.HeadlineContent>
        <ListItem.SupportingContent><Text color={COLORS.textSecondary} maxLines={2} overflow="ellipsis" style={styles.artist}>{track.artist || ''}</Text></ListItem.SupportingContent>
      </ListItem>
    </Host>
  );
}
const styles = StyleSheet.create({
  host: { width: '100%', minHeight: 56 },
  rank: { fontSize: 13 },
  title: { fontSize: 14, fontWeight: '600' },
  artist: { fontSize: 12 },
});
