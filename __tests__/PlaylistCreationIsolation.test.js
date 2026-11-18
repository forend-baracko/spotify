import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Platform, Text, TextInput, TouchableOpacity } from 'react-native';
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
require('../test-utils/expoIcons');
const CreatePlaylistModal = require('../src/components/playlists/CreatePlaylistModal').default;

describe('playlist creation request isolation', () => {
  let renderer;
  let originalPlatform;
  beforeEach(() => { originalPlatform = Platform.OS; Platform.OS = 'android'; });
  afterEach(async () => { if (renderer) await ReactTestRenderer.act(() => renderer.unmount()); renderer = null; Platform.OS = originalPlatform; });
  const input = () => renderer.root.findByType(TextInput);
  const button = () => renderer.root.findByType('ExpoComposeButton');
  const close = () => renderer.root.findAllByType(TouchableOpacity).find((node) => node.props.accessibilityLabel === 'Close playlist creation');
  it('does not let a late creation clear or close a reopened draft', async () => {
    let resolve;
    const onCreate = jest.fn(() => new Promise((done) => { resolve = done; }));
    const onClose = jest.fn();
    const render = (visible) => <CreatePlaylistModal visible={visible} onClose={onClose} onCreate={onCreate} />;
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(render(true)); });
    await ReactTestRenderer.act(() => input().props.onChangeText('Old draft'));
    let task;
    await ReactTestRenderer.act(() => { task = button().props.onClick(); });
    await ReactTestRenderer.act(() => close().props.onPress());
    await ReactTestRenderer.act(() => renderer.update(render(false)));
    await ReactTestRenderer.act(() => renderer.update(render(true)));
    await ReactTestRenderer.act(() => input().props.onChangeText('New draft'));
    expect(button().props.enabled).toBe(false);
    await ReactTestRenderer.act(async () => { resolve({ id: 'old' }); await task; });
    expect(button().props.enabled).toBe(true);
    expect(input().props.value).toBe('New draft');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('clears an old error when the draft is dismissed and reopened', async () => {
    const onCreate = jest.fn().mockRejectedValue(new Error('offline'));
    const onClose = jest.fn();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const render = (visible) => <CreatePlaylistModal visible={visible} onClose={onClose} onCreate={onCreate} />;
      await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(render(true)); });
      await ReactTestRenderer.act(() => input().props.onChangeText('Draft'));
      await ReactTestRenderer.act(async () => { await button().props.onClick(); });
      expect(renderer.root.findAllByType(Text).some((node) => node.props.accessibilityRole === 'alert')).toBe(true);
      await ReactTestRenderer.act(() => close().props.onPress());
      await ReactTestRenderer.act(() => renderer.update(render(false)));
      await ReactTestRenderer.act(() => renderer.update(render(true)));
      expect(input().props.value).toBe('Draft');
      expect(renderer.root.findAllByType(Text).some((node) => node.props.accessibilityRole === 'alert')).toBe(false);
    } finally { warn.mockRestore(); }
  });
  it('starts only one creation when the same submit handler fires twice', async () => {
    let resolve;
    const onCreate = jest.fn(() => new Promise((done) => { resolve = done; }));
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<CreatePlaylistModal visible onClose={jest.fn()} onCreate={onCreate} />); });
    await ReactTestRenderer.act(() => input().props.onChangeText('Draft'));
    const submit = button().props.onClick;
    let firstTask;
    await ReactTestRenderer.act(() => { firstTask = submit(); submit(); });
    expect(onCreate).toHaveBeenCalledTimes(1);
    await ReactTestRenderer.act(async () => { resolve({ id: 'new' }); await firstTask; });
  });
});
