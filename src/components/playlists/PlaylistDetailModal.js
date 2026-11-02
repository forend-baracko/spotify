import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACE, RADIUS } from '../../constants/theme';
import { getArtworkSource } from '../../utils/artworkHelper';
import SwipeableTrackRow from '../player/SwipeableTrackRow';
import audioPlayer from '../../services/audioPlayer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PlaylistDetailModal = ({
  visible,
  playlist,
  onClose,
  onPlayTrack,
  currentTrack,
  onOpenTrackMenu,
  onAddToQueue,
  onAddToPlaylist,
  onToggleFavorite,
  isLiked,
  onDeletePlaylist,
  userProfile,
  onAttachProfile,
}) => {
  const insets = useSafeAreaInsets();

  if (!playlist) return null;

  const tracks = playlist.tracks || [];

  const handlePlayAll = () => {
    if (tracks.length === 0) {
      Alert.alert('Empty Playlist', 'Add some songs first to start playing!');
      return;
    }
    // Queue the full playlist in order, starting from the first track
    audioPlayer.playPlaylist(tracks, 0);
  };

  const handleShuffle = () => {
    if (tracks.length === 0) return;
    const randomIndex = Math.floor(Math.random() * tracks.length);
    // Use shuffle mode so upcoming tracks are shuffled
    audioPlayer.setQueueForTrack(tracks[randomIndex], tracks, true);
    audioPlayer.playTrack(tracks[randomIndex]);
  };

  const handleTrackPress = (track) => {
    // Queue the playlist starting from this track, preserving order
    audioPlayer.setQueueForTrack(track, tracks, false);
    audioPlayer.playTrack(track);
    // Notify parent so the player modal opens
    if (onPlayTrack) onPlayTrack(track);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />

        {/* Top Navigation Bar */}
        <View style={styles.topNav}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.navTitle} numberOfLines={1}>
            {playlist.title}
          </Text>

          {!playlist.isDefault ? (
            <TouchableOpacity
              style={styles.moreHeaderBtn}
              onPress={() => {
                Alert.alert(playlist.title, 'Playlist Options', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete Playlist',
                    style: 'destructive',
                    onPress: () => {
                      if (onDeletePlaylist) {
                        onDeletePlaylist(playlist.id);
                        onClose();
                      }
                    },
                  },
                ]);
              }}
            >
              <Text style={styles.moreHeaderIcon}>•••</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Playlist Info Section */}
          <View style={styles.heroSection}>
            <View style={styles.artworkBox}>
              {playlist.artwork || playlist.cover ? (
                <Image
                  source={getArtworkSource(playlist.artwork || playlist.cover)}
                  style={styles.artworkImage}
                />
              ) : (
                <Text style={styles.heroEmoji}>{playlist.icon || '🎶'}</Text>
              )}
            </View>

            <Text style={styles.playlistName}>{playlist.title}</Text>
            <Text style={styles.playlistDesc}>
              {playlist.description || 'Playlist created by you'}
            </Text>
            <Text style={styles.playlistStats}>
              {playlist.type ? `${playlist.type} • ` : ''}
              {tracks.length} {tracks.length === 1 ? 'song' : 'songs'}
            </Text>

            {/* Creator Profile Row */}
            {(playlist.creator || userProfile) && (
              <View style={styles.creatorRow}>
                {(playlist.creator?.photoURL || userProfile?.photoURL) ? (
                  <Image
                    source={{ uri: playlist.creator?.photoURL || userProfile?.photoURL }}
                    style={styles.creatorAvatar}
                  />
                ) : (
                  <View style={[styles.creatorAvatar, styles.creatorAvatarPlaceholder]}>
                    <Text style={styles.creatorAvatarInitial}>
                      {(playlist.creator?.name || userProfile?.displayName || 'U')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.creatorName}>
                  {playlist.creator?.username
                    ? `@${playlist.creator.username}`
                    : playlist.creator?.name || userProfile?.displayName || 'You'}
                </Text>
              </View>
            )}

            {/* Attach My Profile Button */}
            {userProfile && !playlist.isDefault && (
              <TouchableOpacity
                style={styles.attachProfileBtn}
                activeOpacity={0.8}
                onPress={() => {
                  if (onAttachProfile) onAttachProfile(playlist.id);
                }}
              >
                <Text style={styles.attachProfileIcon}>👤</Text>
                <Text style={styles.attachProfileText}>
                  {playlist.creator?.uid === userProfile?.uid
                    ? 'Update My Profile'
                    : 'Add My Profile to Playlist'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Play & Shuffle Control Buttons */}
            <View style={styles.controlRow}>
              <TouchableOpacity
                style={styles.shuffleBtn}
                activeOpacity={0.8}
                onPress={handleShuffle}
              >
                <Text style={styles.shuffleIcon}>🔀</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.playBigBtn}
                activeOpacity={0.8}
                onPress={handlePlayAll}
              >
                <Text style={styles.playBigIcon}>▶</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tracks Header */}
          <View style={styles.tracksHeader}>
            <Text style={styles.sectionHeading}>Tracks</Text>
            <Text style={styles.trackCounter}>{tracks.length} songs</Text>
          </View>

          {/* Tracks List */}
          {tracks.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>This playlist is empty</Text>
              <Text style={styles.emptySubtitle}>
                Swipe left on any song on the home screen or use the three-dot menu to add songs here!
              </Text>
            </View>
          ) : (
            tracks.map((track, idx) => (
              <SwipeableTrackRow
                key={`pl-track-${track.id}-${idx}`}
                track={track}
                isSelected={currentTrack?.id === track.id}
                onPress={() => handleTrackPress(track)}
                onOpenMenu={() =>
                  onOpenTrackMenu && onOpenTrackMenu(track, playlist.id)
                }
                onAddToQueue={onAddToQueue}
                onAddToPlaylist={onAddToPlaylist}
                onToggleFavorite={onToggleFavorite}
                isLiked={isLiked && isLiked(track.id)}
                isInPlaylist={true}
              />
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE?.md || 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#222',
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    color: COLORS?.textPrimary || '#FFF',
    fontSize: 34,
    fontWeight: '300',
    lineHeight: 36,
  },
  navTitle: {
    color: COLORS?.textPrimary || '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    maxWidth: SCREEN_WIDTH * 0.65,
  },
  moreHeaderBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreHeaderIcon: {
    color: COLORS?.textSecondary || '#B3B3B3',
    fontSize: 18,
  },
  scroll: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: SPACE?.lg || 24,
    paddingHorizontal: SPACE?.lg || 24,
  },
  artworkBox: {
    width: 150,
    height: 150,
    borderRadius: 8,
    backgroundColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: SPACE?.md || 16,
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  heroEmoji: {
    fontSize: 64,
  },
  playlistName: {
    color: COLORS?.textPrimary || '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  playlistDesc: {
    color: COLORS?.textSecondary || '#B3B3B3',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: SPACE?.md || 16,
  },
  playlistStats: {
    color: COLORS?.textMuted || '#777',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: SPACE?.lg || 24,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shuffleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#282828',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACE?.lg || 24,
  },
  shuffleIcon: {
    fontSize: 20,
  },
  playBigBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS?.primary || '#1DB954',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS?.primary || '#1DB954',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  playBigIcon: {
    color: COLORS?.black || '#000',
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 3,
  },
  tracksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACE?.lg || 24,
    paddingVertical: SPACE?.sm || 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#222',
  },
  sectionHeading: {
    color: COLORS?.textPrimary || '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  trackCounter: {
    color: COLORS?.textMuted || '#777',
    fontSize: 12,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: SPACE?.xl || 32,
  },
  emptyTitle: {
    color: COLORS?.textPrimary || '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: COLORS?.textSecondary || '#B3B3B3',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  // Creator profile row styles
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -8,
    marginBottom: 12,
  },
  creatorAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 8,
    backgroundColor: '#333',
  },
  creatorAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1DB954',
  },
  creatorAvatarInitial: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  creatorName: {
    color: COLORS?.textSecondary || '#B3B3B3',
    fontSize: 13,
    fontWeight: '500',
  },
  attachProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2A22',
    borderWidth: 1,
    borderColor: '#1DB954',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  attachProfileIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  attachProfileText: {
    color: '#1DB954',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default PlaylistDetailModal;