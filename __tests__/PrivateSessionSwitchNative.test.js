import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Alert, Platform } from 'react-native';
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
require('../test-utils/expoIcons');
let PrivateSessionSwitch;
try { PrivateSessionSwitch = require('../src/components/settings/PrivateSessionSwitch.android').default; } catch (error) { if (!String(error.message).includes('Cannot find module')) throw error; }
jest.doMock('../src/components/settings/PrivateSessionSwitch', () => jest.requireActual('../src/components/settings/PrivateSessionSwitch.android'));
const SettingsModal = require('../src/components/settings/SettingsModal').default;

describe('Android private session switch', () => {
  let renderer;
  afterEach(async () => { if (renderer) await ReactTestRenderer.act(() => renderer.unmount()); renderer = null; });
  it('uses the native Expo switch and forwards its checked value', async () => {
    expect(PrivateSessionSwitch).toBeDefined();
    const onValueChange = jest.fn();
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<PrivateSessionSwitch value={false} onValueChange={onValueChange} />); });
    const toggle = renderer.root.findByType('ExpoComposeSwitch');
    expect(toggle.props.value).toBe(false);
    expect(toggle.props.modifiers).toEqual(expect.arrayContaining([expect.objectContaining({ contentDescription: 'Private session' })]));
    await ReactTestRenderer.act(() => toggle.props.onCheckedChange(true));
    expect(onValueChange).toHaveBeenCalledWith(true);
    await ReactTestRenderer.act(() => renderer.update(<PrivateSessionSwitch value onValueChange={onValueChange} />));
    expect(renderer.root.findByType('ExpoComposeSwitch').props.value).toBe(true);
  });
  it('retains the settings callback and failure message', async () => {
    const onSetPrivateSession = jest.fn().mockRejectedValue(new Error('offline'));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    try {
      await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<SettingsModal visible onClose={jest.fn()} privateSession={false} onSetPrivateSession={onSetPrivateSession} />); });
      await ReactTestRenderer.act(async () => { await renderer.root.findByType('ExpoComposeSwitch').props.onCheckedChange(true); });
      expect(onSetPrivateSession).toHaveBeenCalledWith(true);
      expect(alert).toHaveBeenCalledWith('Could not save setting', 'Please try changing private session again.');
    } finally { alert.mockRestore(); }
  }, 15000); // Cold concurrent SettingsModal renders have exceeded the default timeout.
  it('uses the outlined profile button while preserving close and open callbacks', async () => {
    const platform = Platform.OS;
    Platform.OS = 'android';
    try {
      const onClose = jest.fn();
      const onOpenProfile = jest.fn();
      await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<SettingsModal visible onClose={onClose} onOpenProfile={onOpenProfile} />); });
      const button = renderer.root.findAllByType('ExpoUiButton').find((node) => node.props.label === 'View profile');
      expect(button).toBeDefined();
      expect(button.props.variant).toBe('outlined');
      await ReactTestRenderer.act(() => button.props.onPress());
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onOpenProfile).toHaveBeenCalledTimes(1);
      expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(onOpenProfile.mock.invocationCallOrder[0]);
    } finally { Platform.OS = platform; }
  });
});
