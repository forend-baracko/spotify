import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { TextInput, TouchableOpacity } from 'react-native';
import audioPlayer from '../src/services/audioPlayer';

const mockTrack = { id: 'track-1', title: 'Test Song', artist: 'Test Artist', artwork: null };
const mockTracks = [mockTrack];
const mockMusic = {
  availableTracks: mockTracks, playlists: [], recentTracks: [],
  isLiked: jest.fn(() => false), toggleLikeTrack: jest.fn(),
  addToQueue: jest.fn(), privateSession: false,
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
  __esModule: true,
  REPEAT_MODE: { OFF: 'OFF', ALL: 'ALL', ONE: 'ONE' },
  default: {
    getIsShuffle: jest.fn(() => false), getRepeatMode: jest.fn(() => 'OFF'),
    getQueue: jest.fn(() => mockTracks), getCurrentTrack: jest.fn(() => mockTrack),
    getIsPlaying: jest.fn(() => false), addListener: jest.fn(() => jest.fn()),
    togglePlay: jest.fn(), playPrevious: jest.fn(), playNext: jest.fn(),
    toggleShuffle: jest.fn(() => true), toggleRepeat: jest.fn(), seekTo: jest.fn(),
    setQueueForTrack: jest.fn(), setQueue: jest.fn(), playTrack: jest.fn(),
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

// Imports above are hoisted; resolve the screen after installing the native boundary doubles.
const Screen = jest.requireActual('../src/screens/HomeScreen').default;

describe('active HomeScreen icon contracts', () => {
  let renderer;
  const button = (label) => renderer.root.findAllByType(TouchableOpacity)
    .find((node) => node.props.accessibilityLabel === label);
  const press = async (label) => {
    expect(button(label)).toBeDefined();
    await ReactTestRenderer.act(() => button(label).props.onPress());
  };
  const emit = async (event, data) => ReactTestRenderer.act(() => {
    audioPlayer.addListener.mock.calls.forEach(([listener]) => listener(event, data));
  });
  const renderPlayer = async () => {
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<Screen navigation={{}} />); });
    await press('Open current track: Test Song by Test Artist');
  };
  afterEach(async () => {
    if (renderer) await ReactTestRenderer.act(() => renderer.unmount());
    renderer = null;
    jest.clearAllMocks();
  });

  it('uses native transport icons and preserves track arguments, previous/next and seek', async () => {
    await renderPlayer();
    expect(button('Play song').findByType('ExpoUiIcon').props.name).toBe('play_arrow-symbol');
    await press('Play song');
    await press('Previous song');
    await press('Next song');
    expect(audioPlayer.togglePlay).toHaveBeenCalledWith(mockTrack);
    expect(audioPlayer.playPrevious).toHaveBeenCalledTimes(1);
    expect(audioPlayer.playNext).toHaveBeenCalledTimes(1);
    await emit('play', { track: mockTrack, isPlaying: true });
    expect(button('Pause song').findByType('ExpoUiIcon').props.name).toBe('pause-symbol');
    const scrubber = renderer.root.findAllByType(TouchableOpacity).find((node) => node.props.activeOpacity === 1);
    await ReactTestRenderer.act(() => scrubber.props.onPress({ nativeEvent: { locationX: 160 } }));
    expect(audioPlayer.seekTo).toHaveBeenCalledWith(115);
  });

  it('keeps shuffle and all three repeat modes, with non-color and accessible state cues', async () => {
    await renderPlayer();
    await press('Turn shuffle on');
    expect(audioPlayer.toggleShuffle).toHaveBeenCalledTimes(1);
    expect(button('Turn shuffle off').props.accessibilityState).toEqual({ selected: true });
    for (const [mode, label, icon, selected] of [
      ['OFF', 'Repeat off', 'repeat-symbol', false],
      ['ALL', 'Repeat all songs', 'repeat-symbol', true],
      ['ONE', 'Repeat current song', 'repeat_one-symbol', true],
    ]) {
      await emit('repeat', { repeatMode: mode });
      const control = button(label);
      expect(control.props.accessibilityState).toEqual({ selected });
      expect(control.findByType('ExpoUiIcon').props.name).toBe(icon);
    }
    audioPlayer.toggleRepeat.mockReturnValueOnce('OFF');
    await press('Repeat current song');
    expect(audioPlayer.toggleRepeat).toHaveBeenCalledTimes(1);
    await press('Save to Liked Songs');
    expect(mockMusic.toggleLikeTrack).toHaveBeenCalledWith(mockTrack);
  });

  it('retains the search input, clearing and dismissal callbacks with native search icons', async () => {
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<Screen navigation={{}} />); });
    expect(button('Search songs or artists').findByType('ExpoUiIcon').props.name).toBe('search-symbol');
    await press('Search songs or artists');
    const input = renderer.root.findAllByType(TextInput).find((node) => node.props.accessibilityLabel === 'Search songs or artists');
    await ReactTestRenderer.act(() => input.props.onChangeText('Test'));
    await press('Cancel search');
    await press('Search songs or artists');
    const reopened = renderer.root.findAllByType(TextInput).find((node) => node.props.accessibilityLabel === 'Search songs or artists');
    expect(reopened.props.value).toBe('');
    expect(renderer.root.findAllByType('ExpoUiIcon').some((node) => node.props.name === 'search-symbol')).toBe(true);
  });
});
