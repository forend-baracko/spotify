import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text, TextInput } from 'react-native';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

require('../test-utils/expoIcons');
const CreatePlaylistModal = require('../src/components/playlists/CreatePlaylistModal').default;

describe('native primary Create sample', () => {
  let renderer;
  const render = async (onCreate, onClose = jest.fn()) => {
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<CreatePlaylistModal visible onClose={onClose} onCreate={onCreate} />); });
  };
  const create = () => renderer.root.findAllByType('ExpoComposeButton').find((button) => button.findAllByType('ExpoUiText').some((text) => text.props.children.startsWith('Create')));
  const label = () => create().findByType('ExpoUiText').props.children;
  const setTitle = async (value) => {
    await ReactTestRenderer.act(() => renderer.root.findAllByType(TextInput)[0].props.onChangeText(value));
  };
  afterEach(async () => {
    if (renderer) await ReactTestRenderer.act(() => renderer.unmount());
    renderer = null;
    jest.restoreAllMocks();
  });

  it('uses a filled native button and keeps blank-title validation', async () => {
    const onCreate = jest.fn();
    await render(onCreate);
    expect(create()).toBeDefined();
    expect(create().props.colors.containerColor).toBe('#1ED760');
    expect(create().findByType('ExpoUiText').props.textStyle).toEqual({ fontSize: 16, fontWeight: '700' });
    expect(label()).toBe('Create');
    expect(create().props.enabled).toBe(false);
    expect(create().props.onClick).toBeUndefined();
    await setTitle('   ');
    expect(create().props.enabled).toBe(false);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('keeps the original payload and blocks duplicate native taps while creating', async () => {
    let finish;
    const onCreate = jest.fn(() => new Promise((resolve) => { finish = resolve; }));
    const onClose = jest.fn();
    await render(onCreate, onClose);
    await setTitle('  Road trip  ');
    expect(create()).toBeDefined();
    let task;
    await ReactTestRenderer.act(() => { task = create().props.onClick(); });
    expect(create().props.enabled).toBe(false);
    expect(label()).toBe('Create…');
    expect(create().props.onClick).toBeUndefined();
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledWith({ title: 'Road trip', description: '', icon: '🎶', creator: null, cover: null });
    expect(onClose).not.toHaveBeenCalled();
    await ReactTestRenderer.act(async () => { finish(); await task; });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(renderer.root.findAllByType(TextInput)[0].props.value).toBe('');
  });

  it('retains error feedback and permits retry without closing on creation failure', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const onCreate = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);
    const onClose = jest.fn();
    await render(onCreate, onClose);
    await setTitle('Road trip');
    expect(create()).toBeDefined();
    await ReactTestRenderer.act(async () => create().props.onClick());
    expect(renderer.root.findAllByType(Text).some((text) => text.props.children === 'Could not create playlist. Please try again.')).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
    expect(create().props.enabled).toBe(true);
    expect(label()).toBe('Create');
    expect(renderer.root.findAllByType(TextInput)[0].props.value).toBe('Road trip');
    await ReactTestRenderer.act(async () => create().props.onClick());
    expect(onCreate).toHaveBeenCalledTimes(2);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
