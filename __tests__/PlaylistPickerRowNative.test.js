import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
require('../test-utils/expoIcons');
let PlaylistPickerRow;
try { PlaylistPickerRow = require('../src/components/playlists/PlaylistPickerRow.android').default; } catch (error) {
  if (!String(error.message).includes('Cannot find module')) throw error;
}
jest.doMock('../src/components/playlists/PlaylistPickerRow', () => jest.requireActual('../src/components/playlists/PlaylistPickerRow.android'));
const AddToPlaylistModal = require('../src/components/playlists/AddToPlaylistModal').default;

describe('Android playlist picker row', () => {
  let renderer;
  afterEach(async () => { if (renderer) await ReactTestRenderer.act(() => renderer.unmount()); renderer = null; });
  it('uses the native list item and keeps an already-added row actionable', async () => {
    expect(PlaylistPickerRow).toBeDefined();
    const playlist = { id: 'one', title: 'Road trip', icon: '🔥', tracks: [{ id: 'song' }] };
    const onPress = jest.fn();
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<PlaylistPickerRow playlist={playlist} alreadyAdded onPress={onPress} />); });
    const list = renderer.root.findByType('ExpoDrawerListItem');
    let parent = list.parent;
    while (parent && parent.props.importantForAccessibility !== 'no-hide-descendants') parent = parent.parent;
    expect(parent).toBeTruthy();
    const button = renderer.root.findByType(TouchableOpacity);
    expect(button.props.accessibilityLabel).toContain('Road trip');
    expect(button.props.accessibilityLabel).toContain('already added');
    await ReactTestRenderer.act(() => button.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  it('shows the count and add state for a new playlist', async () => {
    if (!PlaylistPickerRow) return;
    const playlist = { id: 'two', title: 'Quiet', tracks: [] };
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<PlaylistPickerRow playlist={playlist} alreadyAdded={false} onPress={jest.fn()} />); });
    expect(renderer.root.findAllByType('ExpoUiText').map((text) => text.props.children)).toContain('0 songs');
    expect(renderer.root.findByType(TouchableOpacity).props.accessibilityLabel).toContain('Add to Quiet');
  });
  it('passes the selected playlist ID and current track through the picker', async () => {
    const track = { id: 'song', title: 'Song', artist: 'Artist' };
    const onSelectPlaylist = jest.fn();
    const onClose = jest.fn();
    const playlists = [{ id: 'one', title: 'Saved', tracks: [track] }, { id: 'two', title: 'New', tracks: [] }];
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<AddToPlaylistModal visible track={track} playlists={playlists} onClose={onClose} onSelectPlaylist={onSelectPlaylist} />); });
    const buttons = renderer.root.findAllByType(TouchableOpacity);
    expect(buttons.some((button) => button.props.accessibilityLabel?.includes('Saved, 1 song, already added'))).toBe(true);
    const target = buttons.find((button) => button.props.accessibilityLabel?.startsWith('Add to New,'));
    expect(target).toBeTruthy();
    await ReactTestRenderer.act(() => target.props.onPress());
    expect(onSelectPlaylist).toHaveBeenCalledWith('two', track);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
