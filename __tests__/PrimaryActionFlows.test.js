import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text, TextInput, TouchableOpacity } from 'react-native';

const mockUser = { uid: 'listener-1' };
const mockStatus = jest.fn();
const mockCreate = jest.fn();
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../src/services/geminiService', () => ({ getGeminiStatus: (...args) => mockStatus(...args), createGeminiDjSet: (...args) => mockCreate(...args) }));
require('../test-utils/expoIcons');
const ProfileDetailsModal = require('../src/components/profile/ProfileDetailsModal').default;
const GeminiDJ = require('../src/components/search/GeminiDJ').default;
const tracks = [{ id: 'song-1', title: 'First song', artist: 'Artist' }];

describe('next native primary actions', () => {
  let renderer;
  const nativeButton = (label) => renderer.root.findAllByType('ExpoUiButton').find((node) => node.props.label === label);
  const textButton = (label) => renderer.root.findAllByType(TouchableOpacity).find((node) => node.findAllByType(Text).some((text) => text.props.children === label));
  const hasText = (label) => renderer.root.findAllByType(Text).some((node) => node.props.children === label);
  const render = async (element) => ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(element);
    await Promise.resolve();
    await Promise.resolve();
  });
  const openProfile = async (onSaveUsername) => {
    await render(<ProfileDetailsModal visible userProfile={{ username: 'listener' }} onClose={jest.fn()} onSaveUsername={onSaveUsername} />);
    await ReactTestRenderer.act(() => textButton('Change username').props.onPress());
  };
  const typeUsername = async (value) => ReactTestRenderer.act(() => renderer.root.findByType(TextInput).props.onChangeText(value));
  beforeEach(() => {
    jest.clearAllMocks();
    mockStatus.mockResolvedValue({ configured: true, message: '' });
    mockCreate.mockReset();
  });
  afterEach(async () => {
    if (renderer) await ReactTestRenderer.act(() => renderer.unmount());
    renderer = null;
  });

  it('keeps username validation on the actual native Save action', async () => {
    const save = jest.fn();
    await openProfile(save);
    await typeUsername('ab');
    expect(nativeButton('Save username')).toBeDefined();
    await ReactTestRenderer.act(async () => nativeButton('Save username').props.onPress());
    expect(save).not.toHaveBeenCalled();
    expect(hasText('Use 3-30 letters, numbers, or underscores.')).toBe(true);
  });

  it('retains Firestore-required save and blocks Save and Cancel while pending', async () => {
    let finish;
    const save = jest.fn(() => new Promise((resolve) => { finish = resolve; }));
    await openProfile(save);
    await typeUsername('new_listener');
    expect(nativeButton('Save username')).toBeDefined();
    let task;
    await ReactTestRenderer.act(() => { task = nativeButton('Save username').props.onPress(); });
    const pending = nativeButton('Save username…');
    expect(pending.props.disabled).toBe(true);
    expect(pending.props.onPress).toBeUndefined();
    expect(nativeButton('Cancel').props.disabled).toBe(true);
    expect(save).toHaveBeenCalledWith('new_listener', { requireFirestore: true });
    await ReactTestRenderer.act(async () => { finish(); await task; });
    expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
  });

  it('retains a failed username draft and lets the same native action retry', async () => {
    const save = jest.fn().mockRejectedValueOnce(new Error('Username already taken')).mockResolvedValueOnce(undefined);
    await openProfile(save);
    await typeUsername('new_listener');
    expect(nativeButton('Save username')).toBeDefined();
    await ReactTestRenderer.act(async () => nativeButton('Save username').props.onPress());
    expect(hasText('Username already taken')).toBe(true);
    expect(renderer.root.findByType(TextInput).props.value).toBe('new_listener');
    expect(nativeButton('Save username').props.disabled).toBe(false);
    await ReactTestRenderer.act(async () => nativeButton('Save username').props.onPress());
    expect(save).toHaveBeenCalledTimes(2);
    expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
  });

  it('keeps empty-prompt validation without sending an AI request', async () => {
    await render(<GeminiDJ tracks={tracks} onStartSet={jest.fn()} />);
    expect(nativeButton('Pick my track')).toBeDefined();
    await ReactTestRenderer.act(async () => nativeButton('Pick my track').props.onPress());
    expect(hasText('Describe the vibe for your DJ set.')).toBe(true);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('keeps the DJ payload and prevents keyboard resubmission while a native pick is pending', async () => {
    let finish;
    mockCreate.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const start = jest.fn();
    await render(<GeminiDJ tracks={tracks} onStartSet={start} />);
    await ReactTestRenderer.act(() => renderer.root.findByType(TextInput).props.onChangeText('  quiet evening  '));
    expect(nativeButton('Pick my track')).toBeDefined();
    let task;
    await ReactTestRenderer.act(() => { task = nativeButton('Pick my track').props.onPress(); });
    expect(nativeButton('Pick my track…').props.disabled).toBe(true);
    expect(nativeButton('Pick my track…').props.onPress).toBeUndefined();
    expect(renderer.root.findByType(TextInput).props.onSubmitEditing).toBeUndefined();
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(mockUser, 'quiet evening', tracks);
    await ReactTestRenderer.act(async () => { finish({ title: 'Quiet evening', trackId: 'song-1' }); await task; });
    expect(nativeButton('Pick another track')).toBeDefined();
    expect(start).not.toHaveBeenCalled();
    await ReactTestRenderer.act(() => renderer.root.findByProps({ accessibilityLabel: 'Play First song' }).props.onPress());
    expect(start).toHaveBeenCalledWith([tracks[0]]);
  });

  it('uses the native Retry only to recheck unavailable DJ setup', async () => {
    mockStatus.mockResolvedValueOnce({ configured: false, message: 'Server unavailable' }).mockResolvedValueOnce({ configured: true, message: '' });
    await render(<GeminiDJ tracks={tracks} onStartSet={jest.fn()} />);
    expect(hasText('Server unavailable')).toBe(true);
    expect(nativeButton('Retry')).toBeDefined();
    expect(nativeButton('Retry').props.variant).toBe('outlined');
    expect(nativeButton('Retry').props.modifiers).toEqual(expect.arrayContaining([
      expect.objectContaining({ $type: 'semantics', contentDescription: 'Retry AI DJ connection' }),
    ]));
    await ReactTestRenderer.act(async () => nativeButton('Retry').props.onPress());
    expect(mockStatus).toHaveBeenCalledTimes(2);
    expect(nativeButton('Pick my track')).toBeDefined();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
