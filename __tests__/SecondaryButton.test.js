import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
require('../test-utils/expoIcons');
const TrackActionSheetModal = require('../src/components/player/TrackActionSheetModal').default;

describe('Expo secondary button sample', () => {
  let renderer;
  afterEach(async () => {
    if (renderer) await ReactTestRenderer.act(() => renderer.unmount());
  });
  it('uses the ready-made outlined Button and retains the existing Close callback', async () => {
    const onClose = jest.fn();
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(
      <TrackActionSheetModal visible track={{ id: 't', title: 'Test Song', artist: 'Artist' }} onClose={onClose} />
    ); });
    const buttons = renderer.root.findAllByType('ExpoUiButton');
    expect(buttons).toHaveLength(1);
    const button = buttons[0];
    expect(button.props.label).toBe('Close');
    expect(button.props.variant).toBe('outlined');
    await ReactTestRenderer.act(() => button.props.onPress());
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('keeps the label and prevents a disabled action from being dispatched', async () => {
    const SecondaryButton = require('../src/components/buttons/SecondaryButton.android').default;
    const onPress = jest.fn();
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<SecondaryButton label="Close" disabled onPress={onPress} />); });
    const button = renderer.root.findByType('ExpoUiButton');
    expect(button.props.label).toBe('Close');
    expect(button.props.disabled).toBe(true);
    expect(button.props.onPress).toBeUndefined();
    expect(onPress).not.toHaveBeenCalled();
  });
});
