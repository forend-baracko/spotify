import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import TrackCategoriesBrowser from '../src/components/search/TrackCategoriesBrowser';

describe('TrackCategoriesBrowser', () => {
  it('shows available categories in alphabetical order and selects a category', async () => {
    const onSelectCategory = jest.fn();
    let renderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <TrackCategoriesBrowser
          tracks={[
            { id: '1', categories: ['Sad', 'OPM'] },
            { id: '2', categories: ['Rap', 'OPM'] },
          ]}
          selectedCategory="OPM"
          onSelectCategory={onSelectCategory}
        />
      );
    });

    const labels = renderer.root.findAllByType(TouchableOpacity)
      .map((button) => button.props.accessibilityLabel);
    expect(labels).toEqual(['Category: OPM', 'Category: Rap', 'Category: Sad']);
    expect(renderer.root.findAllByType(TouchableOpacity)[0].props.accessibilityState)
      .toEqual({ selected: true });

    await ReactTestRenderer.act(() =>
      renderer.root.findAllByType(TouchableOpacity)[1].props.onPress()
    );
    expect(onSelectCategory).toHaveBeenCalledWith('Rap');
  });

  it('explains when none of the tracks have category tags', async () => {
    let renderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <TrackCategoriesBrowser tracks={[{ id: '1' }]} onSelectCategory={jest.fn()} />
      );
    });

    expect(renderer.root.findAllByType(Text)
      .some((text) => text.props.children === 'No track categories are available yet.')).toBe(true);
  });
});