import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Platform, TextInput } from 'react-native';
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
require('../test-utils/expoIcons');
const ProfileDetailsModal = require('../src/components/profile/ProfileDetailsModal').default;

describe('Android profile editing entry', () => {
  let renderer;
  let previous;
  beforeEach(() => { previous = Platform.OS; Platform.OS = 'android'; });
  afterEach(async () => { if (renderer) await ReactTestRenderer.act(() => renderer.unmount()); renderer = null; Platform.OS = previous; });
  const nativeButton = (label) => renderer.root.findAllByType('ExpoUiButton').find((node) => node.props.label === label);


  it('uses the approved native outlined button and retains draft/cancel behavior', async () => {
    const onSaveUsername = jest.fn();
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<ProfileDetailsModal visible onClose={jest.fn()} userProfile={{ username: 'listener' }} onSaveUsername={onSaveUsername} />); });
    const edit = nativeButton('Change username');
    expect(edit).toBeDefined();
    expect(edit.props.variant).toBe('outlined');
    await ReactTestRenderer.act(() => edit.props.onPress());
    const input = renderer.root.findByType(TextInput);
    expect(input.props.value).toBe('listener');
    await ReactTestRenderer.act(() => input.props.onChangeText('new_listener'));
    await ReactTestRenderer.act(() => nativeButton('Cancel').props.onPress());
    expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
    expect(onSaveUsername).not.toHaveBeenCalled();
  });
  it('serializes same-frame saves and prevents editing the pending draft', async () => {
    let finish;
    const save = jest.fn(() => new Promise((resolve) => { finish = resolve; }));
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<ProfileDetailsModal visible onClose={jest.fn()} userProfile={{ username: 'listener' }} onSaveUsername={save} />); });
    await ReactTestRenderer.act(() => nativeButton('Change username').props.onPress());
    await ReactTestRenderer.act(() => renderer.root.findByType(TextInput).props.onChangeText('new_listener'));
    const press = nativeButton('Save username').props.onPress;
    let first;
    await ReactTestRenderer.act(() => { first = press(); press(); });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('new_listener', { requireFirestore: true });
    expect(renderer.root.findByType(TextInput).props.editable).toBe(false);
    await ReactTestRenderer.act(async () => { finish(); await first; });
    expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
  });
  it('reenables the same draft for retry when saving fails', async () => {
    const save = jest.fn().mockRejectedValueOnce(new Error('Username unavailable')).mockResolvedValueOnce(undefined);
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<ProfileDetailsModal visible onClose={jest.fn()} userProfile={{ username: 'listener' }} onSaveUsername={save} />); });
    await ReactTestRenderer.act(() => nativeButton('Change username').props.onPress());
    await ReactTestRenderer.act(() => renderer.root.findByType(TextInput).props.onChangeText('new_listener'));
    await ReactTestRenderer.act(async () => nativeButton('Save username').props.onPress());
    expect(renderer.root.findByType(TextInput).props.value).toBe('new_listener');
    expect(renderer.root.findByType(TextInput).props.editable).toBe(true);
    await ReactTestRenderer.act(async () => nativeButton('Save username').props.onPress());
    expect(save).toHaveBeenCalledTimes(2);
    expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
  });
});
