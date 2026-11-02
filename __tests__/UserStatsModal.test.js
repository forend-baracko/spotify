import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Share, Text, TouchableOpacity } from 'react-native';
import UserStatsModal from '../src/components/profile/UserStatsModal';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('UserStatsModal', () => {
  it('shows listening counts and artists from actual recent tracks', async () => {
    const recentTracks = [
      { id: 'one', title: 'First track', artist: 'Artist A', duration: '3:00', playedAt: Date.now() },
      { id: 'two', title: 'Second track', artist: 'Artist A', duration: 120, playedAt: Date.now() },
      { id: 'three', title: 'Third track', artist: 'Artist B', duration: 'invalid' },
    ];
    let renderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <UserStatsModal visible onClose={jest.fn()} recentTracks={recentTracks} />
      );
    });

    const texts = renderer.root.findAllByType(Text).map((text) => text.props.children);

    expect(texts).toContain(2);
    expect(texts).toContain(2);
    expect(texts).toContain('5m');
    expect(texts).toContain('Artist A');
    expect(texts).toContain('First track');
  });

  it('shares actual listening stats', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    const recentTracks = [
      { id: 'one', title: 'First track', artist: 'Artist A', duration: '3:00' },
    ];
    let renderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <UserStatsModal visible onClose={jest.fn()} recentTracks={recentTracks} />
      );
    });

    const shareButton = renderer.root.findAllByType(TouchableOpacity).find((button) =>
      button.props.accessibilityLabel === 'Share listening stats'
    );
    await ReactTestRenderer.act(async () => shareButton.props.onPress());

    expect(share).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('1 saved recently played tracks'),
    }));
    share.mockRestore();
  });
});
