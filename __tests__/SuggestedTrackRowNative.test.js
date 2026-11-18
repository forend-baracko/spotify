import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../src/services/audioPlayer', () => ({ __esModule: true, default: { playPlaylist: jest.fn(), setQueueForTrack: jest.fn(), playTrack: jest.fn() } }));
require('../test-utils/expoIcons');
let SuggestedTrackRow;
try { SuggestedTrackRow = require('../src/components/playlists/SuggestedTrackRow.android').default; } catch (error) { if (!String(error.message).includes('Cannot find module')) throw error; }
jest.doMock('../src/components/playlists/SuggestedTrackRow', () => jest.requireActual('../src/components/playlists/SuggestedTrackRow.android'));
let PlaylistDetailModal;
try { PlaylistDetailModal = require('../src/components/playlists/PlaylistDetailModal').default; } catch (error) { if (!String(error.message).includes('Cannot find module')) throw error; }
const track = { id: 'song', title: 'Selected song', artist: 'Artist' };

describe('Android suggested song row', () => {
  let renderer;
  afterEach(async () => { if (renderer) await ReactTestRenderer.act(() => renderer.unmount()); renderer = null; });
  it('uses a native Expo list item with a separately named add button', async () => {
    expect(SuggestedTrackRow).toBeDefined();
    const onPress = jest.fn();
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<SuggestedTrackRow track={track} onPress={onPress} />); });
    const list = renderer.root.findByType('ExpoDrawerListItem');
    let parent = list.parent;
    while (parent && parent.props.importantForAccessibility !== 'no-hide-descendants') parent = parent.parent;
    expect(parent).toBeTruthy();
    const add = renderer.root.findByType(TouchableOpacity);
    expect(add.props.accessibilityLabel).toBe('Add Selected song by Artist to this playlist');
    await ReactTestRenderer.act(() => add.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  it('preserves disabled and busy state while an add is pending', async () => {
    if (!SuggestedTrackRow) return;
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<SuggestedTrackRow track={track} disabled busy onPress={undefined} />); });
    const add = renderer.root.findByType(TouchableOpacity);
    expect(add.props.disabled).toBe(true);
    expect(add.props.accessibilityState).toEqual({ disabled: true, busy: true });
    expect(add.props.onPress).toBeUndefined();
  });
  it('adds the exact track to the current playlist through the real modal', async () => {
    if (!SuggestedTrackRow || !PlaylistDetailModal) return;
    const add = jest.fn().mockResolvedValue(true);
    const playlist = { id: 'playlist', title: 'Playlist', tracks: [] };
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<PlaylistDetailModal visible playlist={playlist} onClose={jest.fn()} availableTracks={[track]} onAddSuggestedTrack={add} />); });
    const button = renderer.root.findAllByType(TouchableOpacity).find((node) => node.props.accessibilityLabel === 'Add Selected song by Artist to this playlist');
    await ReactTestRenderer.act(async () => { await button.props.onPress(); });
    expect(add).toHaveBeenCalledWith('playlist', track);
  });
  it('distinguishes tracks with matching titles by their artist', async () => {
    const add = jest.fn().mockResolvedValue(true);
    const sameTitle = { id: 'other', title: track.title, artist: 'Another artist' };
    const playlist = { id: 'playlist', title: 'Playlist', tracks: [] };
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<PlaylistDetailModal visible playlist={playlist} onClose={jest.fn()} availableTracks={[track, sameTitle]} onAddSuggestedTrack={add} />); });
    const labels = renderer.root.findAllByType(TouchableOpacity).map((node) => node.props.accessibilityLabel);
    expect(labels).toContain('Add Selected song by Artist to this playlist');
    expect(labels).toContain('Add Selected song by Another artist to this playlist');
  });
});
