import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Animated, Text, TouchableOpacity } from 'react-native';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
require('../test-utils/expoIcons');
const TrackActionSheetModal = require('../src/components/player/TrackActionSheetModal').default;
const SwipeableTrackRow = require('../src/components/player/SwipeableTrackRow').default;
const track = { id: 'song-1', title: 'Song', artist: 'Artist', artwork: null };

describe('track action icon contracts', () => {
  let renderer;
  const byText = (label) => renderer.root.findAllByType(TouchableOpacity)
    .find((node) => node.findAllByType(Text).some((text) => text.props.children === label));
  afterEach(async () => {
    if (renderer) await ReactTestRenderer.act(() => renderer.unmount());
    renderer = null;
    jest.restoreAllMocks();
  });

  it.each([
    ['Save to your Liked Songs', 'favorite-symbol', 'onToggleLike'],
    ['Add to queue', 'queue_music-symbol', 'onAddToQueue'],
    ['Add to playlist', 'playlist_add-symbol', 'onAddToPlaylist'],
    ['Remove from this playlist', 'delete-symbol', 'onRemoveFromPlaylist'],
  ])('keeps %s and its exact track argument', async (label, symbol, callback) => {
    const action = jest.fn();
    const close = jest.fn();
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(
      <TrackActionSheetModal visible track={track} onClose={close} isInPlaylist {...{ [callback]: action }} />
    ); });
    const button = byText(label);
    expect(button.findAllByType('ExpoUiIcon').map((node) => node.props.name)).toEqual([symbol]);
    await ReactTestRenderer.act(() => button.props.onPress());
    expect(close).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith(track);
  });

  it('keeps swipe-row queue, playlist, like and menu actions separate from playback', async () => {
    jest.spyOn(Animated, 'spring').mockImplementation(() => ({ start: (complete) => complete?.() }));
    const callbacks = { onPress: jest.fn(), onOpenMenu: jest.fn(), onAddToQueue: jest.fn(), onAddToPlaylist: jest.fn(), onToggleFavorite: jest.fn() };
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<SwipeableTrackRow track={track} isLiked {...callbacks} />); });
    for (const [label, callback, symbol] of [
      ['Queue', 'onAddToQueue', 'queue_music-symbol'],
      ['Playlist', 'onAddToPlaylist', 'playlist_add-symbol'],
      ['Liked', 'onToggleFavorite', 'favorite-symbol'],
    ]) {
      const button = byText(label);
      expect(button.findAllByType('ExpoUiIcon').map((node) => node.props.name)).toEqual([symbol]);
      await ReactTestRenderer.act(() => button.props.onPress());
      expect(callbacks[callback]).toHaveBeenCalledWith(track);
    }
    const menu = renderer.root.findAllByType(TouchableOpacity).find((node) => node.props.accessibilityLabel === 'More options for Song');
    expect(menu).toBeDefined();
    await ReactTestRenderer.act(() => menu.props.onPress());
    expect(callbacks.onOpenMenu).toHaveBeenCalledWith(track);
    expect(callbacks.onPress).not.toHaveBeenCalled();
  });

  it.each([
    [false, false, 'Play Song by Artist'],
    [true, false, 'Play Song by Artist, liked'],
    [false, true, 'Play Song by Artist'],
    [true, true, 'Play Song by Artist, liked'],
  ])('announces liked=%s and selected=%s on the foreground playback action', async (isLiked, isSelected, label) => {
    const onPress = jest.fn();
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(
      <SwipeableTrackRow track={track} isLiked={isLiked} isSelected={isSelected} onPress={onPress} />
    ); });
    const row = byText('Song');
    expect(row.props.accessibilityLabel).toBe(label);
    expect(row.props.accessibilityRole).toBe('button');
    expect(row.props.accessibilityState).toEqual({ selected: isSelected });
    await ReactTestRenderer.act(() => row.props.onPress());
    expect(onPress).toHaveBeenCalledWith(track);
  });
});
