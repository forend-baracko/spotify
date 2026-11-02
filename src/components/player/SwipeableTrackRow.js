import React, { useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Animated,
    PanResponder,
    Dimensions,
} from 'react-native';
import { COLORS, SPACE, RADIUS } from '../../constants/theme';
import { getArtworkSource } from '../../utils/artworkHelper';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Thresholds for gestures
const SWIPE_RIGHT_ACTION_THRESHOLD = 70; // past 70px to the right triggers Add to Queue
const SWIPE_LEFT_MAX = -140; // allows revealing both squares (70px + 70px)

const SwipeableTrackRow = ({
    track,
    isSelected = false,
    onPress,
    onOpenMenu,
    onAddToQueue,
    onAddToPlaylist,
    onToggleFavorite,
    isLiked = false,
    isInPlaylist = false,
}) => {
    const panX = useRef(new Animated.Value(0)).current;
    const currentPanX = useRef(0);

    // Keep track of currentPanX for snap calculations
    panX.addListener(({ value }) => {
        currentPanX.current = value;
    });

    const resetPosition = (callback) => {
        Animated.spring(panX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 220,
            friction: 18,
        }).start(() => {
            if (callback) callback();
        });
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                // Only capture horizontal movements that clearly dominate vertical scrolling
                return (
                    Math.abs(gestureState.dx) > 12 &&
                    Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.4
                );
            },
            onPanResponderGrant: () => {
                panX.setOffset(currentPanX.current);
                panX.setValue(0);
            },
            onPanResponderMove: (evt, gestureState) => {
                // Limit swipe ranges
                // To the right: up to 110px
                // To the left: up to -160px
                let newX = gestureState.dx;
                if (newX > 110) newX = 110 + (newX - 110) * 0.2;
                if (newX < -160) newX = -160 + (newX + 160) * 0.2;
                panX.setValue(newX);
            },
            onPanResponderRelease: (evt, gestureState) => {
                panX.flattenOffset();
                const totalX = currentPanX.current;

                // 1. Swiping RIGHT -> Add to Queue
                if (totalX > SWIPE_RIGHT_ACTION_THRESHOLD) {
                    if (onAddToQueue) onAddToQueue(track);
                    resetPosition();
                    return;
                }

                // 2. Swiping LEFT -> Open Add to Playlist
                if (totalX < -60) {
                    resetPosition(() => {
                        if (onAddToPlaylist) onAddToPlaylist(track);
                    });
                    return;
                }

                // Otherwise snap back to 0
                resetPosition();
            },
            onPanResponderTerminate: () => {
                panX.flattenOffset();
                resetPosition();
            },
        })
    ).current;

    return (
        <View style={styles.container}>
            {/* UNDERLAY: Right-swipe background (Left side revealed) -> Add to Queue */}
            <View style={styles.leftUnderlay}>
                <TouchableOpacity
                    style={styles.queueActionBox}
                    activeOpacity={0.8}
                    onPress={() => {
                        if (onAddToQueue) onAddToQueue(track);
                        resetPosition();
                    }}
                >
                    <Text style={styles.actionIcon}>⤹</Text>
                    <Text style={styles.actionLabel}>Queue</Text>
                </TouchableOpacity>
            </View>

            {/* UNDERLAY: Left-swipe background (Right side revealed) -> Two distinct squares */}
            <View style={styles.rightUnderlay}>
                {/* Square 1: Add to Playlist */}
                <TouchableOpacity
                    style={styles.playlistActionBox}
                    activeOpacity={0.8}
                    onPress={() => {
                        resetPosition(() => {
                            if (onAddToPlaylist) onAddToPlaylist(track);
                        });
                    }}
                >
                    <Text style={styles.actionIcon}>➕🎵</Text>
                    <Text style={styles.actionLabel}>Playlist</Text>
                </TouchableOpacity>

                {/* Square 2: Favorite / Like */}
                <TouchableOpacity
                    style={[styles.favoriteActionBox, isLiked && styles.favoriteActiveBox]}
                    activeOpacity={0.8}
                    onPress={() => {
                        resetPosition(() => {
                            if (onToggleFavorite) onToggleFavorite(track);
                        });
                    }}
                >
                    <Text style={styles.actionIcon}>{isLiked ? '💚' : '♡'}</Text>
                    <Text style={styles.actionLabel}>{isLiked ? 'Liked' : 'Favorite'}</Text>
                </TouchableOpacity>
            </View>

            {/* FOREGROUND: Track Row */}
            <Animated.View
                style={[
                    styles.foreground,
                    isSelected && styles.foregroundActive,
                    { transform: [{ translateX: panX }] },
                ]}
                {...panResponder.panHandlers}
            >
                <TouchableOpacity
                    style={styles.contentRow}
                    activeOpacity={0.7}
                    onPress={() => {
                        if (currentPanX.current !== 0) {
                            resetPosition();
                        } else if (onPress) {
                            onPress(track);
                        }
                    }}
                >
                    {/* Artwork */}
                    <View style={styles.artworkContainer}>
                        <Image source={getArtworkSource(track.artwork)} style={styles.artwork} />
                        {isSelected && (
                            <View style={styles.playingIndicator}>
                                <Text style={styles.playingNote}>♪</Text>
                            </View>
                        )}
                    </View>

                    {/* Title & Artist */}
                    <View style={styles.infoContainer}>
                        <Text
                            style={[styles.title, isSelected && styles.titleActive]}
                            numberOfLines={1}
                        >
                            {track.title}
                        </Text>
                        <View style={styles.artistRow}>
                            {isLiked && <Text style={styles.likedDot}>💚 </Text>}
                            <Text style={styles.artist} numberOfLines={1}>
                                {track.artist}
                            </Text>
                        </View>
                    </View>

                    {/* Three-Dot (⋯) Button instead of duration & plays */}
                    <TouchableOpacity
                        style={styles.moreButton}
                        activeOpacity={0.6}
                        onPress={() => {
                            if (onOpenMenu) onOpenMenu(track);
                        }}
                        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                    >
                        <Text style={styles.moreDotsText}>•••</Text>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        backgroundColor: COLORS.background,
        overflow: 'hidden',
        borderBottomWidth: 0.5,
        borderBottomColor: '#1A1A1A',
    },
    // Left side underlay (Revealed on swipe RIGHT)
    leftUnderlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: 100,
        backgroundColor: COLORS.primary, // Spotify Green
        justifyContent: 'center',
        alignItems: 'center',
    },
    queueActionBox: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Right side underlay (Revealed on swipe LEFT) - Two separate squares
    rightUnderlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        right: 0,
        width: 140,
        flexDirection: 'row',
    },
    // Square 1: Playlist
    playlistActionBox: {
        width: 70,
        height: '100%',
        backgroundColor: '#2E7D32', // Forest/Spotify Dark Green or Accent
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#1A1A1A',
    },
    // Square 2: Favorite
    favoriteActionBox: {
        width: 70,
        height: '100%',
        backgroundColor: '#8E24AA', // Purple for favorite
        justifyContent: 'center',
        alignItems: 'center',
    },
    favoriteActiveBox: {
        backgroundColor: '#1DB954',
    },
    actionIcon: {
        fontSize: 18,
        color: COLORS.white,
        marginBottom: 2,
    },
    actionLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: COLORS.white,
        letterSpacing: 0.2,
    },
    // Foreground
    foreground: {
        backgroundColor: COLORS.background,
        zIndex: 2,
    },
    foregroundActive: {
        backgroundColor: '#1E1E1E',
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: SPACE.md,
    },
    artworkContainer: {
        position: 'relative',
        width: 48,
        height: 48,
        borderRadius: 4,
        overflow: 'hidden',
        marginRight: SPACE.md,
        backgroundColor: '#282828',
    },
    artwork: {
        width: '100%',
        height: '100%',
    },
    playingIndicator: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playingNote: {
        color: COLORS.primary,
        fontSize: 18,
        fontWeight: 'bold',
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'center',
        marginRight: SPACE.sm,
    },
    title: {
        color: COLORS.textPrimary,
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 3,
    },
    titleActive: {
        color: COLORS.primary,
    },
    artistRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    likedDot: {
        fontSize: 11,
    },
    artist: {
        color: COLORS.textSecondary,
        fontSize: 13,
    },
    moreButton: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    moreDotsText: {
        color: COLORS.textSecondary,
        fontSize: 16,
        letterSpacing: 1.5,
    },
});

export default SwipeableTrackRow;
