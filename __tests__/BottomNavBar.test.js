import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import audioPlayer from '../src/services/audioPlayer';

jest.mock('../src/services/audioPlayer', () => ({
  __esModule: true,
  default: {
    getCurrentTrack: jest.fn(() => null),
    getIsPlaying: jest.fn(() => false),
    addListener: jest.fn(() => jest.fn()),
    togglePlay: jest.fn(),
  },
}));

require('../test-utils/expoIcons');
const { default: BottomNavBar, TABS } = require('../src/components/navigation/BottomNavBar');

describe('BottomNavBar icon slice', () => {
  let renderer;

  afterEach(async () => {
    if (renderer) {
      await ReactTestRenderer.act(() => renderer.unmount());
      renderer = null;
    }
    jest.clearAllMocks();
  });

  const renderBar = async (props) => {
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <BottomNavBar
          activeTab={TABS.HOME}
          onSelectTab={jest.fn()}
          onOpenPlayer={jest.fn()}
          {...props}
        />
      );
    });
  };

  const buttonForLabel = (label) => renderer.root.findAllByType(TouchableOpacity).find((button) =>
    button.findAllByType(Text).some((text) => text.props.children === label)
  );

  it('renders Expo UI symbols and preserves labels, tab callbacks, and selected accessibility', async () => {
    const onSelectTab = jest.fn();
    await renderBar({ activeTab: TABS.HOME, onSelectTab });

    const icons = renderer.root.findAllByType('ExpoUiIcon');
    expect(icons.map((icon) => icon.props.name)).toEqual([
      'home-symbol',
      'search-symbol',
      'library_music-symbol',
      'add-symbol',
    ]);

    const buttons = renderer.root.findAllByType(TouchableOpacity);
    expect(buttons).toHaveLength(4);
    expect(buttons.map((button) => button.props.accessibilityRole)).toEqual([
      'button', 'button', 'button', 'button',
    ]);
    expect(buttons.map((button) => button.props.accessibilityState)).toEqual([
      { selected: true },
      { selected: false },
      { selected: false },
      { selected: false },
    ]);
    expect(buttons.map((button) => button.props.accessibilityLabel)).toEqual([
      'Home', 'Search', 'Your Library', 'Create',
    ]);

    const visibleLabels = buttons.map((button) =>
      button.findAllByType(Text).map((text) => text.props.children).find((child) => typeof child === 'string')
    );
    expect(visibleLabels).toEqual(['Home', 'Search', 'Your Library', 'Create']);
    const iconHosts = renderer.root.findAllByType('ExpoUiHost');
    expect(iconHosts).toHaveLength(4);
    iconHosts.forEach((host) => {
      const iconView = host.parent.parent;
      expect(iconView.props.accessible).toBe(false);
      expect(iconView.props.importantForAccessibility).toBe('no-hide-descendants');
    });
    expect(StyleSheet.flatten(buttonForLabel('Home').findAllByType(Text).at(-1).props.style).fontWeight)
      .toBe('bold');

    buttons.forEach((button) => button.props.onPress());
    expect(onSelectTab.mock.calls).toEqual([
      [TABS.HOME], [TABS.SEARCH], [TABS.LIBRARY], [TABS.CREATE],
    ]);
  });

  it('renders the existing Close branch and keeps its Create callback', async () => {
    const onSelectTab = jest.fn();
    await renderBar({ isCreateModalOpen: true, onSelectTab });

    const buttons = renderer.root.findAllByType(TouchableOpacity);
    const closeButton = buttons[3];
    const icons = renderer.root.findAllByType('ExpoUiIcon');

    expect(icons.map((icon) => icon.props.name)).toEqual([
      'home-symbol', 'search-symbol', 'library_music-symbol', 'close-symbol',
    ]);
    expect(closeButton.props.accessibilityLabel).toBe('Close Create');
    expect(closeButton.props.accessibilityRole).toBe('button');

    await ReactTestRenderer.act(() => closeButton.props.onPress());
    expect(onSelectTab).toHaveBeenCalledWith(TABS.CREATE);
  });

  it('moves the selected tab state without changing destination callbacks', async () => {
    const onSelectTab = jest.fn();
    await renderBar({ onSelectTab });
    for (const tab of Object.values(TABS)) {
      await ReactTestRenderer.act(() => renderer.update(
        <BottomNavBar activeTab={tab} onSelectTab={onSelectTab} onOpenPlayer={jest.fn()} />
      ));
      const buttons = renderer.root.findAllByType(TouchableOpacity);
      expect(buttons.filter((button) => button.props.accessibilityState?.selected)).toHaveLength(1);
      expect(buttons.find((button) => button.props.accessibilityState?.selected).props.accessibilityLabel).toBe(tab);
      await ReactTestRenderer.act(() => buttons.find((button) => button.props.accessibilityLabel === tab).props.onPress());
    }
    expect(onSelectTab.mock.calls).toEqual(Object.values(TABS).map((tab) => [tab]));
  });

  it('keeps the mini-player absent when no current track exists', async () => {
    await renderBar();
    const visibleText = renderer.root.findAllByType(Text).map((text) => text.props.children);
    expect(visibleText).not.toContain('Unknown Track');
  });

  it('keeps the mini-player visible for the current track', async () => {
    audioPlayer.getCurrentTrack.mockReturnValueOnce({
      title: 'Current Track',
      artist: 'Current Artist',
      artwork: null,
    });

    await renderBar();
    const visibleText = renderer.root.findAllByType(Text).map((text) => text.props.children);
    expect(visibleText).toContain('Current Track');
    expect(visibleText).toContain('Current Artist');
  });

  it('updates mini-player icons from audio events without opening the full player on toggle', async () => {
    const track = { id: 'test-track', title: 'Current Track', artist: 'Current Artist' };
    const onOpenPlayer = jest.fn();
    audioPlayer.getCurrentTrack.mockReturnValueOnce(track);
    await renderBar({ onOpenPlayer });
    const toggle = () => renderer.root.findAllByType(TouchableOpacity)
      .find((button) => ['Play', 'Pause'].includes(button.props.accessibilityLabel));
    expect(toggle()).toBeDefined();
    expect(toggle().findByType('ExpoUiIcon').props.name).toBe('play_arrow-symbol');
    const event = { stopPropagation: jest.fn() };
    await ReactTestRenderer.act(() => toggle().props.onPress(event));
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    expect(audioPlayer.togglePlay).toHaveBeenCalledWith(track);
    expect(onOpenPlayer).not.toHaveBeenCalled();
    const listener = audioPlayer.addListener.mock.calls[0][0];
    await ReactTestRenderer.act(() => listener('play', { track, isPlaying: true }));
    expect(toggle().props.accessibilityLabel).toBe('Pause');
    expect(toggle().findByType('ExpoUiIcon').props.name).toBe('pause-symbol');
    const open = renderer.root.findAllByType(TouchableOpacity)
      .find((button) => button.props.accessibilityLabel === 'Open current track: Current Track by Current Artist');
    await ReactTestRenderer.act(() => open.props.onPress());
    expect(onOpenPlayer).toHaveBeenCalledTimes(1);
    await ReactTestRenderer.act(() => listener('reset', { track: null }));
    expect(toggle()).toBeUndefined();
  });

  it('names the current song and artist and updates the announcement when the track changes', async () => {
    audioPlayer.getCurrentTrack.mockReturnValueOnce({ id: 'first', title: 'First Song', artist: 'First Artist' });
    await renderBar();
    const label = () => renderer.root.findAllByType(TouchableOpacity)
      .find((button) => button.props.accessibilityLabel?.startsWith('Open current track')).props.accessibilityLabel;
    expect(label()).toBe('Open current track: First Song by First Artist');
    const listener = audioPlayer.addListener.mock.calls[0][0];
    await ReactTestRenderer.act(() => listener('track', { track: { id: 'second', title: 'Second Song', artist: 'Second Artist' } }));
    expect(label()).toBe('Open current track: Second Song by Second Artist');
    await ReactTestRenderer.act(() => listener('track', { track: { id: 'unknown' } }));
    expect(label()).toBe('Open current track: Unknown Track by Unknown Artist');
  });

  it('unsubscribes the mini-player listener on unmount and hides it while Create is open', async () => {
    const unsubscribe = jest.fn();
    audioPlayer.addListener.mockReturnValueOnce(unsubscribe);
    audioPlayer.getCurrentTrack.mockReturnValueOnce({ id: 't', title: 'Hidden Track' });
    await renderBar({ isCreateModalOpen: true });
    expect(renderer.root.findAllByType(Text).map((text) => text.props.children)).not.toContain('Hidden Track');
    await ReactTestRenderer.act(() => renderer.unmount());
    renderer = null;
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
