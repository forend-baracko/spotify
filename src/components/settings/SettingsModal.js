import React from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,

  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACE, RADIUS } from '../../constants/theme';
import AppIcon from '../icons/AppIcon';
import PrivateSessionSwitch from './PrivateSessionSwitch';
import SecondaryButton from '../buttons/SecondaryButton';
import SettingsDangerButton from './SettingsDangerButton';

const SettingsModal = ({
  visible,
  onClose,
  user,
  userProfile,
  onLogout,
  onOpenProfile,
  privateSession,
  onSetPrivateSession,
  onClearHistory,
}) => {
  const insets = useSafeAreaInsets();
  const displayName =
    userProfile?.username ||
    userProfile?.displayName ||
    user?.displayName ||
    (user?.email ? user.email.split('@')[0] : 'User');

  const handlePrivateSessionChange = async (enabled) => {
    try {
      await onSetPrivateSession?.(enabled);
    } catch (error) {
      Alert.alert('Could not save setting', 'Please try changing private session again.');
    }
  };

  const handleOpenProfile = () => {
    onClose();
    onOpenProfile?.();
  };

  const handleSignOut = () => {
    onClose();
    onLogout?.();
  };

  const confirmClearHistory = () => {
    Alert.alert(
      'Clear listening history?',
      'This removes your saved recent tracks and listening stats from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear history',
          style: 'destructive',
          onPress: async () => {
            try {
              await onClearHistory?.();
              Alert.alert('History cleared', 'Your saved listening history has been removed.');
            } catch (error) {
              console.warn('Could not clear listening history:', error);
              Alert.alert('Could not clear history', 'Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close settings"
          >
            <AppIcon name="back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings and privacy</Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <Text style={styles.accountName}>{displayName}</Text>
            <Text style={styles.accountEmail}>{user?.email || 'Email unavailable'}</Text>
            {Platform.OS === 'android' ? (
              <SecondaryButton label="View profile" onPress={handleOpenProfile} style={styles.secondaryButtonNative} />
            ) : (
              <TouchableOpacity style={styles.secondaryButton} onPress={handleOpenProfile} accessibilityRole="button">
                <Text style={styles.secondaryButtonText}>View profile</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy</Text>
            <View style={styles.settingRow}>
              <View style={styles.settingCopy}>
                <Text style={styles.settingTitle}>Private session</Text>
                <Text style={styles.settingDescription}>
                  When enabled, tracks you play are not saved to Recents or listening stats.
                </Text>
              </View>
              <PrivateSessionSwitch
                value={privateSession}
                onValueChange={handlePrivateSessionChange}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your data</Text>
            <Text style={styles.settingDescription}>
              Remove the recent tracks saved on this device. Your playlists and liked tracks will stay.
            </Text>
            {Platform.OS === 'android' ? (
              <SettingsDangerButton label="Clear listening history" onPress={confirmClearHistory} style={styles.dangerButtonNative} />
            ) : (
              <TouchableOpacity style={styles.dangerButton} onPress={confirmClearHistory} accessibilityRole="button">
                <Text style={styles.dangerButtonText}>Clear listening history</Text>
              </TouchableOpacity>
            )}
          </View>

          {Platform.OS === 'android' ? (
            <SettingsDangerButton label="Sign out" onPress={handleSignOut} fullWidth style={styles.signOutButtonNative} />
          ) : (
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} accessibilityRole="button">
              <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerButton: {
    width: 40,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    color: COLORS.textPrimary,
    fontSize: 34,
    fontWeight: '300',
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  content: {
    padding: SPACE.md,
    paddingBottom: SPACE.xxl,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.divider,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACE.md,
    marginBottom: SPACE.md,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACE.sm,
  },
  accountName: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  accountEmail: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: SPACE.xs,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.circle,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
    marginTop: SPACE.md,
  },
  secondaryButtonNative: { alignSelf: 'flex-start', marginTop: SPACE.md },
  secondaryButtonText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingCopy: {
    flex: 1,
    marginRight: SPACE.sm,
  },
  settingTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  settingDescription: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: SPACE.xs,
  },
  dangerButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#743B3B',
    borderRadius: RADIUS.circle,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
    marginTop: SPACE.md,
  },
  dangerButtonNative: { marginTop: SPACE.md },
  signOutButtonNative: { marginTop: SPACE.xs },
  dangerButtonText: {
    color: '#FF8A8A',
    fontSize: 14,
    fontWeight: '600',
  },
  signOutButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.circle,
    marginTop: SPACE.xs,
  },
  signOutText: {
    color: '#FF8A8A',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default SettingsModal;
