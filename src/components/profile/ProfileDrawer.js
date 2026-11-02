import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACE } from '../../constants/theme';

const DRAWER_WIDTH = Math.min(Dimensions.get('window').width * 0.9, 430);

const ProfileDrawer = ({
  visible,
  onClose,
  user,
  userProfile,
  onLogout,
  onOpenProfile,
  onOpenRecents,
  onOpenStats,
  onOpenSettings,
}) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const displayName =
    userProfile?.displayName ||
    user?.displayName ||
    (user?.email ? user.email.split('@')[0] : 'Music fan');
  const photoURL = userProfile?.photoURL || user?.photoURL;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: visible ? 0 : -DRAWER_WIDTH,
        duration: visible ? 250 : 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: visible ? 1 : 0,
        duration: visible ? 250 : 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, slideAnim, fadeAnim]);

  const items = [
    { key: 'recents', icon: '◷', label: 'Recents', onPress: onOpenRecents },
    { key: 'stats', icon: '▥', label: 'Listening stats', onPress: onOpenStats },
    { key: 'settings', icon: '⚙', label: 'Settings and privacy', onPress: onOpenSettings },
  ];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>
        <Animated.View
          style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.content,
              { paddingTop: insets.top + SPACE.md, paddingBottom: insets.bottom + SPACE.lg },
            ]}
          >
            <View style={styles.profileHeader}>
              {photoURL ? (
                <Image source={{ uri: photoURL }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarLetter}>{displayName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.identity}>
                <Text style={styles.displayName} numberOfLines={1}>{displayName}</Text>
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onOpenProfile?.();
                  }}
                  accessibilityRole="button"
                >
                  <Text style={styles.viewProfile}>View profile</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.divider} />

            {items.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.menuItem}
                onPress={() => {
                  onClose();
                  item.onPress?.();
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                ) : null}
                {item.hasUpdate ? <View style={styles.updateDot} /> : null}
              </TouchableOpacity>
            ))}

            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.signOut}
              onPress={() => {
                onClose();
                onLogout?.();
              }}
              accessibilityRole="button"
            >
              <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  drawer: {
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: '#1C1C1C',
    borderRightWidth: 1,
    borderRightColor: '#2D2D2D',
    elevation: 16,
  },
  content: {
    paddingHorizontal: 18,
  },
  profileHeader: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#343434',
  },
  avatarLetter: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  identity: {
    flex: 1,
    marginLeft: 12,
  },
  displayName: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  viewProfile: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#343434',
    marginVertical: SPACE.sm,
  },
  menuItem: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 36,
    color: COLORS.textPrimary,
    fontSize: 23,
    fontWeight: '500',
  },
  menuLabel: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#D995F3',
  },
  badgeText: {
    color: '#1A1020',
    fontSize: 12,
    fontWeight: '700',
  },
  updateDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#1686F5',
    marginRight: 3,
  },
  signOut: {
    minHeight: 44,
    justifyContent: 'center',
  },
  signOutText: {
    color: '#FF707A',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ProfileDrawer;
