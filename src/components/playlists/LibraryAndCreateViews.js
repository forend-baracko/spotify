import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { COLORS, SPACE, RADIUS } from '../../constants/theme';
import { useMusic } from '../../context/MusicContext';
import CreatePlaylistModal from './CreatePlaylistModal';

export const LibraryView = ({ onOpenPlaylist }) => {
    const { playlists } = useMusic();

    return (
        <View style={styles.container}>
            <ScrollView style={styles.tabContent} contentContainerStyle={styles.scrollPad}>
                {/* Header */}
                <Text style={[styles.tabHeading, styles.libraryHeading]}>Your Library</Text>

                {/* Playlist list */}
                {playlists.map((pl) => {
                    const count = pl.tracks ? pl.tracks.length : 0;
                    return (
                        <TouchableOpacity
                            key={pl.id}
                            style={styles.playlistRow}
                            activeOpacity={0.7}
                            onPress={() => {
                                if (onOpenPlaylist) {
                                    onOpenPlaylist(pl);
                                }
                            }}
                        >
                            <View style={styles.playlistIconBox}>
                                <Text style={styles.playlistEmoji}>{pl.icon || '🎶'}</Text>
                            </View>
                            <View style={styles.playlistInfo}>
                                <Text style={styles.playlistTitle}>{pl.title}</Text>
                                <Text style={styles.playlistMeta}>
                                    {pl.type} • {count} {count === 1 ? 'song' : 'songs'}
                                </Text>
                            </View>
                            <Text style={styles.chevron}>›</Text>
                        </TouchableOpacity>
                    );
                })}

            </ScrollView>
        </View>
    );
};

export const CreateView = ({ onOpenPlaylist, onSwitchToLibrary, userProfile }) => {
    const { createPlaylist } = useMusic();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const options = [
        {
            id: 'c1',
            title: 'Playlist',
            desc: 'Build a playlist with songs or episodes',
            icon: '🎶',
            action: () => setIsCreateModalOpen(true),
        },
    ];

    const handleCreatePlaylist = async (playlistData) => {
        const newPl = await createPlaylist(playlistData);
        if (newPl && onOpenPlaylist) {
            onOpenPlaylist(newPl);
        } else if (onSwitchToLibrary) {
            onSwitchToLibrary();
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView style={styles.tabContent} contentContainerStyle={styles.scrollPad}>
                <Text style={styles.tabHeading}>Create</Text>
                <Text style={styles.tabSubheading}>Start something new with your friends or solo</Text>

                <View style={styles.createGrid}>
                    {options.map((opt) => (
                        <TouchableOpacity
                            key={opt.id}
                            style={styles.createCard}
                            activeOpacity={0.7}
                            onPress={opt.action}
                        >
                            <View style={styles.createIconBox}>
                                <Text style={styles.createEmoji}>{opt.icon}</Text>
                            </View>
                            <View style={styles.createTextContainer}>
                                <Text style={styles.createCardTitle}>{opt.title}</Text>
                                <Text style={styles.createCardDesc}>{opt.desc}</Text>
                            </View>
                            <Text style={styles.createPlus}>+</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            <CreatePlaylistModal
                visible={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreatePlaylist}
                userProfile={userProfile}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    tabContent: {
        flex: 1,
    },
    scrollPad: {
        paddingHorizontal: SPACE.lg,
        paddingTop: SPACE.sm,
        paddingBottom: 110,
    },
    tabHeading: {
        color: COLORS.textPrimary,
        fontSize: 24,
        fontWeight: 'bold',
    },
    libraryHeading: {
        marginBottom: SPACE.md,
    },
    tabSubheading: {
        color: COLORS.textSecondary,
        fontSize: 14,
        marginBottom: SPACE.lg,
    },
    playlistRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACE.sm,
        borderBottomWidth: 0.5,
        borderBottomColor: '#202020',
    },
    playlistIconBox: {
        width: 52,
        height: 52,
        borderRadius: RADIUS.xs,
        backgroundColor: '#262626',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playlistEmoji: {
        fontSize: 24,
    },
    playlistInfo: {
        flex: 1,
        marginLeft: SPACE.md,
    },
    playlistTitle: {
        color: COLORS.textPrimary,
        fontSize: 15,
        fontWeight: '600',
    },
    playlistMeta: {
        color: COLORS.textSecondary,
        fontSize: 12,
        marginTop: 3,
    },
    chevron: {
        color: COLORS.textMuted,
        fontSize: 20,
    },
    createGrid: {
        marginTop: SPACE.xs,
    },
    createCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated,
        padding: SPACE.md,
        borderRadius: RADIUS.md,
        marginBottom: SPACE.md,
        borderWidth: 1,
        borderColor: '#2D2D2D',
    },
    createIconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#353535',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACE.md,
    },
    createEmoji: {
        fontSize: 22,
    },
    createTextContainer: {
        flex: 1,
    },
    createCardTitle: {
        color: COLORS.textPrimary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    createCardDesc: {
        color: COLORS.textSecondary,
        fontSize: 12,
        marginTop: 3,
    },
    createPlus: {
        color: COLORS.primary,
        fontSize: 24,
        fontWeight: '300',
        marginLeft: SPACE.sm,
    },
});
