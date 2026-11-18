import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Platform,

} from 'react-native';
import { COLORS, SPACE, RADIUS } from '../../constants/theme';
import { useMusic } from '../../context/MusicContext';
import CreatePlaylistModal from './CreatePlaylistModal';

import LibraryPlaylistRow from './LibraryPlaylistRow';
import CreatePlaylistCard from './CreatePlaylistCard';

export const LibraryView = ({ onOpenPlaylist }) => {
    const { playlists } = useMusic();

    return (
        <View style={styles.container}>
            <ScrollView style={styles.tabContent} contentContainerStyle={styles.scrollPad}>
                {/* Header */}
                <Text style={[styles.tabHeading, styles.libraryHeading]}>Your Library</Text>

                {/* Playlist list */}
                {playlists.map((pl) => (
                    <LibraryPlaylistRow key={pl.id} playlist={pl} onPress={onOpenPlaylist} />
                ))}

            </ScrollView>
        </View>
    );
};

export const CreateView = ({ onOpenPlaylist, onSwitchToLibrary, userProfile }) => {
    const { createPlaylist } = useMusic();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const createEpoch = useRef(0);
    useEffect(() => () => { createEpoch.current += 1; }, []);
    const closeCreate = () => {
        createEpoch.current += 1;
        setIsCreateModalOpen(false);
    };

    const options = [
        {
            id: 'c1',
            title: 'Playlist',
            desc: 'Build a playlist with songs or episodes',
            icon: 'playlistAdd',
            action: () => setIsCreateModalOpen(true),
        },
    ];

    const handleCreatePlaylist = async (playlistData) => {
        const epoch = ++createEpoch.current;
        const newPl = await createPlaylist(playlistData);
        if (Platform.OS === 'android' && epoch !== createEpoch.current) return newPl;
        if (Platform.OS === 'android' && !newPl) {
            throw new Error('Playlist creation did not return a playlist.');
        }
        if (newPl && onOpenPlaylist) {
            onOpenPlaylist(newPl);
        } else if (onSwitchToLibrary) {
            onSwitchToLibrary();
        }
        if (Platform.OS === 'android') return newPl;
    };

    return (
        <View style={styles.container}>
            <ScrollView style={styles.tabContent} contentContainerStyle={styles.scrollPad}>
                <Text style={styles.tabHeading}>Create</Text>
                <Text style={styles.tabSubheading}>Start something new with your friends or solo</Text>

                <View style={styles.createGrid}>
                    {options.map((opt) => (
                        <CreatePlaylistCard
                            key={opt.id}
                            title={opt.title}
                            desc={opt.desc}
                            icon={opt.icon}
                            onPress={opt.action}
                        />
                    ))}
                </View>
            </ScrollView>

            <CreatePlaylistModal
                visible={isCreateModalOpen}
                onClose={closeCreate}
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
