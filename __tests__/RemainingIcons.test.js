import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';
import audioPlayer from '../src/services/audioPlayer';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../src/services/audioPlayer', () => ({
  __esModule: true,
  default: {
    getQueue: jest.fn(() => [
      { id: 'now', title: 'Now', artist: 'Artist' },
      { id: 'next', title: 'Next', artist: 'Artist' },
    ]),
    getCurrentIndex: jest.fn(() => 0), addListener: jest.fn(() => jest.fn()),
    removeFromQueue: jest.fn(), jumpToQueueIndex: jest.fn(), clearQueue: jest.fn(),
    playPlaylist: jest.fn(), setQueueForTrack: jest.fn(), playTrack: jest.fn(),
  },
}));
require('../test-utils/expoIcons');
const ProfileDetailsModal = require('../src/components/profile/ProfileDetailsModal').default;
const UserStatsModal = require('../src/components/profile/UserStatsModal').default;
const SettingsModal = require('../src/components/settings/SettingsModal').default;
const RecentPlayedModal = require('../src/components/social/RecentPlayedModal').default;
const QueueModal = require('../src/components/player/QueueModal').default;
const PlaylistDetailModal = require('../src/components/playlists/PlaylistDetailModal').default;

describe('remaining active icon contracts', () => {
  let renderer;
  const render = async (element) => ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(element); });
  const button = (label) => renderer.root.findAllByType(TouchableOpacity).find((node) => node.props.accessibilityLabel === label);
  afterEach(async () => {
    if (renderer) await ReactTestRenderer.act(() => renderer.unmount());
    renderer = null;
    jest.clearAllMocks();
  });

  it.each([
    [ProfileDetailsModal, 'Close profile'],
    [UserStatsModal, 'Close listening stats'],
    [SettingsModal, 'Close settings'],
    [RecentPlayedModal, 'Close recently played'],
  ])('keeps the %s back action named and connected', async (Component, label) => {
    const onClose = jest.fn();
    await render(<Component visible onClose={onClose} recentTracks={[]} />);
    expect(button(label)).toBeDefined();
    expect(button(label).findByType('ExpoUiIcon').props.name).toBe('chevron_left-symbol');
    await ReactTestRenderer.act(() => button(label).props.onPress());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps queue remove and close actions and original queue indices', async () => {
    const onClose = jest.fn();
    await render(<QueueModal visible onClose={onClose} />);
    expect(button('Remove Next from queue')).toBeDefined();
    expect(button('Remove Next from queue').findByType('ExpoUiIcon').props.name).toBe('close-symbol');
    await ReactTestRenderer.act(() => button('Remove Next from queue').props.onPress());
    expect(audioPlayer.removeFromQueue).toHaveBeenCalledWith(1);
    await ReactTestRenderer.act(() => button('Close queue').props.onPress());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(audioPlayer.clearQueue).not.toHaveBeenCalled();
  });

  it('keeps playlist play, shuffle and profile attachment callbacks intact', async () => {
    const tracks = [{ id: 't', title: 'Track', artist: 'Artist' }];
    const onAttachProfile = jest.fn();
    await render(<PlaylistDetailModal visible playlist={{ id: 'p', title: 'Playlist', tracks }} onClose={jest.fn()} onAttachProfile={onAttachProfile} userProfile={{ uid: 'u' }} />);
    expect(button('Play playlist').findByType('ExpoUiIcon').props.name).toBe('play_arrow-symbol');
    await ReactTestRenderer.act(() => button('Play playlist').props.onPress());
    expect(audioPlayer.playPlaylist).toHaveBeenCalledWith(tracks, 0);
    await ReactTestRenderer.act(() => button('Shuffle playlist').props.onPress());
    expect(audioPlayer.setQueueForTrack).toHaveBeenCalledWith(tracks[0], tracks, true);
    expect(audioPlayer.playTrack).toHaveBeenCalledWith(tracks[0]);
    const attach = renderer.root.findAllByType(TouchableOpacity).find((node) => node.findAllByType('ExpoUiIcon').some((icon) => icon.props.name === 'person-symbol'));
    await ReactTestRenderer.act(() => attach.props.onPress());
    expect(onAttachProfile).toHaveBeenCalledWith('p');
  });
});
