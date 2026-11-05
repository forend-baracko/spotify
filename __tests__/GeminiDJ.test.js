import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Linking, Text, TouchableOpacity } from 'react-native';
import GeminiDJ from '../src/components/search/GeminiDJ';

const mockCreateGeminiDjSet = jest.fn();
const mockUser = { uid: 'user-1' };

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.mock('../src/services/geminiService', () => ({
  createGeminiDjSet: (...args) => mockCreateGeminiDjSet(...args),
  getGeminiStatus: jest.fn().mockResolvedValue({ configured: true, message: '' }),
}));

describe('GeminiDJ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts with the Gemini pick followed by the available tracks in randomized order', async () => {
    const tracks = [
      { id: 'track-1', title: 'First', artist: 'One' },
      { id: 'track-2', title: 'Second', artist: 'Two' },
      { id: 'track-3', title: 'Third', artist: 'Three' },
      { id: 'track-4', title: 'Fourth', artist: 'Four' },
    ];
    const onStartSet = jest.fn();
    mockCreateGeminiDjSet.mockResolvedValue({
      title: 'Night drive',
      intro: 'Let’s go.',
      trackId: 'track-2',
    });

    let renderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <GeminiDJ tracks={tracks} onStartSet={onStartSet} />
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const input = renderer.root.findByProps({
      accessibilityLabel: 'Describe the music you want your AI DJ to pick',
    });
    await ReactTestRenderer.act(() => input.props.onChangeText('night drive'));

    const buildButton = renderer.root.findAllByType(TouchableOpacity)
      .find((button) => button.findAllByType(Text)
        .some((text) => text.props.children === 'Pick my track'));
    await ReactTestRenderer.act(() => buildButton.props.onPress());

    expect(mockCreateGeminiDjSet).toHaveBeenCalledWith(
      mockUser,
      'night drive',
      tracks
    );
    const startButton = renderer.root.findByProps({ accessibilityLabel: 'Play Second' });
    await ReactTestRenderer.act(() => startButton.props.onPress());

    const [queue] = onStartSet.mock.calls[0];
    expect(queue[0]).toBe(tracks[1]);
    expect(queue.slice(1).map((track) => track.id).sort()).toEqual([
      'track-1',
      'track-3',
      'track-4',
    ]);
    expect(queue).toHaveLength(tracks.length);
    expect(renderer.root.findAllByType(Text)
      .filter((text) => ['First', 'Second', 'Third', 'Fourth'].includes(text.props.children)))
      .toHaveLength(1);
  });

  it('offers quota guidance and a retry after Gemini rate limits the request', async () => {
    const tracks = [{ id: 'track-1', title: 'Quiet Song', artist: 'A Singer' }];
    mockCreateGeminiDjSet.mockRejectedValue(
      new Error('Gemini quota is exhausted. Wait for quota reset.')
    );
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    let renderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <GeminiDJ tracks={tracks} onStartSet={jest.fn()} />
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const input = renderer.root.findByProps({
      accessibilityLabel: 'Describe the music you want your AI DJ to pick',
    });
    await ReactTestRenderer.act(() => input.props.onChangeText('calm'));
    const buildButton = renderer.root.findAllByType(TouchableOpacity)
      .find((button) => button.findAllByType(Text)
        .some((text) => text.props.children === 'Pick my track'));
    await ReactTestRenderer.act(() => buildButton.props.onPress());

    const quotaButton = renderer.root.findAllByType(TouchableOpacity)
      .find((button) => button.findAllByType(Text)
        .some((text) => text.props.children === 'Check Google quota'));
    await ReactTestRenderer.act(async () => quotaButton.props.onPress());

    expect(openURL).toHaveBeenCalledWith(
      'https://aistudio.google.com/rate-limit?timeRange=last-28-days'
    );
    expect(renderer.root.findAllByType(Text)
      .some((text) => text.props.children === 'Try again')).toBe(true);
    openURL.mockRestore();
  });

  it('offers a manual retry when Gemini is temporarily overloaded', async () => {
    mockCreateGeminiDjSet
      .mockRejectedValueOnce(new Error('Gemini is temporarily overloaded.'))
      .mockResolvedValueOnce({
        title: 'Quiet Evening',
        intro: 'A gentle pick.',
        trackId: 'track-1',
      });
    const tracks = [{ id: 'track-1', title: 'Quiet Song', artist: 'A Singer' }];
    let renderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <GeminiDJ tracks={tracks} onStartSet={jest.fn()} />
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const input = renderer.root.findByProps({
      accessibilityLabel: 'Describe the music you want your AI DJ to pick',
    });
    await ReactTestRenderer.act(() => input.props.onChangeText('calm'));
    const pickButton = () => renderer.root.findAllByType(TouchableOpacity)
      .find((button) => button.findAllByType(Text)
        .some((text) => text.props.children === 'Pick my track'));
    await ReactTestRenderer.act(() => pickButton().props.onPress());

    const retryButton = renderer.root.findAllByType(TouchableOpacity)
      .find((button) => button.findAllByType(Text)
        .some((text) => text.props.children === 'Try again'));
    expect(retryButton).toBeDefined();
    await ReactTestRenderer.act(() => retryButton.props.onPress());

    expect(mockCreateGeminiDjSet).toHaveBeenCalledTimes(2);
    expect(renderer.root.findByProps({ accessibilityLabel: 'Play Quiet Song' })).toBeDefined();
  });

  it('offers a manual retry when the Gemini request times out', async () => {
    mockCreateGeminiDjSet
      .mockRejectedValueOnce(new Error('Gemini DJ timed out. Please try again.'))
      .mockResolvedValueOnce({
        title: 'Quiet Evening',
        intro: 'A gentle pick.',
        trackId: 'track-1',
      });
    const tracks = [{ id: 'track-1', title: 'Quiet Song', artist: 'A Singer' }];
    let renderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <GeminiDJ tracks={tracks} onStartSet={jest.fn()} />
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const input = renderer.root.findByProps({
      accessibilityLabel: 'Describe the music you want your AI DJ to pick',
    });
    await ReactTestRenderer.act(() => input.props.onChangeText('calm'));
    const pickButton = () => renderer.root.findAllByType(TouchableOpacity)
      .find((button) => button.findAllByType(Text)
        .some((text) => text.props.children === 'Pick my track'));
    await ReactTestRenderer.act(() => pickButton().props.onPress());

    const retryButton = renderer.root.findAllByType(TouchableOpacity)
      .find((button) => button.findAllByType(Text)
        .some((text) => text.props.children === 'Try again'));
    expect(retryButton).toBeDefined();
    await ReactTestRenderer.act(() => retryButton.props.onPress());

    expect(mockCreateGeminiDjSet).toHaveBeenCalledTimes(2);
    expect(renderer.root.findByProps({ accessibilityLabel: 'Play Quiet Song' })).toBeDefined();
  });
});
