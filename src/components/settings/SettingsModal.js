import React from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACE, RADIUS } from '../../constants/theme';

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
    userProfile?.displayName ||
    user?.displayName ||
    (user?.email ? user.email.split('@')[0] : 'Music fan');

  const handlePrivateSessionChange = async (enabled) => {
    try {
      await onSetPrivateSession?.(enabled);
    } catch (error) {
      Alert.alert('Could not save setting', 'Please try changing private session again.');
    }
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
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings and privacy</Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <Text style={styles.accountName}>{displayName}</Text>
            <Text style={styles.accountEmail}>{user?.email || 'Email unavailable'}</Text>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                onClose();
                onOpenProfile?.();
              }}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>View profile</Text>
            </TouchableOpacity>
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
              <Switch
                value={privateSession}
                onValueChange={handlePrivateSessionChange}
                accessibilityLabel="Private session"
                trackColor={{ false: '#444444', true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your data</Text>
            <Text style={styles.settingDescription}>
              Remove the recent tracks saved on this device. Your playlists and liked tracks will stay.
            </Text>
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={confirmClearHistory}
              accessibilityRole="button"
            >
              <Text style={styles.dangerButtonText}>Clear listening history</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.signOutButton}
            onPress={() => {
              onClose();
              onLogout?.();
            }}
            accessibilityRole="button"
          >
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
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
