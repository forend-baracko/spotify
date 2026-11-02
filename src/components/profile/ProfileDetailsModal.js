import React from 'react';
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ProfileDetailsModal = ({ visible, onClose, user, userProfile }) => {
  const insets = useSafeAreaInsets();
  const name =
    userProfile?.displayName ||
    user?.displayName ||
    user?.email?.split('@')[0] ||
    'Music fan';
  const photoURL = userProfile?.photoURL || user?.photoURL;

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
