import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Platform, TouchableOpacity } from 'react-native';
require('../test-utils/expoIcons');
const mockCreate = jest.fn();
jest.mock('../src/context/MusicContext', () => ({ useMusic: () => ({ createPlaylist: mockCreate }) }));
jest.mock('../src/components/playlists/CreatePlaylistModal', () => (props) => require('react').createElement('CreatePlaylistProbe', props));
let Card;
try { Card = require('../src/components/playlists/CreatePlaylistCard.android').default; } catch (error) {
  if (!String(error.message).includes('Cannot find module')) throw error;
}
jest.doMock('../src/components/playlists/CreatePlaylistCard', () => jest.requireActual('../src/components/playlists/CreatePlaylistCard.android'));
let CreateView;
try { CreateView = require('../src/components/playlists/LibraryAndCreateViews').CreateView; } catch (error) {
  if (!String(error.message).includes('Cannot find module')) throw error;
}

describe('Android Create playlist card', () => {
  let renderer;
  let originalPlatform;
  beforeEach(() => { originalPlatform = Platform.OS; Platform.OS = 'android'; });
  afterEach(async () => { if (renderer) await ReactTestRenderer.act(() => renderer.unmount()); renderer = null; Platform.OS = originalPlatform; jest.clearAllMocks(); mockCreate.mockReset(); });
  it('uses an accessible native Expo card and opens the creation flow', async () => {
    expect(Card).toBeDefined();
    const onPress = jest.fn();
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<Card onPress={onPress} />); });
    const list = renderer.root.findByType('ExpoDrawerListItem');
    let parent = list.parent;
    while (parent && parent.props.importantForAccessibility !== 'no-hide-descendants') parent = parent.parent;
    expect(parent).toBeTruthy();
    const action = renderer.root.findByType(TouchableOpacity);
    expect(action.props.accessibilityRole).toBe('button');
    expect(action.props.accessibilityLabel).toBe('Create playlist');
    await ReactTestRenderer.act(() => action.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  it('opens the existing modal and forwards creation to the selected playlist', async () => {
    if (!Card || !CreateView) return;
    const onOpenPlaylist = jest.fn();
    const userProfile = { uid: 'test' };
    const playlist = { id: 'new', title: 'Road trip' };
    mockCreate.mockResolvedValueOnce(playlist);
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<CreateView userProfile={userProfile} onOpenPlaylist={onOpenPlaylist} />); });
    const action = renderer.root.findAllByType(TouchableOpacity).find((button) => button.props.accessibilityLabel === 'Create playlist');
    await ReactTestRenderer.act(() => action.props.onPress());
    const modal = renderer.root.findByType('CreatePlaylistProbe');
    expect(modal.props.visible).toBe(true);
    expect(modal.props.userProfile).toBe(userProfile);
    const data = { title: 'Road trip', icon: '🎶' };
    await ReactTestRenderer.act(async () => { await modal.props.onCreate(data); });
    expect(mockCreate).toHaveBeenCalledWith(data);
    expect(onOpenPlaylist).toHaveBeenCalledWith(playlist);
  });
  it('treats a null creation result as an error instead of navigating away', async () => {
    if (!Card || !CreateView) return;
    const onOpenPlaylist = jest.fn();
    const onSwitchToLibrary = jest.fn();
    mockCreate.mockResolvedValueOnce(null);
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<CreateView onOpenPlaylist={onOpenPlaylist} onSwitchToLibrary={onSwitchToLibrary} />); });
    const modal = renderer.root.findByType('CreatePlaylistProbe');
    await expect(modal.props.onCreate({ title: 'Road trip' })).rejects.toThrow();
    expect(onOpenPlaylist).not.toHaveBeenCalled();
    expect(onSwitchToLibrary).not.toHaveBeenCalled();
  });
  it('does not navigate to a late-created playlist after the modal was closed and reopened', async () => {
    let resolve;
    mockCreate.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const onOpenPlaylist = jest.fn();
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<CreateView onOpenPlaylist={onOpenPlaylist} />); });
    const action = renderer.root.findAllByType(TouchableOpacity).find((button) => button.props.accessibilityLabel === 'Create playlist');
    await ReactTestRenderer.act(() => action.props.onPress());
    let task;
    await ReactTestRenderer.act(() => { task = renderer.root.findByType('CreatePlaylistProbe').props.onCreate({ title: 'Old draft' }); });
    await ReactTestRenderer.act(() => renderer.root.findByType('CreatePlaylistProbe').props.onClose());
    await ReactTestRenderer.act(() => action.props.onPress());
    await ReactTestRenderer.act(async () => { resolve({ id: 'old', title: 'Old draft' }); await task; });
    expect(onOpenPlaylist).not.toHaveBeenCalled();
    expect(renderer.root.findByType('CreatePlaylistProbe').props.visible).toBe(true);
  });
});
