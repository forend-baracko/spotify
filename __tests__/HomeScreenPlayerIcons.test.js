import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Dimensions, Keyboard, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import audioPlayer from '../src/services/audioPlayer';

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
jest.mock('../src/components/search/GeminiDJ', () => (props) => require('react').createElement('GeminiDJProbe', props));
jest.mock('../src/components/playlists/LibraryAndCreateViews', () => ({ LibraryView: () => null, CreateView: () => null }));
jest.mock('../src/components/playlists/PlaylistDetailModal', () => (props) => require('react').createElement('PlaylistDetailProbe', props));
jest.mock('../src/components/playlists/AddToPlaylistModal', () => (props) => require('react').createElement('AddToPlaylistProbe', props));
jest.mock('../src/components/player/QueueModal', () => () => null);
jest.mock('../src/components/player/TrackActionSheetModal', () => (props) => require('react').createElement('TrackActionsProbe', props));
jest.mock('../src/components/profile/ProfileDrawer', () => () => null);
jest.mock('../src/components/profile/ProfileDetailsModal', () => () => null);
jest.mock('../src/components/profile/UserStatsModal', () => () => null);
jest.mock('../src/components/social/RecentPlayedModal', () => () => null);
jest.mock('../src/components/settings/SettingsModal', () => () => null);

require('../test-utils/expoIcons');
jest.doMock('../src/components/navigation/HomeShortcutCard', () => jest.requireActual('../src/components/navigation/HomeShortcutCard.android'));
jest.doMock('../src/components/navigation/HomeFeaturedCard', () => jest.requireActual('../src/components/navigation/HomeFeaturedCard.android'));
jest.doMock('../src/components/search/SearchCategoryCard', () => jest.requireActual('../src/components/search/SearchCategoryCard.android'));
jest.doMock('../src/components/search/SearchResultRow', () => jest.requireActual('../src/components/search/SearchResultRow.android'));
jest.doMock('../src/components/player/PlaybackProgress', () => jest.requireActual('../src/components/player/PlaybackProgress.android'));
jest.doMock('../src/components/player/PlayerArtwork', () => jest.requireActual('../src/components/player/PlayerArtwork.android'));

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
    mockMusic.playlists = [];
    mockTracks.splice(1);
    delete mockTrack.isPreview;
    delete mockTrack.artistBio;
    jest.clearAllMocks();
  });

  it('uses native pill buttons for Home filters and preserves exclusive selection', async () => {
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<Screen navigation={{}} />); });
    const chips = () => renderer.root.findAllByType('ExpoHomePill');
    expect(chips()).toHaveLength(2);
    const originalChips = chips();
    expect(chips().map((chip) => chip.props.variant)).toEqual(['outlined', 'outlined']);
    expect(chips().map((chip) => chip.props.modifiers.find((modifier) => modifier.$type === 'selectable').selected)).toEqual([true, false]);
    expect(chips().map((chip) => chip.findByType('ExpoUiText').props.children)).toEqual(['All', 'Music']);
    expect(chips()[1].props.modifiers).toEqual(expect.arrayContaining([expect.objectContaining({ contentDescription: 'Show all music recommendations, not selected' })]));
    await ReactTestRenderer.act(() => chips()[1].props.onClick());
    expect(chips()[0]).toBe(originalChips[0]);
    expect(chips()[1]).toBe(originalChips[1]);
    expect(chips().map((chip) => chip.props.modifiers.find((modifier) => modifier.$type === 'selectable').selected)).toEqual([false, true]);
    expect(chips()[1].props.modifiers).toEqual(expect.arrayContaining([expect.objectContaining({ contentDescription: 'Show all music recommendations, selected' })]));
    await ReactTestRenderer.act(() => chips()[0].props.onClick());
    expect(chips().map((chip) => chip.props.modifiers.find((modifier) => modifier.$type === 'selectable').selected)).toEqual([true, false]);
  });

  it('uses native shortcut cards and preserves the track playback callback', async () => {
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<Screen navigation={{}} />); });
    const cards = renderer.root.findAllByType('ExpoHomeCard');
    expect(cards.length).toBeGreaterThan(0);
    const ShortcutCard = jest.requireActual('../src/components/navigation/HomeShortcutCard.android').default;
    const action = renderer.root.findAllByType(ShortcutCard)[0].findByType(TouchableOpacity);
    expect(action.props.accessibilityRole).toBe('button');
    expect(action.props.accessibilityLabel).toBeTruthy();
    await ReactTestRenderer.act(() => action.props.onPress());
    expect(audioPlayer.playTrack).toHaveBeenCalledWith(mockTrack);
    expect(audioPlayer.setQueueForTrack).toHaveBeenCalledWith(mockTrack, mockTracks);
  });

  it('uses native featured cards and keeps their playback callback', async () => {
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<Screen navigation={{}} />); });
    const FeaturedCard = jest.requireActual('../src/components/navigation/HomeFeaturedCard.android').default;
    const cards = renderer.root.findAllByType(FeaturedCard);
    expect(cards.length).toBeGreaterThan(0);
    const action = cards[0].findByType(TouchableOpacity);
    expect(cards[0].findByType(Text).props.importantForAccessibility).toBe('no');
    expect(action.props.accessibilityRole).toBe('button');
    await ReactTestRenderer.act(() => action.props.onPress());
    expect(audioPlayer.playTrack).toHaveBeenCalledWith(mockTrack);
  });

  it('opens the selected playlist when its shortcut is pressed', async () => {
    const playlist = { id: 'playlist-1', title: 'Test playlist', tracks: [] };
    mockMusic.playlists = [playlist];
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<Screen navigation={{}} />); });
    const ShortcutCard = jest.requireActual('../src/components/navigation/HomeShortcutCard.android').default;
    await ReactTestRenderer.act(() => renderer.root.findAllByType(ShortcutCard)[0].findByType(TouchableOpacity).props.onPress());
    const detail = renderer.root.findByType('PlaylistDetailProbe');
    expect(detail.props.visible).toBe(true);
    expect(detail.props.playlist).toBe(playlist);
    expect(audioPlayer.playTrack).not.toHaveBeenCalled();
  });

  it('allows long profile names to shrink without hiding player actions', async () => {
    await renderPlayer();
    const badgeText = renderer.root.findAllByType(Text).find((node) => Array.isArray(node.props.children) && node.props.children[0] === 'From ');
    expect(badgeText.props.numberOfLines).toBe(1);
    expect(StyleSheet.flatten(badgeText.props.style).flexShrink).toBe(1);
    expect(StyleSheet.flatten(badgeText.parent.props.style).flexShrink).toBe(1);
    expect(button('Open playback queue')).toBeDefined();
  });

  it('renders player artwork using a native Expo card', async () => {
    await renderPlayer();
    const artwork = renderer.root.findAllByType('ExpoHomeCard').filter((node) => node.props.colors?.containerColor === '#282828');
    expect(artwork).toHaveLength(1);
  });

  it('matches the reference player surface and scales the native artwork to the screen', async () => {
    const platform = Platform.OS;
    Platform.OS = 'android';
    try {
      await renderPlayer();
      const surface = renderer.root.findByProps({ testID: 'full-player-surface' });
      expect(StyleSheet.flatten(surface.props.style).backgroundImage).toContain('linear-gradient');
      const card = renderer.root.findAllByType('ExpoHomeCard').find((node) => node.props.colors?.containerColor === '#282828');
      let host = card.parent;
      while (host && !StyleSheet.flatten(host.props.style)?.width) host = host.parent;
      const { width, height } = Dimensions.get('window');
      expect(host).toBeTruthy();
      expect(StyleSheet.flatten(host.props.style).width).toBe(Math.max(1, Math.min(width - 48, height * 0.43, 430)));
    } finally { Platform.OS = platform; }
  });

  it('opens the current track actions from the player menu', async () => {
    const platform = Platform.OS;
    Platform.OS = 'android';
    try {
      await renderPlayer();
      await press('More options for current track');
      const sheet = renderer.root.findByType('TrackActionsProbe');
      expect(sheet.props.visible).toBe(true);
      expect(sheet.props.track).toBe(mockTrack);
    } finally { Platform.OS = platform; }
  });

  it('does not let an old playlist add close a newly reopened picker', async () => {
    const platform = Platform.OS;
    Platform.OS = 'android';
    try {
    let finishAdd;
    mockMusic.addTrackToPlaylist.mockImplementationOnce(() => new Promise((resolve) => { finishAdd = resolve; }));
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<Screen navigation={{}} />); });
    const nextTrack = { id: 'next', title: 'Next song', artist: 'Next artist' };
    const actions = renderer.root.findByType('TrackActionsProbe');
    await ReactTestRenderer.act(() => actions.props.onAddToPlaylist(mockTrack));
    let picker = renderer.root.findByType('AddToPlaylistProbe');
    let pending;
    await ReactTestRenderer.act(() => { pending = picker.props.onSelectPlaylist('playlist', mockTrack); picker.props.onClose(); });
    await ReactTestRenderer.act(() => actions.props.onAddToPlaylist(nextTrack));
    picker = renderer.root.findByType('AddToPlaylistProbe');
    expect(picker.props.visible).toBe(true);
    expect(picker.props.track).toBe(nextTrack);
    await ReactTestRenderer.act(async () => { finishAdd(true); await pending; });
    expect(renderer.root.findByType('AddToPlaylistProbe').props.visible).toBe(true);
    expect(mockMusic.addTrackToPlaylist).toHaveBeenCalledWith('playlist', mockTrack);
    } finally { Platform.OS = platform; }
  });

  it('shows the reference add-to-library icon while keeping the Liked Songs action', async () => {
    const platform = Platform.OS;
    Platform.OS = 'android';
    try {
      await renderPlayer();
      expect(button('Save to Liked Songs').findByType('ExpoUiIcon').props.name).toBe('add_circle-symbol');
      await press('Save to Liked Songs');
      expect(mockMusic.toggleLikeTrack).toHaveBeenCalledWith(mockTrack);
    } finally {
      Platform.OS = platform;
    }
  });

  it('shows only available artist facts in the active player', async () => {
    const platform = Platform.OS;
    Platform.OS = 'android';
    try {
      mockTrack.artistBio = 'A real artist biography';
      await renderPlayer();
      const texts = renderer.root.findAllByType(Text).map((node) => node.props.children);
      expect(texts).toContain('A real artist biography');
      expect(texts).not.toContain('1,248,590 monthly listeners');
      expect(texts.some((text) => typeof text === 'string' && text.includes('Mariah Deborah is an independent'))).toBe(false);
    } finally { Platform.OS = platform; }
  });

  it('keeps the Android artist placeholder empty when facts are unavailable', async () => {
    const platform = Platform.OS;
    Platform.OS = 'android';
    try {
      await renderPlayer();
      const overlay = renderer.root.findAllByType(Text).find((node) => node.props.children === 'About the artist').parent;
      const texts = overlay.findAllByType(Text).map((node) => node.props.children);
      expect(texts).toEqual(['About the artist', 'Test Artist', 'Follow']);
      expect(overlay.parent.findAllByType(require('react-native').Image)).toHaveLength(0);
    } finally { Platform.OS = platform; }
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
    const scrubber = renderer.root.findByType('ExpoComposeSlider');
    await ReactTestRenderer.act(() => scrubber.props.onValueChange(115));
    await ReactTestRenderer.act(() => scrubber.props.onValueChangeFinished());
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

  it('uses native category cards and preserves the Music browsing action', async () => {
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<Screen navigation={{}} />); });
    await press('Search');
    expect(renderer.root.findAllByType('ExpoHomeCard')).toHaveLength(2);
    await press('Browse Music');
    expect(renderer.root.findAllByType('ExpoHomeCard')).toHaveLength(0);
    expect(renderer.root.findAllByType(TouchableOpacity).some((node) => node.props.accessibilityLabel === 'Browse Music')).toBe(false);
  });

  it('uses the native media cards in Made For You and preserves playback', async () => {
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<Screen navigation={{}} />); });
    await press('Search');
    await press('Browse Made For You');
    const FeaturedCard = jest.requireActual('../src/components/navigation/HomeFeaturedCard.android').default;
    const cards = renderer.root.findAllByType(FeaturedCard);
    expect(cards.length).toBeGreaterThan(0);
    await ReactTestRenderer.act(() => cards[0].findByType(TouchableOpacity).props.onPress());
    expect(audioPlayer.playTrack).toHaveBeenCalledWith(mockTrack);
  });

  it('hands the DJ queue to the player and returns to Home', async () => {
    const next = { id: 'track-2', title: 'Next', artist: 'Artist' };
    const queue = [mockTrack, next];
    const dismiss = jest.spyOn(Keyboard, 'dismiss');
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<Screen navigation={{}} />); });
    await press('Search');
    await ReactTestRenderer.act(() => renderer.root.findByType('GeminiDJProbe').props.onStartSet(queue));
    expect(audioPlayer.setQueue).toHaveBeenCalledWith(queue, 0);
    expect(audioPlayer.playTrack).toHaveBeenCalledWith(mockTrack);
    expect(dismiss).toHaveBeenCalled();
    expect(button('Home').props.accessibilityState.selected).toBe(true);
    dismiss.mockRestore();
  });

  it('uses native search result rows and preserves playback and more options', async () => {
    mockTrack.isPreview = true;
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<Screen navigation={{}} />); });
    await press('Search');
    const input = renderer.root.findByProps({ accessibilityLabel: 'Search songs, artists, or albums' });
    await ReactTestRenderer.act(() => input.props.onChangeText('Test Song'));
    expect(renderer.root.findAllByType('ExpoDrawerListItem')).toHaveLength(1);
    await press('More options for Test Song');
    const sheet = renderer.root.findByType('TrackActionsProbe');
    expect(sheet.props.visible).toBe(true);
    expect(sheet.props.track).toBe(mockTrack);
    await ReactTestRenderer.act(() => sheet.props.onClose());
    await press('Play Test Song by Test Artist, Preview');
    expect(audioPlayer.playTrack).toHaveBeenCalledWith(mockTrack);
    expect(audioPlayer.setQueueForTrack).toHaveBeenCalledWith(mockTrack, [mockTrack]);
  });

  it('paginates matching search results and clears the query', async () => {
    mockTracks.push(...Array.from({ length: 20 }, (_, i) => ({ id: `catalog-${i}`, title: `Catalog ${i}`, artist: 'Artist' })));
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<Screen navigation={{}} />); });
    await press('Search');
    const input = renderer.root.findByProps({ accessibilityLabel: 'Search songs, artists, or albums' });
    const searchScroll = renderer.root.findAllByType(ScrollView).find((node) => node.findAllByProps({ accessibilityLabel: 'Search songs, artists, or albums' }).length > 0);
    expect(searchScroll.props.keyboardShouldPersistTaps).toBe('handled');
    await ReactTestRenderer.act(() => input.props.onChangeText('Catalog'));
    const results = () => renderer.root.findAllByType(TouchableOpacity).filter((node) => node.props.accessibilityLabel?.startsWith('More options for Catalog'));
    expect(results()).toHaveLength(15);
    const more = renderer.root.findAllByType(TouchableOpacity).find((node) => node.findAllByType(Text).some((text) => text.props.children === 'Load more results'));
    await ReactTestRenderer.act(() => more.props.onPress());
    expect(results()).toHaveLength(20);
    await press('Clear search');
    expect(input.props.value).toBe('');
    expect(results()).toHaveLength(0);
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
