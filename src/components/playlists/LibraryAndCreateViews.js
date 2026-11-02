import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { COLORS, SPACE, RADIUS } from '../../constants/theme';
import { useMusic } from '../../context/MusicContext';
import CreatePlaylistModal from './CreatePlaylistModal';

export const LibraryView = ({
    onOpenPlaylist,
    userProfile,
}) => {
    const { playlists, createPlaylist } = useMusic();
    const [selectedChip, setSelectedChip] = useState('Playlists');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const chips = ['Playlists', 'Podcasts', 'Artists', 'Downloaded'];

    const handleCreatePlaylist = async (playlistData) => {
        const newPl = await createPlaylist(playlistData);
        if (newPl && onOpenPlaylist) {
            onOpenPlaylist(newPl);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView style={styles.tabContent} contentContainerStyle={styles.scrollPad}>
                {/* Header */}
                <View style={styles.headerRow}>
                    <Text style={styles.tabHeading}>Your Library</Text>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        activeOpacity={0.8}
                        onPress={() => setIsCreateModalOpen(true)}
                    >
                        <Text style={styles.actionBtnText}>+ Add</Text>
                    </TouchableOpacity>
                </View>

                {/* Filter Chips */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.chipsScroll}
                    contentContainerStyle={styles.chipsRow}
                >
                    {chips.map((chip) => {
                        const isActive = selectedChip === chip;
                        return (
                            <TouchableOpacity
                                key={chip}
                                style={[styles.chip, isActive && styles.activeChip]}
                                onPress={() => setSelectedChip(chip)}
                            >
                                <Text style={[styles.chipText, isActive && styles.activeChipText]}>
                                    {chip}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

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

            {/* Create Playlist Modal */}
            <CreatePlaylistModal
                visible={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreatePlaylist}
                userProfile={userProfile}
            />
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
        {
            id: 'c2',
            title: 'Blend',
            desc: 'Combine tastes with friends into a shared playlist',
            icon: '👥',
            action: () => Alert.alert('Spotify Blend', 'Invite a friend to blend your music tastes together!'),
        },
        {
            id: 'c3',
            title: 'Folder',
            desc: 'Organize your playlists neatly into folders',
            icon: '📁',
            action: () => Alert.alert('New Folder', 'Playlist folders help categorize your favorite genres.'),
        },
        {
            id: 'c4',
            title: 'Jam Session',
            desc: 'Listen together with friends in real time',
            icon: '📻',
            action: () => Alert.alert('Spotify Jam', 'Starting a live Jam session. Friends can join with a code or link.'),
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
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACE.md,
    },
    tabHeading: {
        color: COLORS.textPrimary,
        fontSize: 24,
        fontWeight: 'bold',
    },
    tabSubheading: {
        color: COLORS.textSecondary,
        fontSize: 14,
        marginBottom: SPACE.lg,
    },
    actionBtn: {
        backgroundColor: COLORS.surfaceElevated,
        paddingHorizontal: SPACE.md,
        paddingVertical: 6,
        borderRadius: RADIUS.circle,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    actionBtnText: {
        color: COLORS.white,
        fontSize: 13,
        fontWeight: '600',
    },
    chipsScroll: {
        marginBottom: SPACE.md,
    },
    chipsRow: {
        flexDirection: 'row',
        paddingRight: SPACE.md,
    },
    chip: {
        backgroundColor: COLORS.surfaceElevated,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: RADIUS.circle,
        marginRight: 8,
    },
    activeChip: {
        backgroundColor: COLORS.white,
    },
    chipText: {
        color: COLORS.textPrimary,
        fontSize: 12,
        fontWeight: '600',
    },
    activeChipText: {
        color: COLORS.black,
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
