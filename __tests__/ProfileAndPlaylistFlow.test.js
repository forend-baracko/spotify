import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import AddToPlaylistModal from '../src/components/playlists/AddToPlaylistModal';
import ProfileDetailsModal from '../src/components/profile/ProfileDetailsModal';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const findButton = (renderer, label) =>
  renderer.root.findAllByType(TouchableOpacity).find((button) =>
    button.findAllByType(Text).some((text) => text.props.children === label)
  );

describe('profile and playlist flows', () => {
  it('creates a playlist from a track swipe with the track included in creation', async () => {
    const track = { id: 'song-1', title: 'Song', artist: 'Artist' };
    const onCreatePlaylist = jest.fn().mockResolvedValue({ id: 'playlist-1' });
    const onClose = jest.fn();
    let renderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <AddToPlaylistModal
          visible
          track={track}
          playlists={[]}
          onClose={onClose}
          onCreatePlaylist={onCreatePlaylist}
        />
      );
    });

    await ReactTestRenderer.act(() => findButton(renderer, 'New playlist').props.onPress());
    const titleInput = renderer.root.findAllByType(TextInput)[0];
    await ReactTestRenderer.act(() => titleInput.props.onChangeText('Road trip'));
    await ReactTestRenderer.act(async () => findButton(renderer, 'Create').props.onPress());

    expect(onCreatePlaylist).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Road trip', initialTrack: track })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('saves a changed username from the profile view with Firestore required', async () => {
    const onSaveUsername = jest.fn().mockResolvedValue(undefined);
    let renderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ProfileDetailsModal
          visible
          onClose={jest.fn()}
          user={{ email: 'listener@example.com' }}
          userProfile={{ username: 'listener' }}
          onSaveUsername={onSaveUsername}
        />
      );
    });

    await ReactTestRenderer.act(() => findButton(renderer, 'Change username').props.onPress());
    const usernameInput = renderer.root.findByType(TextInput);
    await ReactTestRenderer.act(() => usernameInput.props.onChangeText('new_listener'));
    await ReactTestRenderer.act(async () => findButton(renderer, 'Save username').props.onPress());

    expect(onSaveUsername).toHaveBeenCalledWith('new_listener', { requireFirestore: true });
  });
});
