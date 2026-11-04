import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import audioPlayer from '../../services/audioPlayer';

export default function MiniPlayer({ onPress }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const active = audioPlayer?.getCurrentTrack();
    const playing = audioPlayer?.getIsPlaying();
    if (active) {
      setCurrentTrack(active);
      setIsPlaying(playing);
    }

    if (typeof audioPlayer?.addListener !== 'function') return;

    const unsubscribe = audioPlayer.addListener((event, data) => {
      if (event === 'reset') {
        setCurrentTrack(null);
        setIsPlaying(false);
      } else if (event === 'status') {
        setCurrentTrack(data?.track || null);
        setIsPlaying(!!data?.isPlaying);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  if (!currentTrack) return null;

  const handleTogglePlay = (e) => {
    e.stopPropagation();
    if (typeof audioPlayer?.togglePlay === 'function') {
      audioPlayer.togglePlay(currentTrack);
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <Image
        source={{
          uri:
            currentTrack.artwork ||
            'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80',
        }}
        style={styles.artwork}
      />

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {currentTrack.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {currentTrack.artist}
        </Text>
      </View>

      <TouchableOpacity style={styles.playBtn} onPress={handleTogglePlay}>
        <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 54,
    backgroundColor: '#282828',
    borderRadius: 8,
    marginHorizontal: 8,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    elevation: 8,
  },
  artwork: {
    width: 38,
    height: 38,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  info: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  artist: {
    color: '#B3B3B3',
    fontSize: 11,
    marginTop: 2,
  },
  playBtn: {
    padding: 8,
  },
  playIcon: {
    color: '#1DB954',
    fontSize: 18,
  },
});