import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
require('../test-utils/expoIcons');
jest.doMock('../src/components/profile/ProfileDrawerItem', () => jest.requireActual('../src/components/profile/ProfileDrawerItem.android'));
const ProfileDrawer = require('../src/components/profile/ProfileDrawer').default;

describe('Android Expo profile drawer rows', () => {
  it('renders existing actions and preserves close-then-open callbacks', async () => {
    const onClose = jest.fn();
    const callbacks = { onOpenRecents: jest.fn(), onOpenStats: jest.fn(), onOpenSettings: jest.fn() };
    let renderer;
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<ProfileDrawer visible onClose={onClose} {...callbacks} />); });
    const rows = renderer.root.findAllByType('ExpoDrawerListItem');
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.findByType('ExpoUiText').props.children)).toEqual(['Recents', 'Listening stats', 'Settings and privacy']);
    for (const row of rows) {
      let host = row.parent;
      while (host && !host.props.matchContents) host = host.parent;
      expect(host.props.matchContents).toEqual({ vertical: true });
      expect(host.props.style.height).toBeUndefined();
      expect(host.props.style.minHeight).toBe(56);
    }
    for (const label of ['Recents', 'Listening stats', 'Settings and privacy']) {
      const action = renderer.root.findAllByType(require('react-native').TouchableOpacity).find((node) => node.props.accessibilityLabel === label);
      expect(action.props.accessibilityLabel).toBeTruthy();
      expect(action.props.accessibilityRole).toBe('button');
      await ReactTestRenderer.act(() => action.props.onPress());
    }
    expect(onClose).toHaveBeenCalledTimes(3);
    expect(callbacks.onOpenRecents).toHaveBeenCalledTimes(1);
    expect(callbacks.onOpenStats).toHaveBeenCalledTimes(1);
    expect(callbacks.onOpenSettings).toHaveBeenCalledTimes(1);
    await ReactTestRenderer.act(() => renderer.unmount());
  });
});
