import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { COLORS, SPACE } from '../../constants/theme';
import audioPlayer from '../../services/audioPlayer';
import { getArtworkSource } from '../../utils/artworkHelper';

export const TABS = {
  HOME: 'Home',
  SEARCH: 'Search',
  LIBRARY: 'Your Library',
  CREATE: 'Create',
};

const BottomNavBar = ({ activeTab, onSelectTab, onOpenPlayer, isCreateModalOpen = false }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(230);

  useEffect(() => {
    if (typeof audioPlayer?.getCurrentTrack === 'function') {
      const initialTrack = audioPlayer.getCurrentTrack();
      if (initialTrack) setCurrentTrack(initialTrack);
    }
    if (typeof audioPlayer?.getIsPlaying === 'function') {
      setIsPlaying(audioPlayer.getIsPlaying());
    }

    if (typeof audioPlayer?.addListener !== 'function') return;

    const unsubscribe = audioPlayer.addListener((event, data) => {
      if (event === 'reset' || data?.track === null) {
        setCurrentTrack(null);
        setIsPlaying(false);
        setCurrentTime(0);
        return;
      }
      if (data?.track) setCurrentTrack(data.track);
      if (data?.isPlaying !== undefined) setIsPlaying(!!data.isPlaying);
      if (data?.currentTime !== undefined) setCurrentTime(data.currentTime);
      if (data?.duration !== undefined) setDuration(data.duration);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const tabs = [
    { id: TABS.HOME, label: 'Home', icon: '🏠' },
    { id: TABS.SEARCH, label: 'Search', icon: '🔍' },
    { id: TABS.LIBRARY, label: 'Your Library', icon: '❙❙❚' },
    { id: TABS.CREATE, label: 'Create', icon: isCreateModalOpen ? '✕' : '➕' },
  ];

  const handleTogglePlay = (e) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    if (typeof audioPlayer?.togglePlay === 'function') {
      audioPlayer.togglePlay(currentTrack);
    }
  };

  const handleOpenPlayerModal = () => {
    if (typeof onOpenPlayer === 'function') {
      onOpenPlayer();
    }
  };

  const progressPercentage = Math.min(
    100,
    Math.max(0, ((currentTime || 0) / (duration || 230)) * 100)
  );

  const artworkSource = getArtworkSource(currentTrack?.artwork);

  return (
    <View style={styles.wrapper}>
      {/* Mini Player */}
      {currentTrack && !isCreateModalOpen && (
        <TouchableOpacity
          style={styles.miniPlayerContainer}
          activeOpacity={0.85}
          onPress={handleOpenPlayerModal}
        >
          {artworkSource ? (
            <Image source={artworkSource} style={styles.artwork} />
          ) : (
            <View style={[styles.artwork, styles.placeholderBox]}>
              <Text style={styles.placeholderSymbol}>♪</Text>
            </View>
          )}

          <View style={styles.trackInfo} pointerEvents="none">
            <Text style={styles.trackTitle} numberOfLines={1}>
              {currentTrack.title || 'Unknown Track'}
            </Text>
            <Text style={styles.trackArtist} numberOfLines={1}>
              {currentTrack.artist || 'Unknown Artist'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.playButton}
            onPress={handleTogglePlay}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
          </TouchableOpacity>

          <View style={styles.progressBarBackground} pointerEvents="none">
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPercentage}%` },
              ]}
            />
          </View>
        </TouchableOpacity>
      )}

      {/* Navigation Tab Bar */}
      <View style={styles.container}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isCreateBtn = tab.id === TABS.CREATE;

          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabButton}
              activeOpacity={0.7}
              onPress={() => onSelectTab && onSelectTab(tab.id)}
            >
              {isCreateModalOpen && isCreateBtn ? (
                <View style={styles.closeCircle}>
                  <Text style={styles.closeIcon}>✕</Text>
                </View>
              ) : (
                <>
                  <Text style={[styles.tabIcon, isActive && styles.activeTabIcon]}>
                    {tab.icon}
                  </Text>
                  <Text
                    style={[styles.tabLabel, isActive && styles.activeTabLabel]}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'transparent',
  },
  miniPlayerContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3D382B',
    marginHorizontal: 8,
    marginBottom: 6,
    height: 56,
    borderRadius: 8,
    paddingHorizontal: 10,
    overflow: 'hidden',
    zIndex: 10,
  },
  artwork: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  placeholderBox: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#282828',
  },
  placeholderSymbol: {
    color: '#B3B3B3',
    fontSize: 16,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  trackTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  trackArtist: {
    color: COLORS?.textMuted || '#B3B3B3',
    fontSize: 11,
    marginTop: 2,
  },
  playButton: {
    padding: 8,
    zIndex: 20,
  },
  playIcon: {
    color: '#FFF',
    fontSize: 18,
  },
  progressBarBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#1DB954',
  },
  container: {
    flexDirection: 'row',
    height: 62,
    backgroundColor: '#000000',
    borderTopWidth: 0.5,
    borderTopColor: '#1A1A1A',
    paddingHorizontal: SPACE?.sm || 8,
    paddingBottom: 4,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 3,
    color: '#B3B3B3',
  },
  activeTabIcon: {
    color: '#FFFFFF',
  },
  tabLabel: {
    color: '#B3B3B3',
    fontSize: 10,
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  closeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BottomNavBar;