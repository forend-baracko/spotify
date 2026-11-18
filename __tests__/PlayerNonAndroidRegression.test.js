import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Dimensions, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const mockTrack = { id: 'track-1', title: 'Test Song', artist: 'Test Artist', artwork: null };
const mockTracks = [mockTrack];
const mockMusic = {
  availableTracks: mockTracks, playlists: [], recentTracks: [],
  isLiked: jest.fn(() => false), toggleLikeTrack: jest.fn(),
  addToQueue: jest.fn(), addTrackToPlaylist: jest.fn(), privateSession: false,
};

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../src/context/AuthContext', () => ({
  AuthContext: require('react').createContext({ user: { uid: 'test-user', username: 'Listener' } }),
}));
jest.mock('../src/context/MusicContext', () => ({ useMusic: () => mockMusic }));
jest.mock('../src/services/audiomackService', () => ({ get MOCK_TRACKS() { return mockTracks; } }));
jest.mock('../src/services/audiusService', () => ({ searchAudiusTracks: jest.fn().mockResolvedValue([]) }));
jest.mock('../src/services/audioPlayer', () => ({
  __esModule: true, REPEAT_MODE: { OFF: 'OFF', ALL: 'ALL', ONE: 'ONE' },
  default: {
    getIsShuffle: jest.fn(() => false), getRepeatMode: jest.fn(() => 'OFF'),
    getQueue: jest.fn(() => mockTracks), getCurrentTrack: jest.fn(() => mockTrack),
    getIsPlaying: jest.fn(() => false), addListener: jest.fn(() => jest.fn()),
  },
}));
jest.mock('../src/components/search/GeminiDJ', () => () => null);
jest.mock('../src/components/playlists/LibraryAndCreateViews', () => ({ LibraryView: () => null, CreateView: () => null }));
jest.mock('../src/components/playlists/PlaylistDetailModal', () => () => null);
jest.mock('../src/components/playlists/AddToPlaylistModal', () => () => null);
jest.mock('../src/components/player/QueueModal', () => () => null);
jest.mock('../src/components/player/TrackActionSheetModal', () => () => null);
jest.mock('../src/components/profile/ProfileDrawer', () => () => null);
jest.mock('../src/components/profile/ProfileDetailsModal', () => () => null);
jest.mock('../src/components/profile/UserStatsModal', () => () => null);
jest.mock('../src/components/social/RecentPlayedModal', () => () => null);
jest.mock('../src/components/settings/SettingsModal', () => () => null);

require('../test-utils/expoIcons');
const PlayerArtwork = require('../src/components/player/PlayerArtwork').default;
const Screen = require('../src/screens/HomeScreen').default;

const fallbackImage = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80';
const legacyBio = 'Mariah Deborah is an independent indie-pop singer-songwriter known for her soulful acoustic arrangements and heartfelt lyrical storytelling.';

describe('non-Android player regressions', () => {
  let renderer;
  let previousPlatform;
  let previousWindow;

  beforeEach(() => {
    previousPlatform = Platform.OS;
    Platform.OS = 'web';
    previousWindow = Dimensions.get('window');
  });
  afterEach(async () => {
    if (renderer) await ReactTestRenderer.act(() => renderer.unmount());
    renderer = null;
    Dimensions.set({ window: previousWindow });
    Platform.OS = previousPlatform;
    Object.assign(mockTrack, { artist: 'Test Artist' });
    delete mockTrack.artistImage;
    delete mockTrack.artistBio;
    jest.clearAllMocks();
  });

  it.each([null, { uri: 'https://example.com/cover.jpg' }])('keeps artwork at 310 square on narrow screens, including placeholder (%s)', async (artwork) => {
    Dimensions.set({ window: { ...previousWindow, width: 200 } });
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<PlayerArtwork artwork={artwork} />); });
    const node = artwork ? renderer.root.findByType(Image) : renderer.root.findByType(View);
    expect(StyleSheet.flatten(node.props.style)).toMatchObject({ width: 310, height: 310, borderRadius: 8 });
    if (!artwork) expect(renderer.root.findByType(Text).props.children).toBe('♪');
  });

  const openPlayer = async () => {
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<Screen navigation={{}} />); });
    const button = renderer.root.findAllByType(TouchableOpacity).find((node) => node.props.accessibilityLabel?.startsWith('Open current track:'));
    await ReactTestRenderer.act(() => button.props.onPress());
  };

  it('uses the original fallback artist image, name, listeners and biography', async () => {
    mockTrack.artist = '';
    await openPlayer();
    const overlay = renderer.root.findAllByType(Text).find((node) => node.props.children === 'About the artist').parent;
    const texts = overlay.findAllByType(Text).map((node) => node.props.children);
    expect(texts).toContain('Mariah Deborah');
    expect(texts).toContain('1,248,590 monthly listeners');
    expect(texts).toContain(legacyBio);
    expect(renderer.root.findAllByType(Image).some((node) => node.props.source?.uri === fallbackImage)).toBe(true);
  });

  it('uses the supplied artist image and name while retaining the original listeners and biography', async () => {
    mockTrack.artistImage = 'https://example.com/artist.jpg';
    mockTrack.artistBio = 'A different biography';
    await openPlayer();
    const overlay = renderer.root.findAllByType(Text).find((node) => node.props.children === 'About the artist').parent;
    const texts = overlay.findAllByType(Text).map((node) => node.props.children);
    expect(texts).toContain('Test Artist');
    expect(texts).toContain('1,248,590 monthly listeners');
    expect(texts).toContain(legacyBio);
    expect(texts).not.toContain('A different biography');
    expect(renderer.root.findAllByType(Image).some((node) => node.props.source?.uri === mockTrack.artistImage)).toBe(true);
  });
});
