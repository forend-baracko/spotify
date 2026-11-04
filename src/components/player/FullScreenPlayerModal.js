import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import audioPlayer, { REPEAT_MODE } from '../../services/audioPlayer';
import { useMusic } from '../../context/MusicContext';
import QueueModal from './QueueModal';

const { width } = Dimensions.get('window');

export default function FullScreenPlayerModal({
  visible,
  track: propTrack,
  isPlaying: propIsPlaying,
  onClose,
}) {
  const musicContext = useMusic() || {};
  const { toggleLikeTrack, isLiked } = musicContext;

  // 1. ALL HOOKS MUST BE DECLARED FIRST
  const [track, setTrack] = useState(() => propTrack || audioPlayer?.getCurrentTrack?.());
  const [isPlaying, setIsPlaying] = useState(propIsPlaying);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(230);
  const [isShuffle, setIsShuffle] = useState(audioPlayer.getIsShuffle());
  const [repeatMode, setRepeatMode] = useState(audioPlayer.getRepeatMode());
  const [isQueueModalVisible, setIsQueueModalVisible] = useState(false);

  // Sync state whenever modal opens or props change
  useEffect(() => {
    if (visible) {
      const active = audioPlayer?.getCurrentTrack?.() || propTrack;
      if (active) setTrack(active);
      setIsPlaying(audioPlayer?.getIsPlaying?.() ?? propIsPlaying);
      setIsShuffle(audioPlayer.getIsShuffle());
      setRepeatMode(audioPlayer.getRepeatMode());
    }
  }, [visible, propTrack, propIsPlaying]);

  // Audio player event listener
  useEffect(() => {
    if (typeof audioPlayer?.getCurrentTrack === 'function') {
      const cur = audioPlayer.getCurrentTrack();
      if (cur) setTrack(cur);
    }
    if (typeof audioPlayer?.getIsPlaying === 'function') {
      setIsPlaying(audioPlayer.getIsPlaying());
    }

    if (typeof audioPlayer?.addListener !== 'function') return;

    const unsubscribe = audioPlayer.addListener((event, data) => {
      if (event === 'reset' || data?.track === null) {
        setTrack(null);
        setIsPlaying(false);
        setCurrentTime(0);
        setIsShuffle(false);
        setRepeatMode(REPEAT_MODE.OFF);
        return;
      }

      if (event === 'mode') {
        if (data?.isShuffle !== undefined) setIsShuffle(data.isShuffle);
        if (data?.repeatMode !== undefined) setRepeatMode(data.repeatMode);
        return;
      }

      if (data?.track) setTrack(data.track);
      if (data?.isPlaying !== undefined) setIsPlaying(!!data.isPlaying);
      if (data?.currentTime !== undefined) setCurrentTime(data.currentTime);
      if (data?.duration !== undefined) setDuration(data.duration);
      if (data?.isShuffle !== undefined) setIsShuffle(data.isShuffle);
      if (data?.repeatMode !== undefined) setRepeatMode(data.repeatMode);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [visible]);

  // 2. COMPUTED VARIABLES & GUARDS AFTER ALL HOOKS
  const currentActiveTrack = track || propTrack || audioPlayer?.getCurrentTrack?.();

  // Safe early return ONLY after hooks have run
  if (!visible && !currentActiveTrack) {
    return null;
  }

  const liked =
    typeof isLiked === 'function' && currentActiveTrack?.id
      ? isLiked(currentActiveTrack.id)
      : false;

  const formatTime = (secs) => {
    const minutes = Math.floor(secs / 60) || 0;
    const remainingSeconds = Math.floor(secs % 60) || 0;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const handleToggleShuffle = () => {
    if (typeof audioPlayer?.toggleShuffle === 'function') {
      const nextState = audioPlayer.toggleShuffle();
      setIsShuffle(nextState);
    }
  };

  const handleToggleRepeat = () => {
    if (typeof audioPlayer?.toggleRepeat === 'function') {
      const nextState = audioPlayer.toggleRepeat();
      setRepeatMode(nextState);
    }
  };

  const handleSeek = (event) => {
    const touchX = event.nativeEvent.locationX;
    const barWidth = width - 40;
    const percentage = Math.max(0, Math.min(1, touchX / barWidth));
    const targetSeconds = Math.floor(percentage * (duration || 230));

    if (typeof audioPlayer?.seekTo === 'function') {
      audioPlayer.seekTo(targetSeconds);
    }
  };

  const renderRepeatIcon = () => {
    if (repeatMode === REPEAT_MODE.ONE) return '🔂';
    return '🔁';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>∨</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubTitle}>PLAYING FROM PLAYLIST</Text>
            <Text style={styles.headerMainTitle} numberOfLines={1}>
              {currentActiveTrack?.album || 'Recommended Tracks'}
            </Text>
          </View>
          <TouchableOpacity style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>⋮</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Main Artwork */}
          <View style={styles.artworkContainer}>
            <Image
              source={{
                uri:
                  currentActiveTrack?.artwork ||
                  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80',
              }}
              style={styles.artwork}
            />
          </View>

          {/* Title, Artist & Like Button */}
          <View style={styles.detailsRow}>
            <View style={styles.detailsTextContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {currentActiveTrack?.title || 'Unknown Title'}
              </Text>
              <Text style={styles.artist} numberOfLines={1}>
                {currentActiveTrack?.artist || 'Unknown Artist'}
              </Text>
              {currentActiveTrack?.source === 'audius' ? (
                <Text style={styles.sourceCredit}>
                  Audius · Full track ·{' '}
                  <Text
                    style={styles.sourceCreditLink}
                    onPress={() =>
                      Linking.openURL(currentActiveTrack.source_url).catch((error) =>
                        console.warn('Could not open Audius source:', error)
                      )
                    }
                    accessibilityRole="link"
                  >
                    View on Audius
                  </Text>
                </Text>
              ) : currentActiveTrack?.source === 'archive' ? (
                <Text style={styles.sourceCredit}>
                  Internet Archive · {currentActiveTrack.licenseName || 'Open license'} ·{' '}
                  <Text
                    style={styles.sourceCreditLink}
                    onPress={() =>
                      Linking.openURL(currentActiveTrack.source_url).catch((error) =>
                        console.warn('Could not open Internet Archive source:', error)
                      )
                    }
                    accessibilityRole="link"
                  >
                    Source
                  </Text>
                  {' · '}
                  <Text
                    style={styles.sourceCreditLink}
                    onPress={() =>
                      Linking.openURL(currentActiveTrack.license).catch((error) =>
                        console.warn('Could not open track license:', error)
                      )
                    }
                    accessibilityRole="link"
                  >
                    License
                  </Text>
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() =>
                typeof toggleLikeTrack === 'function' &&
                currentActiveTrack &&
                toggleLikeTrack(currentActiveTrack)
              }
              style={styles.likeBtn}
            >
              <Text style={{ fontSize: 24, color: liked ? '#1DB954' : '#B3B3B3' }}>
                {liked ? '💚' : '♡'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Clickable Seek Bar */}
          <View style={styles.progressContainer}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={handleSeek}
              style={styles.touchableBarArea}
              hitSlop={{ top: 12, bottom: 12 }}
            >
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(
                        100,
                        (currentTime / (duration || 1)) * 100
                      )}%`,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.progressKnob,
                    {
                      left: `${Math.min(
                        98,
                        (currentTime / (duration || 1)) * 100
                      )}%`,
                    },
                  ]}
                />
              </View>
            </TouchableOpacity>

            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>

          {/* Playback Controls */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              onPress={handleToggleShuffle}
              style={styles.smallControlBtn}
              accessibilityRole="button"
              accessibilityLabel={isShuffle ? 'Turn shuffle off' : 'Turn shuffle on'}
            >
              <Text style={[styles.smallControlIcon, isShuffle && styles.activeGreen]}>
                🔀
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => audioPlayer.playPrevious()}
              style={styles.mainControlBtn}
            >
              <Text style={styles.mainControlIcon}>⏮</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => currentActiveTrack && audioPlayer.togglePlay(currentActiveTrack)}
              style={styles.playPauseBtn}
            >
              <Text style={styles.playPauseIcon}>{isPlaying ? '⏸' : '▶'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => audioPlayer.playNext()}
              style={styles.mainControlBtn}
            >
              <Text style={styles.mainControlIcon}>⏭</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleToggleRepeat}
              style={styles.smallControlBtn}
              accessibilityRole="button"
              accessibilityLabel={
                repeatMode === REPEAT_MODE.ONE
                  ? 'Repeat current song'
                  : repeatMode === REPEAT_MODE.ALL
                    ? 'Repeat all songs'
                    : 'Repeat off'
              }
            >
              <Text
                style={[
                  styles.smallControlIcon,
                  repeatMode !== REPEAT_MODE.OFF && styles.activeGreen,
                ]}
              >
                {renderRepeatIcon()}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Utility Row */}
          <View style={styles.bottomUtilityRow}>
            <TouchableOpacity style={styles.utilityBtn}>
              <Text style={styles.utilityIcon}>🎧</Text>
            </TouchableOpacity>
            
            {/* Clean Queue Icon Button */}
            <TouchableOpacity
              style={styles.utilityBtn}
              onPress={() => setIsQueueModalVisible(true)}
            >
              <Text style={[styles.utilityIcon, { fontSize: 22, fontWeight: 'bold' }]}>≡</Text>
            </TouchableOpacity>
          </View>

          {/* About Artist Card */}
          <View style={[styles.cardContainer, { marginBottom: 30 }]}>
            <Text style={styles.cardTitle}>About the artist</Text>
            <View style={styles.artistCardHeader}>
              <Image
                source={{
                  uri:
                    currentActiveTrack?.artwork ||
                    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80',
                }}
                style={styles.artistCardAvatar}
              />
              <View style={styles.artistCardInfo}>
                <Text style={styles.artistCardName}>
                  {currentActiveTrack?.artist || 'Unknown Artist'}
                </Text>
                <Text style={styles.artistCardListeners}>
                  2,841,920 monthly listeners
                </Text>
              </View>
            </View>
            <Text style={styles.artistCardBio} numberOfLines={4}>
              {typeof currentActiveTrack?.artistBio === 'string'
                ? currentActiveTrack.artistBio
                : `${currentActiveTrack?.artist || 'This artist'} is an acclaimed singer-songwriter known for blending emotive storytelling with rich indie-pop production.`}
            </Text>
          </View>
        </ScrollView>

        {/* Queue Slide-up Overlay */}
        <QueueModal
          visible={isQueueModalVisible}
          onClose={() => setIsQueueModalVisible(false)}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerBtn: {
    padding: 6,
  },
  headerBtnText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerSubTitle: {
    color: '#B3B3B3',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerMainTitle: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  artworkContainer: {
    alignItems: 'center',
    marginVertical: 14,
  },
  artwork: {
    width: width - 72,
    height: width - 72,
    borderRadius: 8,
    backgroundColor: '#282828',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  detailsTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  artist: {
    color: '#B3B3B3',
    fontSize: 15,
    marginTop: 4,
  },
  sourceCredit: {
    color: '#9A9A9A',
    fontSize: 11,
    marginTop: 5,
  },
  sourceCreditLink: {
    color: '#B3B3B3',
    textDecorationLine: 'underline',
  },
  likeBtn: {
    padding: 6,
  },
  progressContainer: {
    marginTop: 20,
  },
  touchableBarArea: {
    paddingVertical: 8,
    justifyContent: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#404040',
    borderRadius: 2,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 2,
  },
  progressKnob: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFF',
    marginLeft: -6,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    color: '#B3B3B3',
    fontSize: 11,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  smallControlBtn: {
    padding: 8,
  },
  smallControlIcon: {
    fontSize: 20,
    color: '#B3B3B3',
  },
  activeGreen: {
    color: '#1DB954',
  },
  mainControlBtn: {
    padding: 8,
  },
  mainControlIcon: {
    color: '#FFF',
    fontSize: 28,
  },
  playPauseBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseIcon: {
    color: '#000',
    fontSize: 22,
  },
  bottomUtilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  utilityBtn: {
    padding: 6,
  },
  utilityIcon: {
    color: '#B3B3B3',
    fontSize: 18,
  },
  cardContainer: {
    backgroundColor: '#242424',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  cardTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  artistCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  artistCardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
  },
  artistCardInfo: {
    marginLeft: 12,
    flex: 1,
  },
  artistCardName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  artistCardListeners: {
    color: '#B3B3B3',
    fontSize: 12,
    marginTop: 2,
  },
  artistCardBio: {
    color: '#B3B3B3',
    fontSize: 13,
    lineHeight: 18,
  },
});