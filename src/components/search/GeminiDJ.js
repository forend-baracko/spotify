import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { createGeminiDjSet, getGeminiStatus } from '../../services/geminiService';
import TrackCategoriesBrowser from './TrackCategoriesBrowser';

const shuffleTracks = (items) => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
};

const GeminiDJ = ({ tracks, onStartSet }) => {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [djSet, setDjSet] = useState(null);
  const [setTracks, setSetTracks] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const checkStatus = useCallback(async () => {
    setIsCheckingStatus(true);
    const status = await getGeminiStatus();
    setIsConfigured(status.configured);
    setStatusMessage(status.message);
    setIsCheckingStatus(false);
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const buildSet = async () => {
    setError('');
    setDjSet(null);
    setSetTracks([]);
    if (!isConfigured) {
      setError(statusMessage || 'AI DJ is not configured yet.');
      return;
    }
    if (!prompt.trim()) {
      setError('Describe the vibe for your DJ set.');
      return;
    }
    const catalogTracks = selectedCategory
      ? tracks.filter((track) => track.categories?.includes(selectedCategory))
      : tracks;
    if (!catalogTracks.length) {
      setError('There are no tracks available for a DJ set right now.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await createGeminiDjSet(user, prompt.trim(), catalogTracks);
      const tracksById = new Map(catalogTracks.map((track) => [track.id, track]));
      const selectedTrack = tracksById.get(result.trackId);
      if (!selectedTrack) {
        throw new Error('Gemini could not match a track to the available catalog.');
      }
      // Keep initial queue lean to prevent mobile system lag; player auto-replenishes on demand
      const initialQueue = shuffleTracks(
        catalogTracks.filter((track) => track.id !== selectedTrack.id)
      ).slice(0, 6);
      setSetTracks([selectedTrack, ...initialQueue]);
      setDjSet(result);
    } catch (requestError) {
      setError(requestError.message || 'Could not create a DJ set. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isQuotaError = /quota|rate limit/i.test(error);
  const canRetryError = isQuotaError || /overloaded|temporary service error|timed out/i.test(error);

  const openQuotaSettings = async () => {
    try {
      await Linking.openURL('https://aistudio.google.com/rate-limit?timeRange=last-28-days');
    } catch {
      setError('Could not open Google AI Studio. Visit aistudio.google.com/rate-limit to review the quota.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>♫</Text>
        </View>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>POWERED BY GEMINI</Text>
          <Text style={styles.heading}>AI DJ</Text>
        </View>
      </View>
      <Text style={styles.description}>
        Tell your DJ what you’re in the mood for. Gemini picks one matching track, then the rest of your queue is randomized.
      </Text>
      <TrackCategoriesBrowser
        tracks={tracks}
        selectedCategory={selectedCategory}
        onSelectCategory={(category) => {
          const nextCategory = selectedCategory === category ? null : category;
          setSelectedCategory(nextCategory);
          setPrompt(nextCategory || '');
        }}
      />
      {isCheckingStatus ? (
        <ActivityIndicator color="#D5A5E8" />
      ) : isConfigured ? (
        <>
          <TextInput
            style={styles.input}
            value={prompt}
            onChangeText={setPrompt}
            placeholder="e.g. sad OPM R&B or upbeat rap"
            placeholderTextColor="#727272"
            maxLength={500}
            returnKeyType="go"
            onSubmitEditing={buildSet}
            accessibilityLabel="Describe the music you want your AI DJ to pick"
          />
          <TouchableOpacity
            style={[styles.buildButton, isLoading && styles.disabledButton]}
            onPress={buildSet}
            disabled={isLoading}
            accessibilityRole="button"
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buildButtonText}>{djSet ? 'Pick another track' : 'Pick my track'}</Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.setupRow}>
          <Text style={styles.setupText}>{statusMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={checkStatus}
            accessibilityRole="button"
            accessibilityLabel="Retry AI DJ connection"
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}
      {canRetryError && (
        <View style={styles.quotaActions}>
          <TouchableOpacity
            style={styles.quotaButton}
            onPress={buildSet}
            disabled={isLoading}
            accessibilityRole="button"
          >
            <Text style={styles.quotaButtonText}>Try again</Text>
          </TouchableOpacity>
          {isQuotaError && (
            <TouchableOpacity
              style={styles.quotaButton}
              onPress={openQuotaSettings}
              accessibilityRole="button"
            >
              <Text style={styles.quotaButtonText}>Check Google quota</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {djSet && (
        <View style={styles.setCard}>
          <Text style={styles.setTitle}>{djSet.title}</Text>
          {!!djSet.intro && <Text style={styles.intro}>{djSet.intro}</Text>}
          <View style={styles.trackRow}>
            <Text style={styles.trackNumber}>▶</Text>
            <View style={styles.trackMeta}>
              <Text style={styles.trackTitle} numberOfLines={1}>{setTracks[0]?.title}</Text>
              <Text style={styles.artist} numberOfLines={1}>{setTracks[0]?.artist}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => onStartSet(setTracks)}
            accessibilityRole="button"
            accessibilityLabel={`Play ${setTracks[0]?.title}`}
          >
            <Text style={styles.startButtonText}>▶  Play pick & randomized queue</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#22152D',
    borderColor: '#503366',
    borderWidth: 1,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8E24AA',
    marginRight: 10,
  },
  icon: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  headingCopy: {
    flex: 1,
  },
  eyebrow: {
    color: '#D5A5E8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
    marginTop: 1,
  },
  description: {
    color: '#D2C6D9',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
    marginBottom: 12,
  },
  input: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    color: '#121212',
    fontSize: 14,
  },
  buildButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderRadius: 24,
    backgroundColor: '#8E24AA',
  },
  disabledButton: {
    opacity: 0.7,
  },
  buildButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  error: {
    color: '#FF8992',
    fontSize: 13,
    marginTop: 10,
  },
  quotaActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  quotaButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: '#503366',
  },
  quotaButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  setupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  setupText: {
    flex: 1,
    color: '#D5A5E8',
    fontSize: 13,
    lineHeight: 18,
  },
  retryButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#503366',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  setCard: {
    paddingTop: 14,
  },
  setTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  intro: {
    color: '#D2C6D9',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 8,
  },
  trackRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#503366',
  },
  trackNumber: {
    width: 30,
    color: '#D5A5E8',
    fontSize: 11,
    fontWeight: '600',
  },
  trackMeta: {
    flex: 1,
  },
  trackTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  artist: {
    color: '#B3B3B3',
    fontSize: 11,
    marginTop: 2,
  },
  startButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
  },
  startButtonText: {
    color: '#17101B',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default GeminiDJ;
