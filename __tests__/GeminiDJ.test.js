import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Linking, Platform, Text, TouchableOpacity } from 'react-native';
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
    mockCreateGeminiDjSet.mockReset();
  });

  describe('Android request invalidation', () => {
    let originalPlatform;
    beforeEach(() => { originalPlatform = Platform.OS; Platform.OS = 'android'; });
    afterEach(() => { Platform.OS = originalPlatform; });

  it('clears an existing pick when the prompt or category changes', async () => {
    const tracks = [{ id: 'track-1', title: 'First', artist: 'One', categories: ['Sad'] }];
    mockCreateGeminiDjSet.mockResolvedValue({ title: 'Pick', trackId: 'track-1' });
    let renderer;
    await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<GeminiDJ tracks={tracks} onStartSet={jest.fn()} />); await Promise.resolve(); await Promise.resolve(); });
    const input = () => renderer.root.findByProps({ accessibilityLabel: 'Describe the music you want your AI DJ to pick' });
    const pick = () => renderer.root.findAllByType(TouchableOpacity).find((button) => button.findAllByType(Text).some((text) => text.props.children === 'Pick my track'));
    await ReactTestRenderer.act(() => input().props.onChangeText('first mood'));
    await ReactTestRenderer.act(() => pick().props.onPress());
    expect(renderer.root.findAllByType(TouchableOpacity).filter((node) => node.props.accessibilityLabel === 'Play First')).toHaveLength(1);
    await ReactTestRenderer.act(() => input().props.onChangeText('different mood'));
    expect(renderer.root.findAllByType(TouchableOpacity).filter((node) => node.props.accessibilityLabel === 'Play First')).toHaveLength(0);
    await ReactTestRenderer.act(() => pick().props.onPress());
    expect(renderer.root.findAllByType(TouchableOpacity).filter((node) => node.props.accessibilityLabel === 'Play First')).toHaveLength(1);
    await ReactTestRenderer.act(() => renderer.root.findByProps({ accessibilityLabel: 'Category: Sad' }).props.onPress());
    expect(renderer.root.findAllByType(TouchableOpacity).filter((node) => node.props.accessibilityLabel === 'Play First')).toHaveLength(0);
    await ReactTestRenderer.act(() => renderer.unmount());
  });

  it('ignores stale pending results after the prompt changes', async () => {
    let resolveOld;
    let resolveNew;
    mockCreateGeminiDjSet
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveNew = resolve; }));
    const tracks = [{ id: 'track-1', title: 'First', artist: 'One' }];
    let renderer;
    await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<GeminiDJ tracks={tracks} onStartSet={jest.fn()} />); await Promise.resolve(); await Promise.resolve(); });
    const input = renderer.root.findByProps({ accessibilityLabel: 'Describe the music you want your AI DJ to pick' });
    await ReactTestRenderer.act(() => input.props.onChangeText('old mood'));
    const pick = renderer.root.findAllByType(TouchableOpacity).find((button) => button.findAllByType(Text).some((text) => text.props.children === 'Pick my track'));
    await ReactTestRenderer.act(() => { pick.props.onPress(); });
    await ReactTestRenderer.act(() => input.props.onChangeText('new mood'));
    const nextPick = renderer.root.findAllByType(TouchableOpacity).find((button) => button.props.accessibilityLabel === 'Pick my track');
    await ReactTestRenderer.act(() => { nextPick.props.onPress(); });
    await ReactTestRenderer.act(async () => { resolveOld({ title: 'Old pick', trackId: 'track-1' }); await Promise.resolve(); });
    expect(renderer.root.findAllByType(TouchableOpacity).filter((node) => node.props.accessibilityLabel === 'Play First')).toHaveLength(0);
    expect(renderer.root.findAllByType(TouchableOpacity).find((button) => button.props.accessibilityLabel === 'Pick my track').props.accessibilityState.busy).toBe(true);
    await ReactTestRenderer.act(async () => { resolveNew({ title: 'New pick', trackId: 'track-1' }); await Promise.resolve(); });
    expect(renderer.root.findAllByType(TouchableOpacity).filter((node) => node.props.accessibilityLabel === 'Play First')).toHaveLength(1);
    await ReactTestRenderer.act(() => renderer.unmount());
  });

  });

  it('limits the generated queue to the pick and six other tracks', async () => {
    const tracks = Array.from({ length: 12 }, (_, i) => ({ id: `track-${i}`, title: `Song ${i}`, artist: 'Artist' }));
    const onStartSet = jest.fn();
    mockCreateGeminiDjSet.mockResolvedValue({ title: 'Pick', trackId: 'track-3' });
    let renderer;
    await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<GeminiDJ tracks={tracks} onStartSet={onStartSet} />); await Promise.resolve(); await Promise.resolve(); });
    await ReactTestRenderer.act(() => renderer.root.findByProps({ accessibilityLabel: 'Describe the music you want your AI DJ to pick' }).props.onChangeText('mood'));
    const pick = renderer.root.findAllByType(TouchableOpacity).find((button) => button.props.accessibilityLabel === 'Pick my track');
    await ReactTestRenderer.act(() => pick.props.onPress());
    const play = renderer.root.findAllByType(TouchableOpacity).find((button) => button.props.accessibilityLabel === 'Play Song 3');
    await ReactTestRenderer.act(() => play.props.onPress());
    const queue = onStartSet.mock.calls[0][0];
    expect(queue).toHaveLength(7);
    expect(queue[0]).toBe(tracks[3]);
    expect(new Set(queue.map((track) => track.id)).size).toBe(7);
    await ReactTestRenderer.act(() => renderer.unmount());
  });

  it('does not offer playback when Gemini returns an unknown track', async () => {
    mockCreateGeminiDjSet.mockResolvedValue({ title: 'Pick', trackId: 'missing' });
    let renderer;
    await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<GeminiDJ tracks={[{ id: 'track-1', title: 'First', artist: 'One' }]} onStartSet={jest.fn()} />); await Promise.resolve(); await Promise.resolve(); });
    await ReactTestRenderer.act(() => renderer.root.findByProps({ accessibilityLabel: 'Describe the music you want your AI DJ to pick' }).props.onChangeText('mood'));
    const pick = renderer.root.findAllByType(TouchableOpacity).find((button) => button.props.accessibilityLabel === 'Pick my track');
    await ReactTestRenderer.act(() => pick.props.onPress());
    expect(renderer.root.findAllByType(Text).some((node) => node.props.children === 'Gemini could not match a track to the available catalog.')).toBe(true);
    expect(renderer.root.findAllByType(TouchableOpacity).some((button) => button.props.accessibilityLabel === 'Play First')).toBe(false);
    await ReactTestRenderer.act(() => renderer.unmount());
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

  it('shows sorted available categories and limits the DJ catalog to the selected category', async () => {
    const tracks = [
      { id: 'sad-track', title: 'Sad Song', artist: 'One', categories: ['Sad', 'OPM'] },
      { id: 'rap-track', title: 'Rap Song', artist: 'Two', categories: ['Rap'] },
    ];
    mockCreateGeminiDjSet.mockResolvedValue({
      title: 'Sad OPM',
      intro: 'A reflective pick.',
      trackId: 'sad-track',
    });

    let renderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <GeminiDJ tracks={tracks} onStartSet={jest.fn()} />
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const categoryButtons = renderer.root.findAllByType(TouchableOpacity)
      .filter((button) => button.props.accessibilityLabel?.startsWith('Category:'));
    expect(categoryButtons.map((button) => button.props.accessibilityLabel)).toEqual([
      'Category: OPM',
      'Category: Rap',
      'Category: Sad',
    ]);

    await ReactTestRenderer.act(() => categoryButtons[2].props.onPress());
    const buildButton = renderer.root.findAllByType(TouchableOpacity)
      .find((button) => button.findAllByType(Text)
        .some((text) => text.props.children === 'Pick my track'));
    await ReactTestRenderer.act(() => buildButton.props.onPress());

    expect(mockCreateGeminiDjSet).toHaveBeenCalledWith(
      mockUser,
      'Sad',
      [tracks[0]]
    );
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
