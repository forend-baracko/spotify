import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MusicProvider, useMusic } from '../src/context/MusicContext';

const mockSetDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockDeleteDoc = jest.fn();
const mockDoc = jest.fn((...parts) => parts);
const mockCollection = jest.fn((...parts) => parts);
let mockPlaybackListener;

jest.mock('firebase/firestore', () => ({
  collection: (...parts) => mockCollection(...parts),
  deleteDoc: (...args) => mockDeleteDoc(...args),
  doc: (...parts) => mockDoc(...parts),
  getDoc: (...args) => mockGetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  serverTimestamp: () => 'server-timestamp',
  setDoc: (...args) => mockSetDoc(...args),
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'user-1' } }),
}));

jest.mock('../src/services/firebaseConfig', () => ({ db: {} }));
jest.mock('../src/services/audiusService', () => ({
  fetchAudiusTracks: jest.fn().mockResolvedValue([]),
}));
jest.mock('../src/services/audioPlayer', () => ({
  __esModule: true,
  default: {
    addListener: jest.fn((callback) => {
      mockPlaybackListener = callback;
      return jest.fn();
    }),
    reset: jest.fn(),
    setCatalogProvider: jest.fn(),
  },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(undefined),
    setItem: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('MusicContext liked songs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPlaybackListener = null;
    AsyncStorage.getItem.mockResolvedValue(null);
    mockGetDoc.mockResolvedValue({ exists: () => false });
    mockGetDocs.mockResolvedValue({ docs: [] });
    mockSetDoc.mockResolvedValue(undefined);
    mockDeleteDoc.mockResolvedValue(undefined);
  });

  it('stores detailed liked song data in the signed-in user likedSongs collection', async () => {
    let music;
    const CaptureMusic = () => {
      music = useMusic();
      return null;
    };
    const track = {
      id: 'song-1',
      title: 'Test Song',
      artist: 'Test Artist',
      album: 'Test Album',
      artwork: 'https://example.com/artwork.png',
      duration: 183,
      genre: 'Pop',
      source: 'audius',
      source_url: 'https://audius.co/test',
    };

    let renderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <MusicProvider>
          <CaptureMusic />
        </MusicProvider>
      );
      await Promise.resolve();
      await Promise.resolve();
    });
    await ReactTestRenderer.act(async () => music.toggleLikeTrack(track));

    expect(mockDoc).toHaveBeenCalledWith({}, 'users', 'user-1', 'likedSongs', 'song-1');
    expect(mockSetDoc).toHaveBeenNthCalledWith(
      2,
      [{}, 'users', 'user-1', 'likedSongs', 'song-1'],
      expect.objectContaining({
        trackId: 'song-1',
        title: 'Test Song',
        artist: 'Test Artist',
        album: 'Test Album',
        artwork: 'https://example.com/artwork.png',
        duration: 183,
        genre: 'Pop',
        source: 'audius',
        sourceUrl: 'https://audius.co/test',
        likedAt: 'server-timestamp',
      })
    );
    expect(music.likedTrackIds).toContain('song-1');
    await ReactTestRenderer.act(() => renderer.unmount());
  });

  it('restores liked song details from Firestore into Liked Songs', async () => {
    let music;
    const CaptureMusic = () => {
      music = useMusic();
      return null;
    };
    const savedTrack = {
      trackId: 'saved-song',
      title: 'Saved Song',
      artist: 'Saved Artist',
      album: 'Saved Album',
      artwork: 'https://example.com/saved.png',
      duration: 204,
      source: 'audius',
    };
    mockGetDocs.mockResolvedValue({
      docs: [{ id: 'saved-song', data: () => savedTrack }],
    });

    let renderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <MusicProvider>
          <CaptureMusic />
        </MusicProvider>
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(music.likedTrackIds).toContain('saved-song');
    expect(music.playlists.find((playlist) => playlist.id === 'pl-liked').tracks).toContainEqual(
      expect.objectContaining({ id: 'saved-song', title: 'Saved Song', artist: 'Saved Artist' })
    );
    await ReactTestRenderer.act(() => renderer.unmount());
  });

  it('writes a Firestore heartbeat while a signed-in user is playing', async () => {
    let renderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <MusicProvider>
          <CaptureMusicForHeartbeat />
        </MusicProvider>
      );
      await Promise.resolve();
    });

    await ReactTestRenderer.act(async () => {
      mockPlaybackListener('status', {
        track: { id: 'song-1' },
        isPlaying: true,
      });
      await Promise.resolve();
    });

    expect(mockDoc).toHaveBeenCalledWith({}, 'listener_sessions', 'user-1');
    expect(mockSetDoc).toHaveBeenCalledWith(
      [{}, 'listener_sessions', 'user-1'],
      {
        uid: 'user-1',
        isPlaying: true,
        lastHeartbeat: 'server-timestamp',
      }
    );
    await ReactTestRenderer.act(() => renderer.unmount());
  });
});

function CaptureMusicForHeartbeat() {
  return null;
}
