import React, { useEffect, useRef } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Animated,
    Dimensions,
    Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACE } from '../../constants/theme';
import { getArtworkSource } from '../../utils/artworkHelper';
import AppIcon from '../icons/AppIcon';
import SecondaryButton from '../buttons/SecondaryButton';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const TrackActionSheetModal = ({
    visible,
    track,
    onClose,
    onAddToPlaylist,
    onRemoveFromPlaylist,
    onAddToQueue,
    onGoToQueue,
    onToggleLike,
    isLiked = false,
    isInPlaylist = false,
}) => {
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 200,
                    friction: 20,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: SCREEN_HEIGHT,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible, slideAnim, fadeAnim]);

    if (!track) return null;

    const handleShare = async () => {
        onClose();
        try {
            await Share.share({
                title: track.title,
                message: `Check out "${track.title}" by ${track.artist} on Spotify! https://open.spotify.com/track/${track.id}`,
            });
        } catch (error) {
            console.warn('Share error:', error);
        }
    };

    const actionItems = [
        {
            id: 'like',
            icon: 'favorite',
            title: isLiked ? 'Remove from Liked Songs' : 'Save to your Liked Songs',
            onPress: () => {
                onClose();
                if (onToggleLike) onToggleLike(track);
            },
        },
        {
            id: 'queue',
            icon: 'queue',
            title: 'Add to queue',
            onPress: () => {
                onClose();
                if (onAddToQueue) onAddToQueue(track);
            },
        },
        {
            id: 'go_to_queue',
            icon: 'queue',
            title: 'Go to queue',
            onPress: () => {
                onClose();
                if (onGoToQueue) onGoToQueue();
            },
        },
        {
            id: 'add_playlist',
            icon: 'playlistAdd',
            title: 'Add to playlist',
            onPress: () => {
                onClose();
                if (onAddToPlaylist) onAddToPlaylist(track);
            },
        },
        ...(isInPlaylist || onRemoveFromPlaylist
            ? [
                  {
                      id: 'remove_playlist',
                      icon: 'delete',
                      title: 'Remove from this playlist',
                      isDestructive: true,
                      onPress: () => {
                          onClose();
                          if (onRemoveFromPlaylist) onRemoveFromPlaylist(track);
                      },
                  },
              ]
            : []),
        {
            id: 'share',
            icon: 'share',
            title: 'Share song',
            onPress: handleShare,
        },
    ];

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
                </TouchableWithoutFeedback>

                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            transform: [{ translateY: slideAnim }],
                            paddingBottom: Math.max(insets.bottom, 20),
                        },
                    ]}
                >
                    {/* Drag pill handle */}
                    <View style={styles.handleContainer}>
                        <View style={styles.handle} />
                    </View>

                    {/* Track info header */}
                    <View style={styles.trackHeader}>
                        <Image source={getArtworkSource(track.artwork)} style={styles.trackArtwork} />
                        <View style={styles.trackMeta}>
                            <Text style={styles.trackTitle} numberOfLines={1}>
                                {track.title}
                            </Text>
                            <Text style={styles.trackArtist} numberOfLines={1}>
                                {track.artist} {track.album ? `• ${track.album}` : ''}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Action rows */}
                    <View style={styles.actionsList}>
                        {actionItems.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.actionRow}
                                activeOpacity={0.7}
                                onPress={item.onPress}
                                accessibilityRole="button"
                                accessibilityLabel={item.title}
                            >
                                <View style={styles.actionIconBox}>
                                    <AppIcon name={item.icon} size={24} color={item.isDestructive ? '#FF6B6B' : '#FFFFFF'} />
                                </View>
                                <Text
                                    style={[
                                        styles.actionTitle,
                                        item.isDestructive && styles.destructiveText,
                                    ]}
                                >
                                    {item.title}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Close button */}
                    <SecondaryButton label="Close" onPress={onClose} />
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
    },
    sheet: {
        backgroundColor: '#1E1E1E',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: SPACE.lg,
        maxHeight: SCREEN_HEIGHT * 0.85,
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    handle: {
        width: 38,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#555',
    },
    trackHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACE.xs,
        marginBottom: SPACE.sm,
    },
    trackArtwork: {
        width: 52,
        height: 52,
        borderRadius: 6,
        backgroundColor: '#282828',
    },
    trackMeta: {
        flex: 1,
        marginLeft: SPACE.md,
    },
    trackTitle: {
        color: COLORS.textPrimary,
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 3,
    },
    trackArtist: {
        color: COLORS.textSecondary,
        fontSize: 13,
    },
    divider: {
        height: 1,
        backgroundColor: '#2A2A2A',
        marginVertical: SPACE.xs,
    },
    actionsList: {
        marginVertical: SPACE.xs,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 13,
    },
    actionIconBox: {
        width: 36,
        alignItems: 'center',
        marginRight: SPACE.md,
    },
    actionIcon: {
        fontSize: 20,
        color: COLORS.textPrimary,
    },
    actionTitle: {
        color: COLORS.textPrimary,
        fontSize: 15,
        fontWeight: '500',
    },
    destructiveText: {
        color: '#FF5252',
    },
    closeButton: {
        alignItems: 'center',
        paddingVertical: 14,
        marginTop: SPACE.xs,
        borderTopWidth: 1,
        borderTopColor: '#282828',
    },
    closeButtonText: {
        color: COLORS.textSecondary,
        fontSize: 15,
        fontWeight: '600',
    },
});

export default TrackActionSheetModal;
