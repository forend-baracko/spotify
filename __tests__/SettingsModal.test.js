import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Alert, Switch, Text, TouchableOpacity } from 'react-native';
import SettingsModal from '../src/components/settings/SettingsModal';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('SettingsModal', () => {
  it('changes private session and opens account profile', async () => {
    const onSetPrivateSession = jest.fn();
    const onOpenProfile = jest.fn();
    const onClose = jest.fn();
    let renderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <SettingsModal
          visible
          onClose={onClose}
          user={{ email: 'listener@example.com' }}
          privateSession={false}
          onSetPrivateSession={onSetPrivateSession}
          onOpenProfile={onOpenProfile}
        />
      );
    });

    const privateSessionSwitch = renderer.root.findByType(Switch);
    await ReactTestRenderer.act(() => privateSessionSwitch.props.onValueChange(true));
    const profileButton = renderer.root.findAllByType(TouchableOpacity).find((button) =>
      button.findAllByType(Text).some((text) => text.props.children === 'View profile')
    );
    await ReactTestRenderer.act(() => profileButton.props.onPress());

    expect(onSetPrivateSession).toHaveBeenCalledWith(true);
    expect(onClose).toHaveBeenCalled();
    expect(onOpenProfile).toHaveBeenCalled();
  });

  it('confirms and clears listening history', async () => {
    const onClearHistory = jest.fn().mockResolvedValue(undefined);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    let renderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <SettingsModal
          visible
          onClose={jest.fn()}
          onClearHistory={onClearHistory}
        />
      );
    });

    const clearButton = renderer.root.findAllByType(TouchableOpacity).find((button) =>
      button.findAllByType(Text).some((text) => text.props.children === 'Clear listening history')
    );
    await ReactTestRenderer.act(() => clearButton.props.onPress());
    const clearAction = alert.mock.calls[0][2].find((action) => action.text === 'Clear history');
    await ReactTestRenderer.act(async () => clearAction.onPress());

    expect(onClearHistory).toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(
      'History cleared',
      'Your saved listening history has been removed.'
    );
    alert.mockRestore();
  });

  it('signs out from settings', async () => {
    const onLogout = jest.fn();
    const onClose = jest.fn();
    let renderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <SettingsModal visible onClose={onClose} onLogout={onLogout} />
      );
    });

    const signOutButton = renderer.root.findAllByType(TouchableOpacity).find((button) =>
      button.findAllByType(Text).some((text) => text.props.children === 'Sign out')
    );
    await ReactTestRenderer.act(() => signOutButton.props.onPress());

    expect(onClose).toHaveBeenCalled();
    expect(onLogout).toHaveBeenCalled();
  });
});
