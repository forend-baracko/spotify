import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import audioPlayer from '../../services/audioPlayer';
import { getArtworkSource } from '../../utils/artworkHelper';

export default function QueueModal({ visible, onClose }) {
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (visible) {
      setQueue(audioPlayer.getQueue());
      setCurrentIndex(audioPlayer.getCurrentIndex());
    }

    const unsubscribe = audioPlayer.addListener((event, data) => {
      setQueue(audioPlayer.getQueue());
      setCurrentIndex(audioPlayer.getCurrentIndex());
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [visible]);

  const handleSelectTrack = (index) => {
    audioPlayer.jumpToQueueIndex(index);
  };

  const handleRemoveTrack = (index) => {
    audioPlayer.removeFromQueue(index);
  };

  const handleClearQueue = () => {
    audioPlayer.clearQueue();
  };

  const renderTrackItem = (item, queueIndex) => {
    const isNowPlaying = queueIndex === currentIndex;

    return (
      <View style={[styles.trackRow, isNowPlaying && styles.activeRow]}>
        <TouchableOpacity
          style={styles.trackInfoContainer}
          onPress={() => handleSelectTrack(queueIndex)}
          activeOpacity={0.7}
        >
          <Image
            source={getArtworkSource(
              item.artwork ||
                'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80'
            )}
            style={styles.artwork}
          />
          <View style={styles.textContainer}>
            <Text
              style={[styles.trackTitle, isNowPlaying && styles.greenText]}
              numberOfLines={1}
            >
              {item.title || 'Unknown Title'}
            </Text>
            <Text style={styles.trackArtist} numberOfLines={1}>
              {item.artist || 'Unknown Artist'}
            </Text>
          </View>
        </TouchableOpacity>

        {!isNowPlaying && (
          <TouchableOpacity
            onPress={() => handleRemoveTrack(queueIndex)}
            style={styles.removeBtn}
          >
            <Text style={styles.removeIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const nowPlayingItem = queue[currentIndex];
  const upcomingQueue = queue
    .map((item, queueIndex) => ({ item, queueIndex }))
    .filter(({ queueIndex }) => queueIndex > currentIndex);

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
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Queue</Text>
          {upcomingQueue.length > 0 ? (
            <TouchableOpacity onPress={handleClearQueue} style={styles.clearBtn}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        {/* Now Playing Section */}
        {nowPlayingItem && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>Now Playing</Text>
            {renderTrackItem(nowPlayingItem, currentIndex)}
          </View>
        )}

        {/* Next Up Section */}
        <View style={[styles.sectionContainer, styles.nextUpSection]}>
          <Text style={styles.sectionHeader}>Next Up</Text>
          <FlatList
            data={upcomingQueue}
            keyExtractor={({ item, queueIndex }) => `${item.id}-${queueIndex}`}
            renderItem={({ item: queuedTrack }) =>
              renderTrackItem(queuedTrack.item, queuedTrack.queueIndex)
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No upcoming songs in queue.</Text>
            }
          />
        </View>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#282828',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 50,
  },
  clearBtn: {
    padding: 6,
  },
  clearText: {
    color: '#1DB954',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  nextUpSection: {
    flex: 1,
  },
  sectionHeader: {
    color: '#B3B3B3',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  activeRow: {
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
  },
  trackInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: 4,
    backgroundColor: '#282828',
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  trackTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  trackArtist: {
    color: '#B3B3B3',
    fontSize: 12,
    marginTop: 2,
  },
  greenText: {
    color: '#1DB954',
  },
  removeBtn: {
    padding: 8,
  },
  removeIcon: {
    color: '#777',
    fontSize: 14,
  },
  emptyText: {
    color: '#777',
    textAlign: 'center',
    marginTop: 30,
    fontSize: 14,
  },
});