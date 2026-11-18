import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
require('../test-utils/expoIcons');
let StatsTrackRow;
try { StatsTrackRow = require('../src/components/profile/StatsTrackRow.android').default; } catch (error) { if (!String(error.message).includes('Cannot find module')) throw error; }
describe('Android listening history stats row', () => {
  let renderer;
  afterEach(async () => { if (renderer) await ReactTestRenderer.act(() => renderer.unmount()); renderer = null; });
  it('uses a native Expo list item with the actual rank, title and artist', async () => {
    expect(StatsTrackRow).toBeDefined();
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<StatsTrackRow rank={3} track={{ id: 'one', title: 'A Song', artist: 'An Artist' }} />); });
    expect(renderer.root.findByType('ExpoDrawerListItem')).toBeDefined();
    const texts = renderer.root.findAllByType('ExpoComposeText');
    expect(texts.map((node) => node.props.children)).toEqual(['3', 'A Song', 'An Artist']);
    expect(texts[1].props).toEqual(expect.objectContaining({ maxLines: 2, overflow: 'ellipsis' }));
    expect(texts[2].props).toEqual(expect.objectContaining({ maxLines: 2, overflow: 'ellipsis' }));
  });
});
