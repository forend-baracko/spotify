import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Image, Modal, ScrollView, StatusBar, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getArtworkSource } from '../../utils/artworkHelper';
import SwipeableTrackRow from '../player/SwipeableTrackRow';
import audioPlayer from '../../services/audioPlayer';
import AppIcon from '../icons/AppIcon';
import PlaylistButton from '../buttons/PlaylistButton';
import SecondaryButton from '../buttons/SecondaryButton';

const PlaylistDetailModal = ({
  visible, playlist, onClose, onPlayTrack, currentTrack,
  onOpenTrackMenu, onAddToQueue, onAddToPlaylist, onToggleFavorite,
  isLiked, onDeletePlaylist, userProfile, onAttachProfile,
  availableTracks = [], onAddSuggestedTrack,
}) => {
  const insets = useSafeAreaInsets();
  const [isPickingSongs, setIsPickingSongs] = useState(false);
  const [pendingAdd, setPendingAdd] = useState(null);
  const [addError, setAddError] = useState('');
  const requestEpoch = useRef(0);
  useEffect(() => {
    requestEpoch.current += 1;
    setIsPickingSongs(false);
    setAddError('');
    setPendingAdd(null);
    return () => { requestEpoch.current += 1; };
  }, [playlist?.id, visible]);

  if (!playlist) return null;
  const tracks = playlist.tracks || [];
  // Default/liked collections retain their existing management behavior.
  const canSuggest = !playlist.isDefault && typeof onAddSuggestedTrack === 'function';
  const suggestions = canSuggest
    ? availableTracks.filter((track) => !tracks.some((added) => added.id === track.id))
    : [];
  const visibleSuggestions = isPickingSongs ? suggestions : suggestions.slice(0, 6);
  const creator = playlist.creator || userProfile;
  const creatorName = playlist.creator?.username
    ? `@${playlist.creator.username}`
    : playlist.creator?.name || userProfile?.displayName || 'You';
  const creatorPhoto = playlist.creator?.photoURL || userProfile?.photoURL;

  const handlePlayAll = () => {
    if (tracks.length === 0) {
      Alert.alert('Empty Playlist', 'Add some songs first to start playing!');
      return;
    }
    audioPlayer.playPlaylist(tracks, 0);
  };
  const handleShuffle = () => {
    if (tracks.length === 0) return;
    const randomIndex = Math.floor(Math.random() * tracks.length);
    audioPlayer.setQueueForTrack(tracks[randomIndex], tracks, true);
    audioPlayer.playTrack(tracks[randomIndex]);
  };
  const handleTrackPress = (track) => {
    audioPlayer.setQueueForTrack(track, tracks, false);
    audioPlayer.playTrack(track);
    if (onPlayTrack) onPlayTrack(track);
  };
  const handlePlaylistOptions = () => {
    Alert.alert(playlist.title, 'Playlist Options', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete Playlist', style: 'destructive', onPress: () => {
        if (onDeletePlaylist) {
          onDeletePlaylist(playlist.id);
          onClose();
        }
      } },
    ]);
  };
  const handleAddSuggestedTrack = async (track) => {
    if (pendingAdd) return;
    const epoch = requestEpoch.current;
    setPendingAdd(track.id);
    setAddError('');
    try {
      const added = await onAddSuggestedTrack(playlist.id, track);
      if (added === false && epoch === requestEpoch.current) setAddError('Could not add song. Try again.');
    } catch {
      if (epoch === requestEpoch.current) setAddError('Could not add song. Try again.');
    } finally {
      if (epoch === requestEpoch.current) setPendingAdd(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View pointerEvents="none" style={styles.heroBackground} />
        <StatusBar barStyle="light-content" backgroundColor="#484848" />
        <View style={styles.topNav}>
          <TouchableOpacity style={styles.backButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close playlist">
            <AppIcon name="back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {!playlist.isDefault && (
            <TouchableOpacity style={styles.iconButton} onPress={handlePlaylistOptions} accessibilityRole="button" accessibilityLabel="Playlist options">
              <AppIcon name="more" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 48 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.heroRow}>
              <View style={styles.artworkBox}>
                {playlist.artwork || playlist.cover ? (
                  <Image source={getArtworkSource(playlist.artwork || playlist.cover)} style={styles.artwork} />
                ) : <Text style={styles.artworkEmoji}>{playlist.icon || '🎶'}</Text>}
              </View>
              <View style={styles.heroDetails}>
                <Text accessibilityRole="header" style={styles.title}>{playlist.title}</Text>
                {creator && (
                  <View style={styles.creatorRow}>
                    {creatorPhoto ? <Image source={{ uri: creatorPhoto }} style={styles.avatar} /> : (
                      <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.avatarInitial}>{creatorName[0].toUpperCase()}</Text></View>
                    )}
                    <Text style={styles.creatorName}>{creatorName}</Text>
                  </View>
                )}
                <Text style={styles.description}>{playlist.description || 'Playlist created by you'}</Text>
                <Text style={styles.stats}>{tracks.length} {tracks.length === 1 ? 'song' : 'songs'}</Text>
              </View>
            </View>
            {userProfile && !playlist.isDefault && (
              <TouchableOpacity
                style={styles.attachProfile} activeOpacity={0.8}
                accessibilityRole="button" accessibilityLabel="Attach my profile to playlist"
                onPress={() => { if (onAttachProfile) onAttachProfile(playlist.id); }}
              >
                <AppIcon name="person" size={20} color="#FFFFFF" />
                <Text style={styles.attachLabel}>{playlist.creator?.uid === userProfile?.uid ? 'Update My Profile' : 'Add My Profile to Playlist'}</Text>
              </TouchableOpacity>
            )}
            {tracks.length > 0 && (
              <View style={styles.controls}>
                <TouchableOpacity style={styles.iconButton} onPress={handleShuffle} accessibilityRole="button" accessibilityLabel="Shuffle playlist">
                  <AppIcon name="shuffle" size={28} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.playButton} onPress={handlePlayAll} accessibilityRole="button" accessibilityLabel="Play playlist">
                  <AppIcon name="play" size={32} color="#000000" />
                </TouchableOpacity>
              </View>
            )}
            {suggestions.length > 0 && !isPickingSongs && (
              <View style={styles.addSongsAction}>
                <PlaylistButton neutral label="+ Add to this playlist" onPress={() => setIsPickingSongs(true)} />
              </View>
            )}
          </View>
          {!isPickingSongs && tracks.length > 0 && (
            <>
              <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Tracks</Text><Text style={styles.source}>{tracks.length} songs</Text></View>
              {tracks.map((track, index) => (
                <SwipeableTrackRow
                  key={`pl-track-${track.id}-${index}`} track={track} isSelected={currentTrack?.id === track.id}
                  onPress={() => handleTrackPress(track)}
                  onOpenMenu={() => onOpenTrackMenu && onOpenTrackMenu(track, playlist.id)}
                  onAddToQueue={onAddToQueue} onAddToPlaylist={onAddToPlaylist}
                  onToggleFavorite={onToggleFavorite} isLiked={isLiked && isLiked(track.id)} isInPlaylist
                />
              ))}
            </>
          )}
          {!isPickingSongs && tracks.length === 0 && suggestions.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>This playlist is empty</Text>
              <Text style={styles.emptyDescription}>Swipe left on any song on the home screen or use the three-dot menu to add songs here!</Text>
            </View>
          )}
          {(suggestions.length > 0 || isPickingSongs) && (
            <View style={styles.suggestions}>
              <View style={styles.suggestionsHeader}>
                <Text accessibilityRole="header" style={styles.suggestionsTitle}>{isPickingSongs ? 'Add songs' : 'Recommended songs'}</Text>
                {isPickingSongs && <SecondaryButton label="Done" onPress={() => setIsPickingSongs(false)} style={styles.doneButton} />}
              </View>
              <Text style={styles.source}>From your music catalog</Text>
              {addError ? <Text accessibilityRole="alert" style={styles.error}>{addError}</Text> : null}
              {visibleSuggestions.map((track) => (
                <View key={`suggestion-${track.id}`} style={styles.suggestionRow}>
                  <Image source={getArtworkSource(track.artwork)} style={styles.suggestionArtwork} />
                  <View style={styles.suggestionInfo}>
                    <Text style={styles.suggestionTitle} numberOfLines={2}>{track.title}</Text>
                    <Text style={styles.suggestionArtist} numberOfLines={1}>{track.artist}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.iconButton} accessibilityRole="button"
                    accessibilityLabel={`Add ${track.title} to this playlist`}
                    accessibilityState={{ disabled: !!pendingAdd, busy: pendingAdd === track.id }}
                    disabled={!!pendingAdd} onPress={pendingAdd ? undefined : () => handleAddSuggestedTrack(track)}
                  >
                    <View style={styles.plusCircle}><AppIcon name={pendingAdd === track.id ? 'more' : 'add'} size={18} color="#D0D0D0" /></View>
                  </TouchableOpacity>
                </View>
              ))}
              {isPickingSongs && suggestions.length === 0 && <Text style={styles.source}>All catalog songs are already in this playlist.</Text>}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  heroBackground: { position: 'absolute', top: 0, left: 0, right: 0, height: 380, backgroundImage: 'linear-gradient(180deg, #484848 0%, #121212 100%)' },
  topNav: { minHeight: 64, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#242424', alignItems: 'center', justifyContent: 'center' },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingTop: 12 },
  hero: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  artworkBox: { width: 110, height: 110, borderRadius: 4, backgroundColor: '#3A3A3A', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  artwork: { width: '100%', height: '100%' },
  artworkEmoji: { fontSize: 48 },
  heroDetails: { flex: 1, minWidth: 0 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '700', marginBottom: 12 },
  creatorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: { width: 24, height: 24, borderRadius: 12, marginRight: 8, backgroundColor: '#333333' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1ED760' },
  avatarInitial: { color: '#000000', fontWeight: '700', fontSize: 12 },
  creatorName: { color: '#FFFFFF', fontSize: 13, flexShrink: 1 },
  description: { color: '#C0C0C0', fontSize: 13, marginBottom: 6 },
  stats: { color: '#B3B3B3', fontSize: 13 },
  attachProfile: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, marginTop: 16 },
  attachLabel: { color: '#D0D0D0', fontSize: 13, flexShrink: 1 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 16, marginTop: 8 },
  playButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1ED760', alignItems: 'center', justifyContent: 'center' },
  addSongsAction: { paddingTop: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8 },
  sectionTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  empty: { padding: 32, alignItems: 'center' },
  emptyTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyDescription: { color: '#B3B3B3', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  suggestions: { paddingHorizontal: 20, paddingTop: 20 },
  suggestionsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  suggestionsTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', flexShrink: 1 },
  source: { color: '#B3B3B3', fontSize: 13, marginTop: 6, marginBottom: 12 },
  doneButton: { marginTop: 0 },
  error: { color: '#FFB4AB', fontSize: 14, marginBottom: 12 },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', minHeight: 76, paddingVertical: 8 },
  suggestionArtwork: { width: 48, height: 48, borderRadius: 4, backgroundColor: '#303030' },
  suggestionInfo: { flex: 1, paddingHorizontal: 12 },
  suggestionTitle: { color: '#FFFFFF', fontSize: 16 },
  suggestionArtist: { color: '#B3B3B3', fontSize: 13, marginTop: 4 },
  plusCircle: { width: 24, height: 24, borderWidth: 1.5, borderColor: '#B3B3B3', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

export default PlaylistDetailModal;
