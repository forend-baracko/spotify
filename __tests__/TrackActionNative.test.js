import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
require('../test-utils/expoIcons');
jest.doMock('../src/components/player/TrackActionItem', () => jest.requireActual('../src/components/player/TrackActionItem.android'));
const TrackActionSheet = require('../src/components/player/TrackActionSheetModal').default;

test('native action rows preserve callbacks, track identity and close order', async () => {
  const track = { id: 'id-1', title: 'Song', artist: 'Artist' };
  const events = [];
  const action = (name) => (arg) => events.push([name, arg]);
  let renderer;
  await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<TrackActionSheet visible track={track} onClose={() => events.push(['close'])} isInPlaylist onToggleLike={action('like')} onAddToQueue={action('queue')} onGoToQueue={action('go')} onAddToPlaylist={action('playlist')} onRemoveFromPlaylist={action('remove')} />); });
  const rows = renderer.root.findAllByType('ExpoDrawerListItem');
  expect(rows).toHaveLength(6);
  for (const row of rows) {
    let ancestor = row.parent;
    while (ancestor && ancestor.props.importantForAccessibility !== 'no-hide-descendants') ancestor = ancestor.parent;
    expect(ancestor).not.toBeNull();
  }
  for (const [label, name] of [['Save to your Liked Songs', 'like'], ['Add to queue', 'queue'], ['Go to queue', 'go'], ['Add to playlist', 'playlist'], ['Remove from this playlist', 'remove']]) {
    const button = renderer.root.findAllByType(TouchableOpacity).find((node) => node.props.accessibilityLabel === label);
    expect(button.props.accessibilityRole).toBe('button');
    await ReactTestRenderer.act(() => button.props.onPress());
    expect(events.splice(0)).toEqual([['close'], [name, name === 'go' ? undefined : track]]);
  }
  await ReactTestRenderer.act(() => renderer.unmount());
});
