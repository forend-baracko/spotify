import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Platform, Text, TouchableOpacity } from 'react-native';
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../src/components/playlists/CreatePlaylistModal', () => (props) => require('react').createElement('CreatePlaylistProbe', props));
require('../test-utils/expoIcons');
const AddToPlaylistModal = require('../src/components/playlists/AddToPlaylistModal').default;
const track = { id: 'song', title: 'Song', artist: 'Artist' };

describe('playlist picker creation isolation', () => {
  let renderer;
  let originalPlatform;
  beforeEach(() => { originalPlatform = Platform.OS; Platform.OS = 'android'; });
  afterEach(async () => { if (renderer) await ReactTestRenderer.act(() => renderer.unmount()); renderer = null; Platform.OS = originalPlatform; });
  const openCreate = async () => {
    const button = renderer.root.findAllByType(TouchableOpacity).find((node) => node.findAllByType(Text).some((text) => text.props.children === 'New playlist'));
    await ReactTestRenderer.act(() => button.props.onPress());
  };
  it('keeps a reopened picker open if an older creation resolves', async () => {
    let resolve;
    const onCreatePlaylist = jest.fn(() => new Promise((done) => { resolve = done; }));
    const onClose = jest.fn();
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<AddToPlaylistModal visible track={track} onClose={onClose} onCreatePlaylist={onCreatePlaylist} />); });
    await openCreate();
    let task;
    await ReactTestRenderer.act(() => { task = renderer.root.findByType('CreatePlaylistProbe').props.onCreate({ title: 'Old' }); });
    await ReactTestRenderer.act(() => renderer.root.findByType('CreatePlaylistProbe').props.onClose());
    await openCreate();
    await ReactTestRenderer.act(async () => { resolve({ id: 'old' }); await task; });
    expect(onCreatePlaylist).toHaveBeenCalledWith({ title: 'Old', initialTrack: track });
    expect(onClose).not.toHaveBeenCalled();
    expect(renderer.root.findByType('CreatePlaylistProbe').props.visible).toBe(true);
  });
  it('closes the picker after the current creation succeeds', async () => {
    const onCreatePlaylist = jest.fn().mockResolvedValue({ id: 'new' });
    const onClose = jest.fn();
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<AddToPlaylistModal visible track={track} onClose={onClose} onCreatePlaylist={onCreatePlaylist} />); });
    await openCreate();
    await ReactTestRenderer.act(async () => { await renderer.root.findByType('CreatePlaylistProbe').props.onCreate({ title: 'New' }); });
    expect(onCreatePlaylist).toHaveBeenCalledWith({ title: 'New', initialTrack: track });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
