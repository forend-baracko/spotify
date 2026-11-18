import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../src/components/player/SwipeableTrackRow', () => {
  const ReactMock = require('react');
  return (props) => ReactMock.createElement('RecentSwipeRow', props);
});
require('../test-utils/expoIcons');
const RecentPlayedModal = require('../src/components/social/RecentPlayedModal').default;

describe('recently played screen behavior', () => {
  let renderer;
  afterEach(async () => { if (renderer) await ReactTestRenderer.act(() => renderer.unmount()); renderer = null; });
  it('preserves track identity, selection, likes, playback, menu and swipe callbacks', async () => {
    const first = { id: 'one', title: 'One', artist: 'Artist' };
    const second = { id: 'two', title: 'Two', artist: 'Another Artist' };
    const play = jest.fn(); const menu = jest.fn(); const queue = jest.fn(); const playlist = jest.fn(); const favorite = jest.fn();
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<RecentPlayedModal visible onClose={jest.fn()} recentTracks={[first, second]} currentTrack={second} onPlayTrack={play} onOpenTrackMenu={menu} onAddToQueue={queue} onAddToPlaylist={playlist} onToggleFavorite={favorite} isLiked={(id) => id === first.id} />); });
    const rows = renderer.root.findAllByType('RecentSwipeRow');
    expect(rows.map((row) => row.props.track)).toEqual([first, second]);
    expect(rows.map((row) => row.props.isSelected)).toEqual([false, true]);
    expect(rows.map((row) => row.props.isLiked)).toEqual([true, false]);
    expect(rows[1].props.onAddToQueue).toBe(queue);
    expect(rows[1].props.onAddToPlaylist).toBe(playlist);
    expect(rows[1].props.onToggleFavorite).toBe(favorite);
    await ReactTestRenderer.act(() => { rows[1].props.onPress(); rows[0].props.onOpenMenu(); });
    expect(play).toHaveBeenCalledWith(second);
    expect(menu).toHaveBeenCalledWith(first);
  });
  it('shows the empty state and closes without changing data', async () => {
    const close = jest.fn();
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<RecentPlayedModal visible onClose={close} recentTracks={[]} />); });
    expect(renderer.root.findAllByType(Text).some((node) => node.props.children === 'Tracks you play will appear here.')).toBe(true);
    const back = renderer.root.findAllByType(TouchableOpacity).find((node) => node.props.accessibilityLabel === 'Close recently played');
    await ReactTestRenderer.act(() => back.props.onPress());
    expect(close).toHaveBeenCalledTimes(1);
  });
});
