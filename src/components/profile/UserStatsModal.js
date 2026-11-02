import React, { useMemo } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACE, RADIUS } from '../../constants/theme';

const FOUR_WEEKS_MS = 28 * 24 * 60 * 60 * 1000;

const durationInSeconds = (duration) => {
  if (typeof duration === 'number' && Number.isFinite(duration)) return duration;
  if (typeof duration !== 'string') return 0;
  const parts = duration.split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return 0;
  return parts.length === 2 ? parts[0] * 60 + parts[1] : 0;
};

const UserStatsModal = ({ visible, onClose, userProfile, user, recentTracks = [] }) => {
  const insets = useSafeAreaInsets();
  const displayName =
    userProfile?.displayName ||
    user?.displayName ||
    (user?.email ? user.email.split('@')[0] : 'Music fan');

  const stats = useMemo(() => {
    const cutoff = Date.now() - FOUR_WEEKS_MS;
    const lastFourWeeks = recentTracks.filter(
      (track) => Number.isFinite(track.playedAt) && track.playedAt >= cutoff
    );
    const artistCounts = new Map();
    recentTracks.forEach((track) => {
      const artist = track.artist?.trim();
      if (artist) artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
    });
    const topArtist = [...artistCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const estimatedMinutes = recentTracks.reduce(
      (total, track) => total + durationInSeconds(track.duration),
      0
    ) / 60;

    return {
      lastFourWeeks,
      uniqueArtists: artistCounts.size,
      topArtist: topArtist?.[0] || null,
      estimatedMinutes: Math.round(estimatedMinutes),
    };
  }, [recentTracks]);

  const handleShare = async () => {
    try {
      await Share.share({
        title: 'My listening stats',
        message: `My Spotibai listening stats: ${recentTracks.length} saved recently played tracks, ${stats.uniqueArtists} artists, and ${stats.estimatedMinutes} estimated minutes listened.`,
      });
    } catch (error) {
      console.warn('Could not share listening stats:', error);
      Alert.alert('Could not share stats', 'Please try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close listening stats"
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Listening stats</Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel="Share listening stats"
          >
            <Text style={styles.shareIcon}>↗</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.greeting}>{displayName}’s listening</Text>
          <Text style={styles.caption}>
            Based on your saved listening history. History is limited to your 30 most recently played tracks.
          </Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.lastFourWeeks.length}</Text>
              <Text style={styles.statLabel}>Tracks in the last 4 weeks</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.uniqueArtists}</Text>
              <Text style={styles.statLabel}>Artists in saved history</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {stats.estimatedMinutes ? `${stats.estimatedMinutes}m` : '—'}
              </Text>
              <Text style={styles.statLabel}>Estimated track duration</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top artist in saved history</Text>
            <Text style={styles.topArtist}>{stats.topArtist || 'Not enough listening history yet'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recently played</Text>
            {recentTracks.length ? recentTracks.slice(0, 10).map((track, index) => (
              <View key={`${track.id}-${index}`} style={styles.trackRow}>
                <Text style={styles.rank}>{index + 1}</Text>
                <View style={styles.trackInfo}>
                  <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
                  <Text style={styles.trackArtist} numberOfLines={1}>{track.artist}</Text>
                </View>
              </View>
            )) : (
              <Text style={styles.emptyState}>
                Play some music and your real listening history will appear here.
              </Text>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerButton: {
    width: 40,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    color: COLORS.textPrimary,
    fontSize: 34,
    fontWeight: '300',
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  shareIcon: {
    color: COLORS.primary,
    fontSize: 23,
  },
  content: {
    padding: SPACE.md,
    paddingBottom: SPACE.xxl,
  },
  greeting: {
    color: COLORS.textPrimary,
    fontSize: 23,
    fontWeight: '700',
    marginTop: SPACE.md,
  },
  caption: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: SPACE.xs,
    marginBottom: SPACE.md,
  },
  statsGrid: {
    gap: SPACE.sm,
  },
  statCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.divider,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACE.md,
  },
  statNumber: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: SPACE.xs,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.divider,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACE.md,
    marginTop: SPACE.md,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACE.sm,
  },
  topArtist: {
    color: COLORS.primary,
    fontSize: 16,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.divider,
  },
  rank: {
    width: 28,
    color: COLORS.textMuted,
    fontSize: 13,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  trackArtist: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  emptyState: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default UserStatsModal;
