import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import ProfileDrawer from '../src/components/profile/ProfileDrawer';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('ProfileDrawer', () => {
  it('opens the real recents screen from the profile menu', async () => {
    const onOpenRecents = jest.fn();
    const onClose = jest.fn();
    let renderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ProfileDrawer
          visible
          onClose={onClose}
          user={{ uid: 'user-1', email: 'listener@example.com' }}
          onOpenRecents={onOpenRecents}
        />
      );
    });

    const statsButton = renderer.root.findAllByType(TouchableOpacity).find((button) =>
      button.findAllByType(Text).some((text) => text.props.children === 'Recents')
    );
    await ReactTestRenderer.act(() => statsButton.props.onPress());

    expect(onClose).toHaveBeenCalled();
    expect(onOpenRecents).toHaveBeenCalled();
  });

  it('opens the actual profile details from the profile link', async () => {
    const onOpenProfile = jest.fn();
    const onClose = jest.fn();
    let renderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ProfileDrawer
          visible
          onClose={onClose}
          user={{ uid: 'user-1', email: 'listener@example.com' }}
          onOpenProfile={onOpenProfile}
        />
      );
    });

    const profileButton = renderer.root.findAllByType(TouchableOpacity).find((button) =>
      button.findAllByType(Text).some((text) => text.props.children === 'View profile')
    );
    await ReactTestRenderer.act(() => profileButton.props.onPress());

    expect(onClose).toHaveBeenCalled();
    expect(onOpenProfile).toHaveBeenCalled();
  });

  it.each([
    ['Listening stats', 'onOpenStats'],
    ['Settings and privacy', 'onOpenSettings'],
  ])('opens %s from the profile menu', async (label, callbackName) => {
    const callbacks = {
      onOpenStats: jest.fn(),
      onOpenSettings: jest.fn(),
    };
    const onClose = jest.fn();
    let renderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ProfileDrawer
          visible
          onClose={onClose}
          user={{ uid: 'user-1', email: 'listener@example.com' }}
          {...callbacks}
        />
      );
    });

    const button = renderer.root.findAllByType(TouchableOpacity).find((item) =>
      item.findAllByType(Text).some((text) => text.props.children === label)
    );
    await ReactTestRenderer.act(() => button.props.onPress());

    expect(onClose).toHaveBeenCalled();
    expect(callbacks[callbackName]).toHaveBeenCalled();
  });

  it('signs out from the profile menu', async () => {
    const onLogout = jest.fn();
    const onClose = jest.fn();
    let renderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ProfileDrawer
          visible
          onClose={onClose}
          onLogout={onLogout}
          user={{ uid: 'user-1', email: 'listener@example.com' }}
        />
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
