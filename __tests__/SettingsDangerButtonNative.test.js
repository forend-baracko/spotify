import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Alert, Platform } from 'react-native';
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
require('../test-utils/expoIcons');
let SettingsDangerButton;
try { SettingsDangerButton = require('../src/components/settings/SettingsDangerButton.android').default; } catch (error) { if (!String(error.message).includes('Cannot find module')) throw error; }
jest.doMock('../src/components/settings/SettingsDangerButton', () => jest.requireActual('../src/components/settings/SettingsDangerButton.android'));
const SettingsModal = require('../src/components/settings/SettingsModal').default;

describe('Android destructive settings button', () => {
  let renderer;
  afterEach(async () => { if (renderer) await ReactTestRenderer.act(() => renderer.unmount()); renderer = null; });
  it('uses an Expo outlined button and preserves the action', async () => {
    expect(SettingsDangerButton).toBeDefined();
    const onPress = jest.fn();
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<SettingsDangerButton label="Clear listening history" onPress={onPress} />); });
    const button = renderer.root.findByType('ExpoHomePill');
    expect(button.props.variant).toBe('outlined');
    expect(button.props.colors.contentColor).toBe('#FF8A8A');
    expect(button.findByType('ExpoUiText').props.children).toBe('Clear listening history');
    await ReactTestRenderer.act(() => button.props.onClick());
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  it('requires confirmation before clearing history and preserves sign-out callbacks', async () => {
    const platform = Platform.OS;
    Platform.OS = 'android';
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    try {
      const onClearHistory = jest.fn().mockResolvedValue(undefined);
      const onClose = jest.fn();
      const onLogout = jest.fn();
      await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<SettingsModal visible onClose={onClose} onLogout={onLogout} onClearHistory={onClearHistory} />); });
      const button = (label) => renderer.root.findAllByType('ExpoHomePill').find((node) => node.findAllByType('ExpoUiText').some((text) => text.props.children === label));
      await ReactTestRenderer.act(() => button('Clear listening history').props.onClick());
      expect(onClearHistory).not.toHaveBeenCalled();
      const confirm = alert.mock.calls[0][2].find((item) => item.style === 'destructive');
      await ReactTestRenderer.act(async () => { await confirm.onPress(); });
      expect(onClearHistory).toHaveBeenCalledTimes(1);
      await ReactTestRenderer.act(() => button('Sign out').props.onClick());
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onLogout).toHaveBeenCalledTimes(1);
    } finally { Platform.OS = platform; alert.mockRestore(); }
  });
});
