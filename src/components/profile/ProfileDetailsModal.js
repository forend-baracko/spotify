import React, { useState } from 'react';
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ProfileDetailsModal = ({ visible, onClose, user, userProfile, onSaveUsername }) => {
  const insets = useSafeAreaInsets();
  const username = userProfile?.username || null;
  const name =
    userProfile?.username ||
    userProfile?.displayName ||
    user?.displayName ||
    user?.email?.split('@')[0] ||
    'User';
  const photoURL = userProfile?.photoURL || user?.photoURL;
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editedUsername, setEditedUsername] = useState(username || '');
  const [usernameError, setUsernameError] = useState('');
  const [isSavingUsername, setIsSavingUsername] = useState(false);

  const handleSaveUsername = async () => {
    const trimmedUsername = editedUsername.trim();
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(trimmedUsername)) {
      setUsernameError('Use 3-30 letters, numbers, or underscores.');
      return;
    }
    if (!onSaveUsername) {
      setUsernameError('Username updates are unavailable right now.');
      return;
    }

    setUsernameError('');
    setIsSavingUsername(true);
    try {
      await onSaveUsername(trimmedUsername, { requireFirestore: true });
      setIsEditingUsername(false);
    } catch (error) {
      setUsernameError(error.message || 'Could not save your username. Please try again.');
    } finally {
      setIsSavingUsername(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close profile"
          >
            <Text style={styles.closeIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.details}>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.name}>{name}</Text>
          {username ? <Text style={styles.usernameTag}>@{username}</Text> : null}
          {isEditingUsername ? (
            <View style={styles.usernameEditor}>
              <TextInput
                style={styles.usernameInput}
                value={editedUsername}
                onChangeText={(text) => {
                  setEditedUsername(text.replace(/\s+/g, ''));
                  setUsernameError('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
                placeholder="New username"
                placeholderTextColor="#727272"
                accessibilityLabel="New username"
              />
              {usernameError ? <Text style={styles.usernameError}>{usernameError}</Text> : null}
              <View style={styles.usernameActions}>
                <TouchableOpacity
                  onPress={() => {
                    setEditedUsername(username || '');
                    setUsernameError('');
                    setIsEditingUsername(false);
                  }}
                  disabled={isSavingUsername}
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveUsername}
                  disabled={isSavingUsername}
                  accessibilityRole="button"
                >
                  <Text style={styles.saveText}>
                    {isSavingUsername ? 'Saving...' : 'Save username'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.changeUsernameButton}
              onPress={() => {
                setEditedUsername(username || '');
                setUsernameError('');
                setIsEditingUsername(true);
              }}
              accessibilityRole="button"
            >
              <Text style={styles.changeUsernameText}>Change username</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.email}>{user?.email || 'Email unavailable'}</Text>
          <Text style={styles.description}>
            Your Spotibai account profile
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333333',
  },
  closeIcon: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '300',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 24,
  },
  details: {
    alignItems: 'center',
    padding: 28,
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333333',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '700',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 18,
  },
  usernameTag: {
    color: '#1DB954',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  changeUsernameButton: {
    borderWidth: 1,
    borderColor: '#444444',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 18,
  },
  changeUsernameText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  usernameEditor: {
    width: '100%',
    maxWidth: 320,
    marginTop: 18,
  },
  usernameInput: {
    color: '#FFFFFF',
    backgroundColor: '#242424',
    borderColor: '#444444',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  usernameError: {
    color: '#FF8A8A',
    fontSize: 13,
    marginTop: 6,
  },
  usernameActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  cancelText: {
    color: '#B3B3B3',
    fontSize: 14,
    fontWeight: '600',
  },
  saveText: {
    color: '#1DB954',
    fontSize: 14,
    fontWeight: '700',
  },
  email: {
    color: '#B3B3B3',
    fontSize: 15,
    marginTop: 6,
  },
  description: {
    color: '#727272',
    fontSize: 13,
    marginTop: 18,
  },
});

export default ProfileDetailsModal;
