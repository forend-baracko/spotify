import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOCK_TRACKS } from '../services/audiomackService';
import audioPlayer from '../services/audioPlayer';
import { fetchAudiusTracks } from '../services/audiusService';

const MusicContext = createContext(null);

const STORAGE_KEYS = {
    PLAYLISTS: '@spotify_user_playlists_v2',
    LIKED_TRACKS: '@spotify_liked_tracks_v2',
    RECENTS: '@spotify_recents_v2',
    USER_QUEUE: '@spotify_user_queue_v2',
    PRIVATE_SESSION: '@spotify_private_session_v1',
};

// Initial default curated playlists
const DEFAULT_PLAYLISTS = [
    {
        id: 'pl-liked',
        title: 'Liked Songs',
        description: 'Auto-saved favorite songs',
        icon: '💚',
        type: 'Playlist • Auto',
        isDefault: true,
        tracks: [],
    },
    {
        id: 'pl-all-songs',
        title: 'All Songs',
        description: 'Every song in your music library',
        icon: '🎵',
        type: 'Playlist • Your Library',
        isDefault: true,
        tracks: MOCK_TRACKS,
    },
    {
        id: 'pl-top-hits',
        title: 'Top Hits 2026',
        description: 'The hottest bangers globally right now',
        icon: '🔥',
        type: 'Playlist • Spotify',
        isDefault: false,
        tracks: [MOCK_TRACKS[1], MOCK_TRACKS[3], MOCK_TRACKS[4]],
    },
    {
        id: 'pl-chill',
        title: 'Late Night Chill',
        description: 'Smooth beats and mellow vibes for unwinding',
        icon: '🌙',
        type: 'Playlist • You',
        isDefault: false,
        tracks: [MOCK_TRACKS[0], MOCK_TRACKS[3]],
    },
    {
        id: 'pl-workout',
        title: 'Workout Energy',
        description: 'High-tempo tracks to smash your personal bests',
        icon: '⚡',
        type: 'Playlist • You',
        isDefault: false,
        tracks: [MOCK_TRACKS[2], MOCK_TRACKS[5], MOCK_TRACKS[6] || MOCK_TRACKS[0]],
    },
    {
        id: 'pl-daily-1',
        title: 'Daily Mix 1',
        description: 'The Weeknd, Drake and similar artists',
        icon: '🎧',
        type: 'Made for You',
        isDefault: false,
        tracks: [MOCK_TRACKS[1], MOCK_TRACKS[2]],
    },
];

export const MusicProvider = ({ children }) => {
    const [playlists, setPlaylists] = useState(DEFAULT_PLAYLISTS);
    const [availableTracks, setAvailableTracks] = useState(MOCK_TRACKS);
    const [likedTrackIds, setLikedTrackIds] = useState([]);
    const [userQueue, setUserQueue] = useState([]);
    const [recentTracks, setRecentTracks] = useState([]);
    const [privateSession, setPrivateSessionState] = useState(false);
    const [isPrivateSessionLoaded, setIsPrivateSessionLoaded] = useState(false);
    const [toast, setToast] = useState(null); // { message, icon, id }

    // Load persisted state on mount
    useEffect(() => {
        const loadPersistedData = async () => {
            try {
                const storedPlaylists = await AsyncStorage.getItem(STORAGE_KEYS.PLAYLISTS);
                const storedRecents = await AsyncStorage.getItem(STORAGE_KEYS.RECENTS);
                const storedPrivateSession = await AsyncStorage.getItem(STORAGE_KEYS.PRIVATE_SESSION);
                if (storedPrivateSession !== null) {
                    setPrivateSessionState(JSON.parse(storedPrivateSession) === true);
                }
                setIsPrivateSessionLoaded(true);
                const parsedStoredPlaylists = storedPlaylists
                    ? JSON.parse(storedPlaylists)
                    : [];
                const parsedStoredRecents = storedRecents
                    ? JSON.parse(storedRecents)
                    : [];
                const cachedRemoteTracks = [
                    ...(Array.isArray(parsedStoredPlaylists)
                        ? parsedStoredPlaylists.flatMap((playlist) => playlist.tracks || [])
                        : []),
                    ...(Array.isArray(parsedStoredRecents) ? parsedStoredRecents : []),
                ].filter(
                        (track) =>
                            ['jamendo', 'archive', 'deezer'].includes(track.source) &&
                            typeof track.stream_url === 'string'
                    );
                const catalogById = new Map(
                    [...cachedRemoteTracks, ...MOCK_TRACKS].map((track) => [
                        track.id,
                        track,
                    ])
                );
                const currentCatalog = [...catalogById.values()];
                setAvailableTracks(currentCatalog);

                const storedLiked = await AsyncStorage.getItem(STORAGE_KEYS.LIKED_TRACKS);
                let availableLikedIds = [];
                if (storedLiked) {
                    const parsedLiked = JSON.parse(storedLiked);
                    if (Array.isArray(parsedLiked)) {
                        const trackIds = new Set(currentCatalog.map((track) => track.id));
                        availableLikedIds = [...new Set(parsedLiked.filter((id) => trackIds.has(id)))];
                    }
                }
                setLikedTrackIds(availableLikedIds);

                const currentTracksById = new Map(
                    currentCatalog.map((track) => [track.id, track])
                );
                const defaultPlaylistsById = new Map(
                    DEFAULT_PLAYLISTS.map((playlist) => [playlist.id, playlist])
                );
                let migratedPlaylists = DEFAULT_PLAYLISTS;
                if (storedPlaylists) {
                    const parsed = parsedStoredPlaylists;
                    if (Array.isArray(parsed)) {
                        const savedById = new Map(
                            parsed.map((playlist) => [playlist.id, playlist])
                        );
                        migratedPlaylists = DEFAULT_PLAYLISTS.map((defaultPlaylist) => {
                            const savedPlaylist = savedById.get(defaultPlaylist.id);
                            if (!savedPlaylist) return defaultPlaylist;
                            if (defaultPlaylist.id === 'pl-all-songs') {
                                return { ...savedPlaylist, ...defaultPlaylist };
                            }
                            if (defaultPlaylist.id === 'pl-liked') {
                                return {
                                    ...savedPlaylist,
                                    ...defaultPlaylist,
                                    tracks: availableLikedIds
                                        .map((id) => currentTracksById.get(id))
                                        .filter(Boolean),
                                };
                            }
                            return {
                                ...savedPlaylist,
                                tracks: (savedPlaylist.tracks || [])
                                    .map((track) => currentTracksById.get(track.id))
                                    .filter(Boolean),
                            };
                        });

                        parsed.forEach((playlist) => {
                            if (defaultPlaylistsById.has(playlist.id)) return;
                            migratedPlaylists.push({
                                ...playlist,
                                tracks: (playlist.tracks || [])
                                    .map((track) => currentTracksById.get(track.id))
                                    .filter(Boolean),
                            });
                        });
                    }
                }
                setPlaylists(migratedPlaylists);
                try {
                    await AsyncStorage.multiSet([
                        [STORAGE_KEYS.PLAYLISTS, JSON.stringify(migratedPlaylists)],
                        [STORAGE_KEYS.LIKED_TRACKS, JSON.stringify(availableLikedIds)],
                    ]);
                } catch (err) {
                    console.warn('Error saving migrated music data:', err);
                }

                let migratedRecents = [];
                if (storedRecents) {
                    if (Array.isArray(parsedStoredRecents)) {
                        migratedRecents = parsedStoredRecents
                            .map((entry) => {
                                const track = currentTracksById.get(entry.id);
                                return track ? { ...track, playedAt: entry.playedAt } : null;
                            })
                            .filter(Boolean);
                    }
                }
                setRecentTracks(migratedRecents);
                try {
                    await AsyncStorage.setItem(
                        STORAGE_KEYS.RECENTS,
                        JSON.stringify(migratedRecents)
                    );
                } catch (err) {
                    console.warn('Error saving migrated recent tracks:', err);
                }
            } catch (err) {
                console.warn('Error loading persisted music data:', err);
                setIsPrivateSessionLoaded(true);
            }
        };

        loadPersistedData();
    }, []);

    useEffect(() => {
        let isMounted = true;
        Promise.allSettled([fetchAudiusTracks(80)])
            .then(([audiusResult]) => {
                if (!isMounted) return;
                const remoteTracks = [];
                if (audiusResult.status === 'fulfilled') {
                    remoteTracks.push(...audiusResult.value);
                } else {
                    console.warn('Could not load Audius tracks:', audiusResult.reason);
                }
                if (remoteTracks.length === 0) return;

                setAvailableTracks((previousTracks) => [
                    ...new Map(
                        [
                            ...remoteTracks,
                            ...previousTracks.filter((track) =>
                                ['jamendo', 'archive', 'deezer'].includes(track.source)
                            ),
                            ...MOCK_TRACKS,
                        ].map((track) => [track.id, track])
                    ).values(),
                ]);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (availableTracks.length <= MOCK_TRACKS.length) return;
        setPlaylists((currentPlaylists) => {
            const updated = currentPlaylists.map((playlist) =>
                playlist.id === 'pl-all-songs'
                    ? { ...playlist, tracks: availableTracks }
                    : playlist
            );
            AsyncStorage.setItem(
                STORAGE_KEYS.PLAYLISTS,
                JSON.stringify(updated)
            ).catch((error) => {
                console.warn('Error saving music catalog to library:', error);
            });
            return updated;
        });
    }, [availableTracks]);

    // Keep audioPlayer replenished with the latest available catalog for auto-replenishment
    useEffect(() => {
        if (typeof audioPlayer?.setCatalogProvider === 'function') {
            audioPlayer.setCatalogProvider(() => availableTracks);
        }
    }, [availableTracks]);

    // Helper: Show floating toast
    const showToast = useCallback((message, icon = '✓') => {
        setToast({ message, icon, id: Date.now() });
    }, []);

    // Dismiss toast after 2.5s
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => {
            setToast(null);
        }, 2600);
        return () => clearTimeout(timer);
    }, [toast]);

    // Save playlists
    const savePlaylists = async (newList) => {
        setPlaylists(newList);
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(newList));
        } catch (err) {
            console.warn('Error saving playlists:', err);
        }
    };

    // Create a new playlist with optional creator profile
    const createPlaylist = useCallback(async ({ title, description = '', icon = '🎶', creator = null, cover = null }) => {
        if (!title || !title.trim()) return null;
        const cleanTitle = title.trim();
        const creatorName = creator?.displayName || creator?.username || 'You';
        const newPlaylist = {
            id: `pl-${Date.now()}`,
            title: cleanTitle,
            description: description.trim() || `Playlist created by ${creatorName}`,
            icon: icon || '🎶',
            type: creator?.username ? `Playlist • @${creator.username}` : `Playlist • ${creatorName}`,
            isDefault: false,
            tracks: [],
            creator: creator || null,
            cover: cover || creator?.photoURL || null,
            createdAt: Date.now(),
        };

        const updated = [newPlaylist, ...playlists];
        await savePlaylists(updated);
        showToast(`Created playlist "${cleanTitle}"`, '🎉');
        return newPlaylist;
    }, [playlists, showToast]);

    // Update an existing playlist
    const updatePlaylist = useCallback(async (playlistId, updates = {}) => {
        let updatedTitle = '';
        const updated = playlists.map((pl) => {
            if (pl.id === playlistId) {
                updatedTitle = pl.title;
                return { ...pl, ...updates };
            }
            return pl;
        });
        await savePlaylists(updated);
        showToast(`Updated "${updatedTitle}"`, '✓');
    }, [playlists, showToast]);

    // Attach user profile / avatar to a playlist
    const attachUserProfileToPlaylist = useCallback(async (playlistId, userProfile) => {
        if (!playlistId || !userProfile) return;
        const creator = {
            uid: userProfile.uid || null,
            name: userProfile.displayName || userProfile.username || 'User',
            username: userProfile.username || null,
            photoURL: userProfile.photoURL || null,
        };
        const creatorLabel = userProfile.username ? `@${userProfile.username}` : userProfile.displayName || 'You';
        const updated = playlists.map((pl) => {
            if (pl.id === playlistId) {
                return {
                    ...pl,
                    creator,
                    cover: userProfile.photoURL || pl.cover,
                    type: `Playlist • ${creatorLabel}`,
                };
            }
            return pl;
        });
        await savePlaylists(updated);
        showToast(`Added profile to playlist!`, '👤');
    }, [playlists, showToast]);

    // Delete a playlist
    const deletePlaylist = useCallback(async (playlistId) => {
        const target = playlists.find(p => p.id === playlistId);
        if (target?.isDefault) {
            showToast("Cannot delete default playlist", "⚠️");
            return;
        }
        const updated = playlists.filter(p => p.id !== playlistId);
        await savePlaylists(updated);
        showToast(`Deleted playlist`, '🗑️');
    }, [playlists, showToast]);

    // Add track to a playlist
    const addTrackToPlaylist = useCallback(async (playlistId, track) => {
        if (!track) return false;
        let targetTitle = '';
        const updated = playlists.map(pl => {
            if (pl.id === playlistId) {
                targetTitle = pl.title;
                const exists = (pl.tracks || []).some(t => t.id === track.id);
                if (exists) {
                    return pl; // already exists
                }
                return {
                    ...pl,
                    tracks: [track, ...(pl.tracks || [])],
                };
            }
            return pl;
        });

        await savePlaylists(updated);
        showToast(`Added to "${targetTitle}"`, '🎵');
        return true;
    }, [playlists, showToast]);

    // Remove track from a playlist
    const removeTrackFromPlaylist = useCallback(async (playlistId, trackId) => {
        let removedTitle = '';
        const updated = playlists.map(pl => {
            if (pl.id === playlistId) {
                const targetTrack = pl.tracks.find(t => t.id === trackId);
                if (targetTrack) removedTitle = targetTrack.title;
                return {
                    ...pl,
                    tracks: (pl.tracks || []).filter(t => t.id !== trackId),
                };
            }
            return pl;
        });

        await savePlaylists(updated);
        showToast(`Removed from playlist`, '🗑️');
    }, [playlists, showToast]);

    // Toggle liked track
    const toggleLikeTrack = useCallback(async (track) => {
        if (!track) return;
        const isLikedNow = likedTrackIds.includes(track.id);
        let newLiked;
        if (isLikedNow) {
            newLiked = likedTrackIds.filter(id => id !== track.id);
            showToast(`Removed from Liked Songs`, '♡');
            // Remove from liked playlist too
            const updatedPlaylists = playlists.map(pl => {
                if (pl.id === 'pl-liked') {
                    return { ...pl, tracks: (pl.tracks || []).filter(t => t.id !== track.id) };
                }
                return pl;
            });
            savePlaylists(updatedPlaylists);
        } else {
            newLiked = [track.id, ...likedTrackIds];
            showToast(`Saved to your Liked Songs`, '💚');
            // Add to liked playlist
            const updatedPlaylists = playlists.map(pl => {
                if (pl.id === 'pl-liked') {
                    const exists = (pl.tracks || []).some(t => t.id === track.id);
                    return exists ? pl : { ...pl, tracks: [track, ...(pl.tracks || [])] };
                }
                return pl;
            });
            savePlaylists(updatedPlaylists);
        }

        setLikedTrackIds(newLiked);
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.LIKED_TRACKS, JSON.stringify(newLiked));
        } catch (e) {}
    }, [likedTrackIds, playlists, showToast]);

    const isLiked = useCallback((trackId) => {
        return likedTrackIds.includes(trackId);
    }, [likedTrackIds]);

    // Add to user queue - inserted right after current song to play NEXT
    const addToQueue = useCallback((track) => {
        if (!track) return;
        setUserQueue(prev => [...prev, track]);
        if (typeof audioPlayer.addToQueueNext === 'function') {
            audioPlayer.addToQueueNext(track);
        } else {
            const playbackQueue = audioPlayer.getQueue();
            const currentIndex = audioPlayer.getCurrentIndex();
            const insertIdx = currentIndex + 1;
            const updated = [...playbackQueue];
            updated.splice(insertIdx, 0, track);
            audioPlayer.setQueue(updated, currentIndex);
        }
        showToast(`Added to queue: "${track.title}"`, '⤹');
    }, [showToast]);

    const removeFromQueue = useCallback((index) => {
        setUserQueue(prev => prev.filter((_, idx) => idx !== index));
        audioPlayer.removeFromQueue(index);
    }, []);

    const clearQueue = useCallback(() => {
        setUserQueue([]);
        audioPlayer.clearQueue();
        showToast('Queue cleared', '✓');
    }, [showToast]);

    // Record played track (recents + stats)
    const recordTrackPlayed = useCallback(async (track) => {
        if (!track || !isPrivateSessionLoaded || privateSession) return;
        const entry = {
            ...track,
            playedAt: Date.now(),
        };

        setRecentTracks(prev => {
            const filtered = prev.filter(t => t.id !== track.id);
            const updated = [entry, ...filtered].slice(0, 30);
            AsyncStorage.setItem(STORAGE_KEYS.RECENTS, JSON.stringify(updated)).catch((error) => {
                console.warn('Could not save recent listening history:', error);
            });
            return updated;
        });
    }, [isPrivateSessionLoaded, privateSession]);

    const setPrivateSession = useCallback(async (enabled) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.PRIVATE_SESSION, JSON.stringify(enabled));
            setPrivateSessionState(enabled);
        } catch (error) {
            console.warn('Could not save private session setting:', error);
            throw error;
        }
    }, []);

    const clearRecentTracks = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(STORAGE_KEYS.RECENTS);
            setRecentTracks([]);
        } catch (error) {
            console.warn('Could not clear recent listening history:', error);
            throw error;
        }
    }, []);

    // Safe listener subscription for audioPlayer
    useEffect(() => {
        if (typeof audioPlayer?.addListener !== 'function') return;

        const unsubscribe = audioPlayer.addListener((event, data) => {
            if (event === 'status' && data?.track && data?.isPlaying) {
                recordTrackPlayed(data.track);
            }
        });

        return () => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, [recordTrackPlayed]);

    const value = {
        playlists,
        availableTracks,
        createPlaylist,
        updatePlaylist,
        attachUserProfileToPlaylist,
        deletePlaylist,
        addTrackToPlaylist,
        removeTrackFromPlaylist,
        likedTrackIds,
        toggleLikeTrack,
        isLiked,
        userQueue,
        addToQueue,
        removeFromQueue,
        clearQueue,
        recentTracks,
        recordTrackPlayed,
        privateSession,
        setPrivateSession,
        clearRecentTracks,
        toast,
        showToast,
    };

    return (
        <MusicContext.Provider value={value}>
            {children}
        </MusicContext.Provider>
    );
};

export const useMusic = () => {
    const context = useContext(MusicContext);
    if (!context) {
        throw new Error('useMusic must be used within a MusicProvider');
    }
    return context;
};