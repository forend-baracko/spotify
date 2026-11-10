import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 20, left: 0, right: 0 }) }));
jest.mock('../src/services/audioPlayer', () => ({ __esModule: true, default: { playPlaylist: jest.fn(), setQueueForTrack: jest.fn(), playTrack: jest.fn() } }));
require('../test-utils/expoIcons');
const PlaylistDetailModal = require('../src/components/playlists/PlaylistDetailModal').default;
const first = { id: 'one', title: 'First song', artist: 'First artist' };
const second = { id: 'two', title: 'Second song', artist: 'Second artist' };
const emptyPlaylist = { id: 'playlist-1', title: 'Road trip', tracks: [] };

describe('reference-based playlist detail layout', () => {
  let renderer;
  const button = (label) => renderer.root.findAllByType(TouchableOpacity).find((node) => node.props.accessibilityLabel === label);
  const render = async (props) => ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<PlaylistDetailModal visible playlist={emptyPlaylist} onClose={jest.fn()} availableTracks={[first, second]} {...props} />); });
  afterEach(async () => {
    if (renderer) await ReactTestRenderer.act(() => renderer.unmount());
    renderer = null;
  });

  it('uses real catalog suggestions and adds the exact track to this playlist, not playback', async () => {
    const onAddSuggestedTrack = jest.fn().mockResolvedValue(true);
    const onPlayTrack = jest.fn();
    await render({ onAddSuggestedTrack, onPlayTrack });
    expect(button('Add First song to this playlist')).toBeDefined();
    await ReactTestRenderer.act(async () => button('Add First song to this playlist').props.onPress());
    expect(onAddSuggestedTrack).toHaveBeenCalledWith('playlist-1', first);
    expect(onPlayTrack).not.toHaveBeenCalled();
    expect(renderer.root.findAllByType(Text).some((node) => node.props.children === 'From your music catalog')).toBe(true);
  });

  it('excludes already-added tracks instead of showing inert plus buttons', async () => {
    await render({ playlist: { ...emptyPlaylist, tracks: [first] }, onAddSuggestedTrack: jest.fn() });
    expect(button('Add First song to this playlist')).toBeUndefined();
    expect(button('Add Second song to this playlist')).toBeDefined();
  });

  it('blocks repeated adds while pending and makes a failed add retryable', async () => {
    let fail;
    const onAddSuggestedTrack = jest.fn(() => new Promise((resolve, reject) => { fail = reject; }));
    await render({ onAddSuggestedTrack });
    expect(button('Add First song to this playlist')).toBeDefined();
    let task;
    await ReactTestRenderer.act(() => { task = button('Add First song to this playlist').props.onPress(); });
    expect(button('Add First song to this playlist').props.disabled).toBe(true);
    expect(button('Add Second song to this playlist').props.disabled).toBe(true);
    await ReactTestRenderer.act(async () => { fail(new Error('offline')); await task; });
    expect(button('Add First song to this playlist').props.disabled).toBe(false);
    expect(renderer.root.findAllByType(Text).some((node) => node.props.children === 'Could not add song. Try again.')).toBe(true);
    expect(onAddSuggestedTrack).toHaveBeenCalledTimes(1);
  });

  it('does not carry a pending add or its late failure across playlists', async () => {
    let rejectFirst;
    let finishSecond;
    const onAddSuggestedTrack = jest.fn()
      .mockImplementationOnce(() => new Promise((resolve, reject) => { rejectFirst = reject; }))
      .mockImplementationOnce(() => new Promise((resolve) => { finishSecond = resolve; }));
    await render({ onAddSuggestedTrack });
    let firstTask;
    await ReactTestRenderer.act(() => { firstTask = button('Add First song to this playlist').props.onPress(); });
    await ReactTestRenderer.act(() => renderer.update(<PlaylistDetailModal visible playlist={{ ...emptyPlaylist, id: 'playlist-2' }} onClose={jest.fn()} availableTracks={[first, second]} onAddSuggestedTrack={onAddSuggestedTrack} />));
    expect(button('Add First song to this playlist').props.disabled).toBe(false);
    let secondTask;
    await ReactTestRenderer.act(() => { secondTask = button('Add Second song to this playlist').props.onPress(); });
    await ReactTestRenderer.act(async () => { rejectFirst(new Error('offline')); await firstTask; });
    expect(button('Add Second song to this playlist').props.disabled).toBe(true);
    expect(renderer.root.findAllByType(Text).some((node) => node.props.children === 'Could not add song. Try again.')).toBe(false);
    await ReactTestRenderer.act(async () => { finishSecond(true); await secondTask; });
    expect(button('Add Second song to this playlist').props.disabled).toBe(false);
    expect(onAddSuggestedTrack).toHaveBeenNthCalledWith(1, 'playlist-1', first);
    expect(onAddSuggestedTrack).toHaveBeenNthCalledWith(2, 'playlist-2', second);
  });

  it('does not render pretend recommendation actions without a catalog or add capability', async () => {
    await render({ availableTracks: [], onAddSuggestedTrack: undefined });
    expect(button('Add First song to this playlist')).toBeUndefined();
    expect(renderer.root.findAllByType(Text).some((node) => node.props.children === 'This playlist is empty')).toBe(true);
  });
});
