import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';
require('../test-utils/expoIcons');
const LibraryPlaylistRow = require('../src/components/playlists/LibraryPlaylistRow.android').default;

describe('Android library playlist row', () => {
  let renderer;
  afterEach(async () => { if (renderer) await ReactTestRenderer.act(() => renderer.unmount()); renderer = null; });
  it('uses a native Expo list item, hides its decorative subtree, and opens the same playlist', async () => {
    const playlist = { id: 'one', title: 'Road trip', type: 'Playlist', icon: '🎵', tracks: [{ id: 'track' }] };
    const onOpen = jest.fn();
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<LibraryPlaylistRow playlist={playlist} onPress={onOpen} />); });
    const row = renderer.root.findByType('ExpoDrawerListItem');
    let ancestor = row.parent;
    while (ancestor && ancestor.props.importantForAccessibility !== 'no-hide-descendants') ancestor = ancestor.parent;
    expect(ancestor).toBeTruthy();
    expect(renderer.root.findAllByType('ExpoUiText').map((item) => item.props.children)).toEqual(expect.arrayContaining(['Road trip', 'Playlist • 1 song']));
    expect(renderer.root.findAllByType('ExpoUiText').map((item) => item.props.numberOfLines)).toEqual([2, 2]);
    const button = renderer.root.findByType(TouchableOpacity);
    expect(button.props.accessibilityLabel).toContain('Road trip');
    await ReactTestRenderer.act(() => button.props.onPress());
    expect(onOpen).toHaveBeenCalledWith(playlist);
  });
  it('handles empty and multiple-song playlists', async () => {
    const playlist = { id: 'two', title: 'Empty', type: 'Playlist', tracks: [] };
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<LibraryPlaylistRow playlist={playlist} />); });
    expect(renderer.root.findAllByType('ExpoUiText').map((item) => item.props.children)).toContain('Playlist • 0 songs');
    await ReactTestRenderer.act(() => renderer.update(<LibraryPlaylistRow playlist={{ ...playlist, tracks: [{ id: 'a' }, { id: 'b' }] }} />));
    expect(renderer.root.findAllByType('ExpoUiText').map((item) => item.props.children)).toContain('Playlist • 2 songs');
    await ReactTestRenderer.act(() => renderer.update(<LibraryPlaylistRow playlist={{ id: 'three', title: 'No type' }} />));
    expect(renderer.root.findAllByType('ExpoUiText').map((item) => item.props.children)).toContain('0 songs');
  });
  it('preserves readable playlist details on a narrow large-text screen', async () => {
    const ReactNative = require('react-native');
    const dimensions = jest.spyOn(ReactNative, 'useWindowDimensions').mockReturnValue({ width: 320, height: 686, scale: 2.625, fontScale: 1.3 });
    try {
      await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<LibraryPlaylistRow playlist={{ id: 'a', title: 'Late Night Chill', type: 'Playlist • You', tracks: [{}, {}] }} />); });
      const labels = renderer.root.findAllByType('ExpoUiText');
      expect(labels[0].props.textStyle.fontSize).toBe(13);
      expect(labels[1].props.textStyle.fontSize).toBe(10);
    } finally { dimensions.mockRestore(); }
  });
});
