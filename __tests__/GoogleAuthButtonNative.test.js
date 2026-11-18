import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
require('../test-utils/expoIcons');
let GoogleAuthButton;
try { GoogleAuthButton = require('../src/components/buttons/GoogleAuthButton.android').default; } catch (error) { if (!String(error.message).includes('Cannot find module')) throw error; }
describe('Android Google provider button', () => {
  let renderer;
  afterEach(async () => { if (renderer) await ReactTestRenderer.act(() => renderer.unmount()); renderer = null; });
  it('uses an Expo outlined button, forwards the provider action, and blocks it while busy', async () => {
    expect(GoogleAuthButton).toBeDefined();
    const onPress = jest.fn();
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<GoogleAuthButton onPress={onPress} />); });
    let button = renderer.root.findByType('ExpoHomePill');
    expect(button.props.variant).toBe('outlined');
    expect(button.props.modifiers).toEqual(expect.arrayContaining([expect.objectContaining({ contentDescription: 'Continue with Google' }), expect.objectContaining({ $type: 'fillMaxWidth' })]));
    await ReactTestRenderer.act(() => button.props.onClick());
    expect(onPress).toHaveBeenCalledTimes(1);
    await ReactTestRenderer.act(() => renderer.update(<GoogleAuthButton onPress={onPress} loading />));
    button = renderer.root.findByType('ExpoHomePill');
    expect(button.props.enabled).toBe(false);
    expect(button.props.onClick).toBeUndefined();
    expect(button.findAllByType('ExpoCircularProgress')).toHaveLength(1);
    expect(button.props.modifiers).toEqual(expect.arrayContaining([expect.objectContaining({ contentDescription: 'Continuing with Google' })]));
  });
});
