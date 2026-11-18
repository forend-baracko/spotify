import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Platform, Share, TouchableOpacity } from 'react-native';
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
require('../test-utils/expoIcons');
let StatsMetricCard;
try { StatsMetricCard = require('../src/components/profile/StatsMetricCard.android').default; } catch (error) { if (!String(error.message).includes('Cannot find module')) throw error; }
jest.doMock('../src/components/profile/StatsMetricCard', () => jest.requireActual('../src/components/profile/StatsMetricCard.android'));
const UserStatsModal = require('../src/components/profile/UserStatsModal').default;

describe('Android listening stats card', () => {
  let renderer;
  afterEach(async () => { if (renderer) await ReactTestRenderer.act(() => renderer.unmount()); renderer = null; });
  it('uses a native Expo card and displays the provided value and label', async () => {
    expect(StatsMetricCard).toBeDefined();
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<StatsMetricCard value={2} label="Artists in saved history" />); });
    expect(renderer.root.findByType('ExpoHomeCard')).toBeDefined();
    expect(renderer.root.findAllByType('ExpoUiText').map((node) => node.props.children)).toEqual(['2', 'Artists in saved history']);
  });
  it('renders real calculated values and keeps the share action', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    const platform = Platform.OS;
    Platform.OS = 'android';
    try {
      const tracks = [{ id: 'one', title: 'Track', artist: 'Artist A', duration: '3:00', playedAt: Date.now() }, { id: 'two', title: 'Next', artist: 'Artist B', duration: 120, playedAt: Date.now() }];
      await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<UserStatsModal visible onClose={jest.fn()} recentTracks={tracks} />); });
      expect(renderer.root.findAllByType('ExpoHomeCard')).toHaveLength(3);
      const texts = renderer.root.findAllByType('ExpoUiText').map((node) => node.props.children);
      expect(texts).toEqual(expect.arrayContaining(['2', '5m', 'Tracks in the last 4 weeks', 'Artists in saved history']));
      const action = renderer.root.findAllByType(TouchableOpacity).find((node) => node.props.accessibilityLabel === 'Share listening stats');
      await ReactTestRenderer.act(async () => { await action.props.onPress(); });
      expect(share).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('2 saved recently played tracks') }));
      expect(share.mock.calls[0][0].message).toContain('5 estimated minutes of track duration');
      expect(share.mock.calls[0][0].message).not.toContain('minutes listened');
    } finally { Platform.OS = platform; share.mockRestore(); }
  });
});
