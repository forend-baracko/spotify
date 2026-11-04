import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    TouchableWithoutFeedback,
    ScrollView,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACE, RADIUS } from '../../constants/theme';
import { getArtworkSource } from '../../utils/artworkHelper';
import CreatePlaylistModal from './CreatePlaylistModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const AddToPlaylistModal = ({
    visible,
    track,
    playlists = [],
    onClose,
    onSelectPlaylist,
    onCreatePlaylist,
    userProfile,
}) => {
    const insets = useSafeAreaInsets();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    if (!track) return null;

    const handleCreateAndAdd = async (playlistData) => {
        if (!onCreatePlaylist) {
            throw new Error('Playlist creation is unavailable.');
        }
        const newPlaylist = await onCreatePlaylist({
            ...playlistData,
            initialTrack: track,
        });
        if (!newPlaylist) {
            throw new Error('Playlist creation did not return a playlist.');
        }
        onClose();
    };

    return (
        <>
            <Modal
                transparent
                visible={visible && !isCreateModalOpen}
                animationType="slide"
                onRequestClose={onClose}
            >
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.backdrop} />
                </TouchableWithoutFeedback>

                <View
                    style={[
                        styles.sheet,
                        { paddingBottom: Math.max(insets.bottom, 20) },
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Add to playlist</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Text style={styles.doneText}>Done</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Track Preview */}
                    <View style={styles.trackCard}>
                        <Image source={getArtworkSource(track.artwork)} style={styles.artwork} />
                        <View style={styles.trackInfo}>
                            <Text style={styles.trackTitle} numberOfLines={1}>
                                {track.title}
                            </Text>
                            <Text style={styles.trackArtist} numberOfLines={1}>
                                {track.artist}
                            </Text>
                        </View>
                    </View>

                    {/* New Playlist Action */}
                    <TouchableOpacity
                        style={styles.newPlaylistBtn}
                        activeOpacity={0.8}
                        onPress={() => setIsCreateModalOpen(true)}
                    >
                        <View style={styles.newPlaylistIconBox}>
                            <Text style={styles.newPlaylistPlus}>+</Text>
                        </View>
                        <View style={styles.newPlaylistInfo}>
                            <Text style={styles.newPlaylistText}>New playlist</Text>
                            <Text style={styles.newPlaylistSubtext}>Create and add this song</Text>
                        </View>
                    </TouchableOpacity>

                    <Text style={styles.sectionLabel}>Your Playlists</Text>

                    {/* Playlist List */}
                    <ScrollView
                        style={styles.playlistList}
                        showsVerticalScrollIndicator={false}
                    >
                        {playlists.map((pl) => {
                            const count = pl.tracks ? pl.tracks.length : 0;
                            const isAlreadyIn = (pl.tracks || []).some(t => t.id === track.id);

                            return (
                                <TouchableOpacity
                                    key={pl.id}
                                    style={styles.playlistRow}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        if (onSelectPlaylist) {
                                            onSelectPlaylist(pl.id, track);
                                        }
                                        onClose();
                                    }}
                                >
                                    <View style={styles.playlistIconBox}>
                                        <Text style={styles.playlistEmoji}>{pl.icon || '🎶'}</Text>
                                    </View>
                                    <View style={styles.playlistInfo}>
                                        <Text style={styles.playlistTitle} numberOfLines={1}>
                                            {pl.title}
                                        </Text>
                                        <Text style={styles.playlistMeta}>
                                            {count} {count === 1 ? 'song' : 'songs'}
                                        </Text>
                                    </View>
                                    {isAlreadyIn ? (
                                        <View style={styles.addedBadge}>
                                            <Text style={styles.addedBadgeText}>Added ✓</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.addPlus}>+</Text>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>

            </Modal>
            <CreatePlaylistModal
                visible={visible && isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateAndAdd}
                userProfile={userProfile}
            />
        </>
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
        maxHeight: SCREEN_HEIGHT * 0.8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACE.md,
        borderBottomWidth: 1,
        borderBottomColor: '#282828',
    },
    title: {
        color: COLORS.textPrimary,
        fontSize: 18,
        fontWeight: 'bold',
    },
    doneText: {
        color: COLORS.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    trackCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACE.sm,
        backgroundColor: '#262626',
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACE.sm,
        marginVertical: SPACE.sm,
    },
    artwork: {
        width: 44,
        height: 44,
        borderRadius: 4,
    },
    trackInfo: {
        flex: 1,
        marginLeft: SPACE.sm,
    },
    trackTitle: {
        color: COLORS.textPrimary,
        fontSize: 14,
        fontWeight: '600',
    },
    trackArtist: {
        color: COLORS.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    newPlaylistBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACE.sm,
        marginBottom: SPACE.xs,
    },
    newPlaylistIconBox: {
        width: 48,
        height: 48,
        borderRadius: 4,
        backgroundColor: '#2E2E2E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    newPlaylistPlus: {
        color: COLORS.primary,
        fontSize: 26,
        fontWeight: '300',
    },
    newPlaylistInfo: {
        flex: 1,
        marginLeft: SPACE.md,
    },
    newPlaylistText: {
        color: COLORS.textPrimary,
        fontSize: 15,
        fontWeight: '600',
    },
    newPlaylistSubtext: {
        color: COLORS.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    sectionLabel: {
        color: COLORS.textMuted,
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginTop: SPACE.xs,
        marginBottom: SPACE.xs,
    },
    playlistList: {
        maxHeight: 280,
    },
    playlistRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: '#282828',
    },
    playlistIconBox: {
        width: 44,
        height: 44,
        borderRadius: 4,
        backgroundColor: '#2C2C2C',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playlistEmoji: {
        fontSize: 20,
    },
    playlistInfo: {
        flex: 1,
        marginLeft: SPACE.md,
    },
    playlistTitle: {
        color: COLORS.textPrimary,
        fontSize: 15,
        fontWeight: '500',
    },
    playlistMeta: {
        color: COLORS.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    addedBadge: {
        backgroundColor: '#1E382B',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
    },
    addedBadgeText: {
        color: COLORS.primary,
        fontSize: 11,
        fontWeight: '600',
    },
    addPlus: {
        color: COLORS.textSecondary,
        fontSize: 22,
        paddingHorizontal: 8,
    },
});

export default AddToPlaylistModal;
