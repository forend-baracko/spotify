import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';

const mockQueue = [
  { id: 'a', title: 'Earlier', artist: 'A', artwork: null },
  { id: 'b', title: 'Current', artist: 'B', artwork: null },
  { id: 'a', title: 'Next duplicate', artist: 'C', artwork: null },
];
const mockPlayer = {
  getQueue: jest.fn(() => mockQueue), getCurrentIndex: jest.fn(() => 1),
  addListener: jest.fn(() => jest.fn()), jumpToQueueIndex: jest.fn(),
  removeFromQueue: jest.fn(), clearQueue: jest.fn(),
};
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('../src/services/audioPlayer', () => ({ __esModule: true, default: mockPlayer }));
require('../test-utils/expoIcons');
jest.doMock('../src/components/player/QueueTrackRow', () => jest.requireActual('../src/components/player/QueueTrackRow.android'));
const QueueModal = require('../src/components/player/QueueModal').default;

test('native queue rows preserve indices, current state and queue callbacks', async () => {
  let renderer;
  await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<QueueModal visible onClose={jest.fn()} />); });
  const rows = renderer.root.findAllByType('ExpoDrawerListItem');
  expect(rows).toHaveLength(2);
  for (const row of rows) {
    let ancestor = row.parent;
    while (ancestor && ancestor.props.importantForAccessibility !== 'no-hide-descendants') ancestor = ancestor.parent;
    expect(ancestor).not.toBeNull();
  }
  const buttons = () => renderer.root.findAllByType(TouchableOpacity);
  const current = buttons().find((n) => n.props.accessibilityLabel === 'Play Current by B, now playing');
  const next = buttons().find((n) => n.props.accessibilityLabel === 'Play Next duplicate by C');
  expect(current.props.accessibilityState).toEqual({ selected: true });
  await ReactTestRenderer.act(() => current.props.onPress());
  await ReactTestRenderer.act(() => next.props.onPress());
  expect(mockPlayer.jumpToQueueIndex.mock.calls).toEqual([[1], [2]]);
  const remove = buttons().find((n) => n.props.accessibilityLabel === 'Remove Next duplicate from queue');
  await ReactTestRenderer.act(() => remove.props.onPress());
  expect(mockPlayer.removeFromQueue).toHaveBeenCalledWith(2);
  const clear = buttons().find((n) => n.findAllByType(Text).some((t) => t.props.children === 'Clear'));
  await ReactTestRenderer.act(() => clear.props.onPress());
  expect(mockPlayer.clearQueue).toHaveBeenCalledTimes(1);
  await ReactTestRenderer.act(() => renderer.unmount());
});
