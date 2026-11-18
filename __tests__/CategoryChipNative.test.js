import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('@expo/ui', () => ({ Host: ({ children }) => children, Text: ({ children }) => <>{children}</> }));
jest.mock('@expo/ui/jetpack-compose', () => {
  const R = require('react');
  const FilterChip = ({ children, ...props }) => R.createElement('NativeFilterChip', props, children);
  FilterChip.Label = ({ children }) => R.createElement('NativeChipLabel', null, children);
  return { FilterChip };
});
jest.mock('@expo/ui/jetpack-compose/modifiers', () => ({
  semantics: (props) => ({ $type: 'semantics', ...props }),
  selectable: (selected, handler, role) => ({ $type: 'selectable', selected, handler, role }),
}));
jest.mock('../src/components/search/CategoryChip', () => jest.requireActual('../src/components/search/CategoryChip.android'));
const TrackCategoriesBrowser = require('../src/components/search/TrackCategoriesBrowser').default;

describe('Android category FilterChip', () => {
  let renderer;
  afterEach(async () => { if (renderer) await ReactTestRenderer.act(() => renderer.unmount()); });
  it('sorts distinct categories, exposes selection, and preserves category callback', async () => {
    const onSelectCategory = jest.fn();
    const tracks = [{ categories: ['Sad', 'Rap'] }, { categories: ['Sad', 'OPM'] }];
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<TrackCategoriesBrowser tracks={tracks} selectedCategory="Sad" onSelectCategory={onSelectCategory} />); });
    const chips = renderer.root.findAllByType('NativeFilterChip');
    expect(chips).toHaveLength(3);
    expect(chips.map((c) => c.findByType('NativeChipLabel').props.children.props.children)).toEqual(['OPM', 'Rap', '✓ Sad']);
    expect(chips.map((c) => c.props.selected)).toEqual([false, false, true]);
    expect(chips.map((c) => c.props.modifiers.find((m) => m.$type === 'selectable')?.selected)).toEqual([false, false, true]);
    expect(chips[2].props.modifiers).toEqual(expect.arrayContaining([expect.objectContaining({ contentDescription: 'Category: Sad, selected' })]));
    expect(chips[0].props.modifiers).toEqual(expect.arrayContaining([expect.objectContaining({ contentDescription: 'Category: OPM, not selected' })]));
    await ReactTestRenderer.act(() => chips[2].props.onClick());
    expect(onSelectCategory).toHaveBeenCalledWith('Sad');
  });
  it('retains empty state without a native chip', async () => {
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<TrackCategoriesBrowser tracks={[]} onSelectCategory={jest.fn()} />); });
    expect(renderer.root.findAllByType('NativeFilterChip')).toHaveLength(0);
    expect(renderer.root.findAllByType(Text).some((node) => node.props.children === 'No track categories are available yet.')).toBe(true);
  });
});
