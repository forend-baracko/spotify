import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text, TextInput, TouchableOpacity } from 'react-native';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
require('../test-utils/expoIcons');
const CreatePlaylistModal = require('../src/components/playlists/CreatePlaylistModal').default;
const AddToPlaylistModal = require('../src/components/playlists/AddToPlaylistModal').default;
const ProfileDetailsModal = require('../src/components/profile/ProfileDetailsModal').default;
const track = { id: 'song-1', title: 'Song', artist: 'Artist' };

describe('approved native secondary button flows', () => {
  let renderer;
  const render = async (element) => {
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(element); });
  };
  const nativeButton = (label) => renderer.root.findAllByType('ExpoUiButton').find((button) => button.props.label === label);
  const textButton = (label) => renderer.root.findAllByType(TouchableOpacity).find((button) =>
    button.findAllByType(Text).some((text) => text.props.children === label));
  const openUsernameEditor = async (onSaveUsername = jest.fn()) => {
    await render(<ProfileDetailsModal visible onClose={jest.fn()} user={{ email: 'listener@example.com' }} userProfile={{ username: 'listener' }} onSaveUsername={onSaveUsername} />);
    await ReactTestRenderer.act(() => textButton('Change username').props.onPress());
    await ReactTestRenderer.act(() => renderer.root.findByType(TextInput).props.onChangeText('changed_listener'));
  };
  afterEach(async () => {
    if (renderer) await ReactTestRenderer.act(() => renderer.unmount());
    renderer = null;
  });

  it('cancels playlist creation without submitting or rewriting the existing draft', async () => {
    const onClose = jest.fn();
    const onCreate = jest.fn();
    await render(<CreatePlaylistModal visible onClose={onClose} onCreate={onCreate} />);
    await ReactTestRenderer.act(() => renderer.root.findAllByType(TextInput)[0].props.onChangeText('Road trip'));
    // The screenshot-pinned naming layout replaces bottom Cancel with a top Close.
    const cancel = renderer.root.findAllByType(TouchableOpacity).find((button) => button.props.accessibilityLabel === 'Close playlist creation');
    expect(cancel).toBeDefined();
    expect(cancel.findByType('ExpoUiIcon').props.name).toBe('close-symbol');
    await ReactTestRenderer.act(() => cancel.props.onPress());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCreate).not.toHaveBeenCalled();
    expect(renderer.root.findAllByType(TextInput)[0].props.value).toBe('Road trip');
  });

  it('keeps Done a dismissal, never an add or create operation', async () => {
    const onClose = jest.fn();
    const onSelectPlaylist = jest.fn();
    const onCreatePlaylist = jest.fn();
    await render(<AddToPlaylistModal visible track={track} onClose={onClose} onSelectPlaylist={onSelectPlaylist} onCreatePlaylist={onCreatePlaylist} />);
    const done = nativeButton('Done');
    expect(done).toBeDefined();
    expect(done.props.variant).toBe('outlined');
    await ReactTestRenderer.act(() => done.props.onPress());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelectPlaylist).not.toHaveBeenCalled();
    expect(onCreatePlaylist).not.toHaveBeenCalled();
  });

  it('cancels username editing and restores the original username without saving', async () => {
    const onSaveUsername = jest.fn();
    await openUsernameEditor(onSaveUsername);
    const cancel = nativeButton('Cancel');
    expect(cancel).toBeDefined();
    await ReactTestRenderer.act(() => cancel.props.onPress());
    expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
    expect(onSaveUsername).not.toHaveBeenCalled();
    await ReactTestRenderer.act(() => textButton('Change username').props.onPress());
    expect(renderer.root.findByType(TextInput).props.value).toBe('listener');
  });

  it('keeps Cancel disabled while the original username save is pending', async () => {
    let finishSave;
    const onSaveUsername = jest.fn(() => new Promise((resolve) => { finishSave = resolve; }));
    await openUsernameEditor(onSaveUsername);
    let saveTask;
    await ReactTestRenderer.act(() => { saveTask = nativeButton('Save username').props.onPress(); });
    const cancel = nativeButton('Cancel');
    expect(cancel).toBeDefined();
    expect(cancel.props.disabled).toBe(true);
    expect(cancel.props.onPress).toBeUndefined();
    expect(renderer.root.findByType(TextInput).props.value).toBe('changed_listener');
    expect(onSaveUsername).toHaveBeenCalledWith('changed_listener', { requireFirestore: true });
    await ReactTestRenderer.act(async () => { finishSave(); await saveTask; });
    expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
  });
});
