import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

require('../test-utils/expoIcons');
let NavigationTabs;
try {
  NavigationTabs = require('../src/components/navigation/NavigationTabs.android').default;
} catch (error) {
  if (!String(error.message).includes('Cannot find module')) throw error;
}

describe('Android native bottom navigation', () => {
  it('keeps labels compact enough to fit at 320dp with large text', async () => {
    const ReactNative = require('react-native');
    const dimensions = jest.spyOn(ReactNative, 'useWindowDimensions').mockReturnValue({ width: 320, height: 686, scale: 2.625, fontScale: 1.3 });
    let renderer;
    try {
      await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<NavigationTabs activeTab="Your Library" />); });
      const library = renderer.root.findAllByType('ExpoUiText').find((label) => label.props.children === 'Your Library');
      expect(library.props.textStyle.fontSize).toBe(10);
    } finally {
      if (renderer) await ReactTestRenderer.act(() => renderer.unmount());
      dimensions.mockRestore();
    }
  });
  it('renders the four destinations, selected state and existing callbacks', async () => {
    expect(NavigationTabs).toBeDefined();
    const onSelectTab = jest.fn();
    let renderer;
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<NavigationTabs activeTab="Search" onSelectTab={onSelectTab} />); });
    const items = renderer.root.findAllByType('ExpoNavigationItem');
    expect(items).toHaveLength(4);
    expect(items.map(item => item.props.selected)).toEqual([false, true, false, false]);
    expect(items.map(item => item.findByType('ExpoUiText').props.children)).toEqual(['Home', 'Search', 'Your Library', 'Create']);
    for (const item of items) {
      const label = item.findByType('ExpoUiText');
      expect(label.props.numberOfLines).toBe(1);
      expect(label.props.textStyle.fontSize).toBe(12);
    }
    await ReactTestRenderer.act(() => items.forEach(item => item.props.onClick()));
    expect(onSelectTab.mock.calls).toEqual([['Home'], ['Search'], ['Your Library'], ['Create']]);
    await ReactTestRenderer.act(() => renderer.unmount());
  });
});
