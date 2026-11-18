import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Platform, TouchableOpacity } from 'react-native';
import GeminiDJ from '../src/components/search/GeminiDJ';

const mockCreateGeminiDjSet = jest.fn();
jest.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'test' } }) }));
jest.mock('../src/services/geminiService', () => ({
  createGeminiDjSet: (...args) => mockCreateGeminiDjSet(...args),
  getGeminiStatus: jest.fn().mockResolvedValue({ configured: true, message: '' }),
}));

describe('GeminiDJ on a generic non-Android platform', () => {
  let originalPlatform;
  let renderer;
  const tracks = [{ id: 'track-1', title: 'First', artist: 'One', categories: ['Sad'] }];

  beforeEach(() => {
    originalPlatform = Platform.OS;
    Platform.OS = 'web';
    mockCreateGeminiDjSet.mockReset();
  });
  afterEach(async () => {
    if (renderer) await ReactTestRenderer.act(() => renderer.unmount());
    renderer = null;
    Platform.OS = originalPlatform;
  });

  it('keeps a generated pick playable when the prompt or category changes', async () => {
    const onStartSet = jest.fn();
    mockCreateGeminiDjSet.mockResolvedValue({ title: 'Pick', trackId: 'track-1' });
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<GeminiDJ tracks={tracks} onStartSet={onStartSet} />);
      await Promise.resolve();
      await Promise.resolve();
    });
    const input = () => renderer.root.findByProps({ accessibilityLabel: 'Describe the music you want your AI DJ to pick' });
    await ReactTestRenderer.act(() => input().props.onChangeText('first mood'));
    await ReactTestRenderer.act(() => renderer.root.findByProps({ accessibilityLabel: 'Pick my track' }).props.onPress());
    await ReactTestRenderer.act(() => input().props.onChangeText('different mood'));
    expect(renderer.root.findAllByType(TouchableOpacity).filter((button) => button.props.accessibilityLabel === 'Play First')).toHaveLength(1);
    await ReactTestRenderer.act(() => renderer.root.findByProps({ accessibilityLabel: 'Category: Sad' }).props.onPress());
    const play = renderer.root.findByProps({ accessibilityLabel: 'Play First' });
    await ReactTestRenderer.act(() => play.props.onPress());
    expect(onStartSet).toHaveBeenCalledWith(tracks);
  });

  it('keeps a pending request busy and accepts its result after a prompt change', async () => {
    let resolveRequest;
    mockCreateGeminiDjSet.mockImplementation(() => new Promise((resolve) => { resolveRequest = resolve; }));
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<GeminiDJ tracks={tracks} onStartSet={jest.fn()} />);
      await Promise.resolve();
      await Promise.resolve();
    });
    const input = () => renderer.root.findByProps({ accessibilityLabel: 'Describe the music you want your AI DJ to pick' });
    await ReactTestRenderer.act(() => input().props.onChangeText('first mood'));
    await ReactTestRenderer.act(() => { renderer.root.findByProps({ accessibilityLabel: 'Pick my track' }).props.onPress(); });
    await ReactTestRenderer.act(() => input().props.onChangeText('different mood'));
    expect(renderer.root.findByProps({ accessibilityLabel: 'Pick my track' }).props.accessibilityState.busy).toBe(true);
    await ReactTestRenderer.act(async () => { resolveRequest({ title: 'Pick', trackId: 'track-1' }); await Promise.resolve(); });
    expect(renderer.root.findByProps({ accessibilityLabel: 'Play First' })).toBeDefined();
  });
});