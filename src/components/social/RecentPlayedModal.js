import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACE } from '../../constants/theme';
import SwipeableTrackRow from '../player/SwipeableTrackRow';

const RecentPlayedModal = ({
    visible,
    onClose,
    recentTracks = [],
    onPlayTrack,
    currentTrack,
    onOpenTrackMenu,
    onAddToQueue,
    onAddToPlaylist,
    onToggleFavorite,
    isLiked,
}) => {
    const insets = useSafeAreaInsets();
    const displayTracks = recentTracks;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { paddingTop: insets.top }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={onClose}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Text style={styles.backIcon}>‹</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Recently Played</Text>
                    <View style={{ width: 36 }} />
                </View>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={{ paddingBottom: 60 }}
                    showsVerticalScrollIndicator={false}
                >
                    {displayTracks.length ? (
                        <>
                            <Text style={styles.timeGroupHeader}>Recently played</Text>
                            {displayTracks.map((track) => (
                                <SwipeableTrackRow
                                    key={`rec-${track.id}`}
                                    track={track}
                                    isSelected={currentTrack?.id === track.id}
                                    onPress={() => onPlayTrack && onPlayTrack(track)}
                                    onOpenMenu={() => onOpenTrackMenu && onOpenTrackMenu(track)}
                                    onAddToQueue={onAddToQueue}
                                    onAddToPlaylist={onAddToPlaylist}
                                    onToggleFavorite={onToggleFavorite}
                                    isLiked={isLiked && isLiked(track.id)}
                                />
                            ))}
                        </>
                    ) : (
                        <Text style={styles.emptyState}>
                            Tracks you play will appear here.
                        </Text>
                    )}
                </ScrollView>
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACE.md,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: '#222',
    },
    backBtn: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backIcon: {
        color: COLORS.textPrimary,
        fontSize: 34,
        fontWeight: '300',
        lineHeight: 36,
    },
    headerTitle: {
        color: COLORS.textPrimary,
        fontSize: 17,
        fontWeight: 'bold',
    },
    scroll: {
        flex: 1,
    },
    timeGroupHeader: {
        color: COLORS.textMuted,
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        paddingHorizontal: SPACE.lg,
        paddingTop: SPACE.md,
        paddingBottom: 6,
    },
    emptyState: {
        color: COLORS.textSecondary,
        fontSize: 14,
        padding: SPACE.lg,
        textAlign: 'center',
    },
});

export default RecentPlayedModal;
