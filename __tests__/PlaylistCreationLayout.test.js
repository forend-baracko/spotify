import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Modal, TextInput, TouchableOpacity } from 'react-native';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 20, left: 0, right: 0 }) }));
require('../test-utils/expoIcons');
const CreatePlaylistModal = require('../src/components/playlists/CreatePlaylistModal').default;

describe('reference-based Android playlist naming', () => {
  let renderer;
  const button = (label) => renderer.root.findAllByType(TouchableOpacity).find((node) => node.props.accessibilityLabel === label);
  afterEach(async () => {
    if (renderer) await ReactTestRenderer.act(() => renderer.unmount());
    renderer = null;
  });

  it('replaces the bottom Cancel with a named top close action without submitting or losing the draft', async () => {
    const onClose = jest.fn();
    const onCreate = jest.fn();
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<CreatePlaylistModal visible onClose={onClose} onCreate={onCreate} />); });
    const input = renderer.root.findAllByType(TextInput)[0];
    expect(input.props.accessibilityLabel).toBe('Playlist name');
    await ReactTestRenderer.act(() => input.props.onChangeText('Road trip'));
    expect(button('Close playlist creation')).toBeDefined();
    await ReactTestRenderer.act(() => button('Close playlist creation').props.onPress());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCreate).not.toHaveBeenCalled();
    expect(renderer.root.findAllByType(TextInput)[0].props.value).toBe('Road trip');
  });

  it('focuses the real name input after the native modal opens', async () => {
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<CreatePlaylistModal visible onClose={jest.fn()} onCreate={jest.fn()} />); });
    // RN's preset owns the TextInput instance and its focus mock; createNodeMock cannot replace it.
    const focus = renderer.root.findByType(TextInput).instance.focus;
    focus.mockClear();
    const modal = renderer.root.findByType(Modal);
    expect(modal.props.onShow).toEqual(expect.any(Function));
    await ReactTestRenderer.act(() => modal.props.onShow());
    expect(focus).toHaveBeenCalled();
  });

  it('keeps optional description and stored emoji available without crowding the naming screen', async () => {
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<CreatePlaylistModal visible onClose={jest.fn()} onCreate={jest.fn()} />); });
    expect(renderer.root.findAllByType(TextInput)).toHaveLength(1);
    expect(button('More playlist options')).toBeDefined();
    expect(button('More playlist options').props.accessibilityState).toEqual({ expanded: false });
    await ReactTestRenderer.act(() => button('More playlist options').props.onPress());
    expect(renderer.root.findAllByType(TextInput)).toHaveLength(2);
    const description = renderer.root.findAllByType(TextInput)[1];
    expect(description.props.accessibilityLabel).toBe('Playlist description');
    await ReactTestRenderer.act(() => description.props.onChangeText('Evening music'));
    expect(button('Use 🔥 as playlist icon')).toBeDefined();
    await ReactTestRenderer.act(() => button('Use 🔥 as playlist icon').props.onPress());
    expect(button('Use 🔥 as playlist icon').props.accessibilityState).toEqual({ selected: true });
    expect(description.props.value).toBe('Evening music');
  });
});
