import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    setDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { MOCK_TRACKS } from '../services/audiomackService';
import audioPlayer from '../services/audioPlayer';
import { fetchAudiusTracks } from '../services/audiusService';
import { useAuth } from './AuthContext';
import { db } from '../services/firebaseConfig';

const MusicContext = createContext(null);

const getUserStorageKey = (uid, key) => {
    const scope = uid ? `u_${uid}` : 'guest';
    return `@spotibai_${scope}_${key}_v3`;
};

// Initial default curated playlists
const buildInitialPlaylists = (catalog = MOCK_TRACKS, likedTracks = []) => [
    {
        id: 'pl-liked',
        title: 'Liked Songs',
        description: 'Auto-saved favorite songs',
        icon: '💚',
        type: 'Playlist • Auto',
        isDefault: true,
        tracks: likedTracks,
    },
    {
        id: 'pl-all-songs',
        title: 'All Songs',
        description: 'Every song in your music library',
        icon: '🎵',
        type: 'Playlist • Your Library',
        isDefault: true,
        tracks: catalog,
    },
    {
        id: 'pl-top-hits',
        title: 'Top Hits 2026',
        description: 'The hottest bangers globally right now',
        icon: '🔥',
        type: 'Playlist • Spotify',
        isDefault: false,
        tracks: [catalog[1] || MOCK_TRACKS[1], catalog[3] || MOCK_TRACKS[3], catalog[4] || MOCK_TRACKS[4]].filter(Boolean),
    },
    {
        id: 'pl-chill',
        title: 'Late Night Chill',
        description: 'Smooth beats and mellow vibes for unwinding',
        icon: '🌙',
        type: 'Playlist • You',
        isDefault: false,
        tracks: [catalog[0] || MOCK_TRACKS[0], catalog[3] || MOCK_TRACKS[3]].filter(Boolean),
    },
    {
        id: 'pl-workout',
        title: 'Workout Energy',
        description: 'High-tempo tracks to smash your personal bests',
        icon: '⚡',
        type: 'Playlist • You',
        isDefault: false,
        tracks: [catalog[2] || MOCK_TRACKS[2], catalog[5] || MOCK_TRACKS[5], catalog[6] || MOCK_TRACKS[0]].filter(Boolean),
    },
    {
        id: 'pl-daily-1',
        title: 'Daily Mix 1',
        description: 'The Weeknd, Drake and similar artists',
        icon: '🎧',
        type: 'Made for You',
        isDefault: false,
        tracks: [catalog[1] || MOCK_TRACKS[1], catalog[2] || MOCK_TRACKS[2]].filter(Boolean),
    },
];

export const MusicProvider = ({ children }) => {
    const { user } = useAuth();
    const currentUserId = user?.uid || null;
    const activeUserIdRef = useRef(currentUserId);

    const [playlists, setPlaylists] = useState(() => buildInitialPlaylists(MOCK_TRACKS, []));
    const [availableTracks, setAvailableTracks] = useState(MOCK_TRACKS);
    const [likedTrackIds, setLikedTrackIds] = useState([]);
    const [userQueue, setUserQueue] = useState([]);
    const [recentTracks, setRecentTracks] = useState([]);
    const [privateSession, setPrivateSessionState] = useState(false);
    const [isPrivateSessionLoaded, setIsPrivateSessionLoaded] = useState(false);
    const [toast, setToast] = useState(null); // { message, icon, id }
    const listenerHeartbeatRef = useRef(null);
    const recordTrackPlayedRef = useRef(null);

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

    // Keep audioPlayer replenished with the latest available catalog for auto-replenishment
    useEffect(() => {
        if (typeof audioPlayer?.setCatalogProvider === 'function') {
            audioPlayer.setCatalogProvider(() => availableTracks);
        }
    }, [availableTracks]);

    // Fetch initial lightweight batch of Audius tracks (25 tracks) on mount to avoid system lag
    useEffect(() => {
        let isMounted = true;
        Promise.allSettled([fetchAudiusTracks(25)])
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

    // Sync all-songs playlist whenever catalog expands
    useEffect(() => {
        if (availableTracks.length <= MOCK_TRACKS.length) return;
        setPlaylists((currentPlaylists) =>
            currentPlaylists.map((playlist) =>
                playlist.id === 'pl-all-songs'
                    ? { ...playlist, tracks: availableTracks }
                    : playlist
            )
        );
    }, [availableTracks]);

    // Load persisted state scoped strictly to the current user
    useEffect(() => {
        let isCancelled = false;
        const uid = currentUserId;

        // If user changed or logged out, stop/reset playback immediately so nothing bleeds into another account
        if (activeUserIdRef.current !== uid) {
            if (typeof audioPlayer?.reset === 'function') {
                audioPlayer.reset();
            }
            activeUserIdRef.current = uid;
            // Clear immediate state while loading
            setLikedTrackIds([]);
            setUserQueue([]);
            setRecentTracks([]);
            setPlaylists(buildInitialPlaylists(availableTracks, []));
        }

        const loadUserPersistedData = async () => {
            try {
                const playlistsKey = getUserStorageKey(uid, 'playlists');
                const likedKey = getUserStorageKey(uid, 'liked_tracks');
                const recentsKey = getUserStorageKey(uid, 'recents');
                const queueKey = getUserStorageKey(uid, 'user_queue');
                const privateSessionKey = getUserStorageKey(uid, 'private_session');

                const [
                    storedPlaylists,
                    storedLiked,
                    storedRecents,
                    storedQueue,
                    storedPrivateSession,
                ] = await Promise.all([
                    AsyncStorage.getItem(playlistsKey),
                    AsyncStorage.getItem(likedKey),
                    AsyncStorage.getItem(recentsKey),
                    AsyncStorage.getItem(queueKey),
                    AsyncStorage.getItem(privateSessionKey),
                ]);

                if (isCancelled) return;

                if (storedPrivateSession !== null) {
                    setPrivateSessionState(JSON.parse(storedPrivateSession) === true);
                }
                setIsPrivateSessionLoaded(true);

                // Liked track IDs: check local storage + Firestore profile
                let resolvedLikedIds = [];
                if (storedLiked) {
                    try {
                        const parsed = JSON.parse(storedLiked);
                        if (Array.isArray(parsed)) resolvedLikedIds = parsed;
                    } catch (e) {}
                }

                let firestoreLikedTracks = [];
                if (db && uid) {
                    try {
                        const userSnap = await getDoc(doc(db, 'users', uid));
                        if (userSnap && userSnap.exists && userSnap.exists()) {
                            const data = userSnap.data();
                            if (Array.isArray(data?.favoriteTracks)) {
                                resolvedLikedIds = Array.from(new Set([...resolvedLikedIds, ...data.favoriteTracks]));
                            }
                        }
                        const likedSongsSnap = await getDocs(collection(db, 'users', uid, 'likedSongs'));
                        firestoreLikedTracks = likedSongsSnap.docs.map((likedSongDoc) => ({
                            ...likedSongDoc.data(),
                            id: likedSongDoc.data().trackId || likedSongDoc.id,
                        }));
                        if (firestoreLikedTracks.length > 0) {
                            firestoreLikedTracks.forEach((track) => {
                                if (!resolvedLikedIds.includes(track.id)) {
                                    resolvedLikedIds.push(track.id);
                                }
                            });
                        }
                    } catch (fsErr) {
                        console.warn('Firestore user likes retrieval note:', fsErr?.message || fsErr);
                    }
                }

                if (isCancelled) return;
                setLikedTrackIds(resolvedLikedIds);

                const currentTracksById = new Map(availableTracks.map((track) => [track.id, track]));
                firestoreLikedTracks.forEach((track) => {
                    if (!currentTracksById.has(track.id)) {
                        currentTracksById.set(track.id, track);
                    }
                });
                const defaultPlaylists = buildInitialPlaylists(
                    availableTracks,
                    resolvedLikedIds.map((id) => currentTracksById.get(id)).filter(Boolean)
                );
                const defaultPlaylistsById = new Map(defaultPlaylists.map((p) => [p.id, p]));

                let migratedPlaylists = defaultPlaylists;
                if (storedPlaylists) {
                    try {
                        const parsed = JSON.parse(storedPlaylists);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            const savedById = new Map(parsed.map((p) => [p.id, p]));
                            migratedPlaylists = defaultPlaylists.map((defaultPlaylist) => {
                                const savedPlaylist = savedById.get(defaultPlaylist.id);
                                if (!savedPlaylist) return defaultPlaylist;
                                if (defaultPlaylist.id === 'pl-all-songs') {
                                    return { ...savedPlaylist, ...defaultPlaylist };
                                }
                                if (defaultPlaylist.id === 'pl-liked') {
                                    return {
                                        ...savedPlaylist,
                                        ...defaultPlaylist,
                                        tracks: resolvedLikedIds
                                            .map((id) => currentTracksById.get(id))
                                            .filter(Boolean),
                                    };
                                }
                                return {
                                    ...savedPlaylist,
                                    tracks: (savedPlaylist.tracks || [])
                                        .map((t) => currentTracksById.get(t.id) || t)
                                        .filter(Boolean),
                                };
                            });

                            // Add user-created playlists
                            parsed.forEach((playlist) => {
                                if (defaultPlaylistsById.has(playlist.id)) return;
                                migratedPlaylists.push({
                                    ...playlist,
                                    tracks: (playlist.tracks || [])
                                        .map((t) => currentTracksById.get(t.id) || t)
                                        .filter(Boolean),
                                });
                            });
                        }
                    } catch (e) {
                        console.warn('Error parsing user playlists:', e);
                    }
                }

                if (isCancelled) return;
                setPlaylists(migratedPlaylists);

                // Queue
                if (storedQueue) {
                    try {
                        const parsedQueue = JSON.parse(storedQueue);
                        if (Array.isArray(parsedQueue)) {
                            setUserQueue(parsedQueue);
                        }
                    } catch (e) {}
                } else {
                    setUserQueue([]);
                }

                // Recents
                let migratedRecents = [];
                if (storedRecents) {
                    try {
                        const parsedRecents = JSON.parse(storedRecents);
                        if (Array.isArray(parsedRecents)) {
                            migratedRecents = parsedRecents
                                .map((entry) => {
                                    const track = currentTracksById.get(entry.id);
                                    return track ? { ...track, playedAt: entry.playedAt } : entry;
                                })
                                .filter(Boolean);
                        }
                    } catch (e) {}
                }
                if (isCancelled) return;
                setRecentTracks(migratedRecents);
            } catch (err) {
                console.warn('Error loading user-scoped music data:', err);
                setIsPrivateSessionLoaded(true);
            }
        };

        loadUserPersistedData();

        return () => {
            isCancelled = true;
        };
    }, [currentUserId, availableTracks]);

    // Save playlists scoped to the active user
    const savePlaylists = async (newList) => {
        setPlaylists(newList);
        const uid = activeUserIdRef.current;
        try {
            await AsyncStorage.setItem(getUserStorageKey(uid, 'playlists'), JSON.stringify(newList));
        } catch (err) {
            console.warn('Error saving user playlists:', err);
        }
    };

    // Create a new playlist with creator profile
    const createPlaylist = useCallback(async ({
        title,
        description = '',
        icon = '🎶',
        creator = null,
        cover = null,
        initialTrack = null,
    }) => {
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
            tracks: initialTrack ? [initialTrack] : [],
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
        const target = playlists.find((p) => p.id === playlistId);
        if (target?.isDefault) {
            showToast('Cannot delete default playlist', '⚠️');
            return;
        }
        const updated = playlists.filter((p) => p.id !== playlistId);
        await savePlaylists(updated);
        showToast(`Deleted playlist`, '🗑️');
    }, [playlists, showToast]);

    // Add track to a playlist
    const addTrackToPlaylist = useCallback(async (playlistId, track) => {
        if (!track) return false;
        let targetTitle = '';
        const updated = playlists.map((pl) => {
            if (pl.id === playlistId) {
                targetTitle = pl.title;
                const exists = (pl.tracks || []).some((t) => t.id === track.id);
                if (exists) {
                    return pl;
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
        const updated = playlists.map((pl) => {
            if (pl.id === playlistId) {
                return {
                    ...pl,
                    tracks: (pl.tracks || []).filter((t) => t.id !== trackId),
                };
            }
            return pl;
        });

        await savePlaylists(updated);
        showToast(`Removed from playlist`, '🗑️');
    }, [playlists, showToast]);

    // Toggle liked track - strictly scoped to active user
    const toggleLikeTrack = useCallback(async (track) => {
        if (!track) return;
        const uid = activeUserIdRef.current;
        const isLikedNow = likedTrackIds.includes(track.id);
        let newLiked;
        if (isLikedNow) {
            newLiked = likedTrackIds.filter((id) => id !== track.id);
            showToast(`Removed from Liked Songs`, '♡');
        } else {
            newLiked = [track.id, ...likedTrackIds];
            showToast(`Saved to your Liked Songs`, '💚');
        }

        setLikedTrackIds(newLiked);

        const firestoreSync = (async () => {
            if (!db || !uid) return;
            try {
                const userRef = doc(db, 'users', uid);
                const likedSongRef = doc(
                    db,
                    'users',
                    uid,
                    'likedSongs',
                    encodeURIComponent(String(track.id))
                );
                const likedSongData = {
                    trackId: track.id,
                    title: track.title || '',
                    artist: track.artist || '',
                    album: track.album || '',
                    artwork: typeof track.artwork === 'string' ? track.artwork : '',
                    duration: track.duration ?? null,
                    genre: track.genre || '',
                    source: track.source || '',
                    sourceUrl: track.source_url || track.sourceUrl || '',
                    likedAt: serverTimestamp(),
                };
                const writes = [
                    setDoc(
                        userRef,
                        {
                            favoriteTracks: newLiked,
                            updatedAt: serverTimestamp(),
                        },
                        { merge: true }
                    ),
                    isLikedNow ? deleteDoc(likedSongRef) : setDoc(likedSongRef, likedSongData),
                ];
                await Promise.all(writes);
            } catch (err) {
                console.warn('Firestore likedSongs sync warning:', err);
                showToast('Liked Songs sync failed. Check your connection.', '⚠️');
            }
        })();

        // Update Liked Songs playlist for this user
        const updatedPlaylists = playlists.map((pl) => {
            if (pl.id === 'pl-liked') {
                const tracks = isLikedNow
                    ? (pl.tracks || []).filter((t) => t.id !== track.id)
                    : [(pl.tracks || []).some((t) => t.id === track.id) ? null : track, ...(pl.tracks || [])].filter(Boolean);
                return { ...pl, tracks };
            }
            return pl;
        });
        await savePlaylists(updatedPlaylists);

        // Persist liked tracks specifically for this user
        try {
            await AsyncStorage.setItem(getUserStorageKey(uid, 'liked_tracks'), JSON.stringify(newLiked));
        } catch (e) {
            console.warn('Error saving user liked tracks:', e);
        }

        await firestoreSync;
    }, [likedTrackIds, playlists, showToast]);

    const isLiked = useCallback((trackId) => {
        return likedTrackIds.includes(trackId);
    }, [likedTrackIds]);

    // Add to user queue - inserted right after current song to play NEXT
    const addToQueue = useCallback((track) => {
        if (!track) return;
        const uid = activeUserIdRef.current;
        setUserQueue((prev) => {
            const updated = [...prev, track];
            AsyncStorage.setItem(getUserStorageKey(uid, 'user_queue'), JSON.stringify(updated)).catch(() => {});
            return updated;
        });
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
        const uid = activeUserIdRef.current;
        setUserQueue((prev) => {
            const updated = prev.filter((_, idx) => idx !== index);
            AsyncStorage.setItem(getUserStorageKey(uid, 'user_queue'), JSON.stringify(updated)).catch(() => {});
            return updated;
        });
        audioPlayer.removeFromQueue(index);
    }, []);

    const clearQueue = useCallback(() => {
        const uid = activeUserIdRef.current;
        setUserQueue([]);
        AsyncStorage.removeItem(getUserStorageKey(uid, 'user_queue')).catch(() => {});
        audioPlayer.clearQueue();
        showToast('Queue cleared', '✓');
    }, [showToast]);

    // Record played track (recents + stats) scoped to active user
    const recordTrackPlayed = useCallback(async (track) => {
        if (!track || !isPrivateSessionLoaded || privateSession) return;
        const uid = activeUserIdRef.current;
        const entry = {
            ...track,
            playedAt: Date.now(),
        };

        setRecentTracks((prev) => {
            const filtered = prev.filter((t) => t.id !== track.id);
            const updated = [entry, ...filtered].slice(0, 30);
            AsyncStorage.setItem(getUserStorageKey(uid, 'recents'), JSON.stringify(updated)).catch((error) => {
                console.warn('Could not save recent listening history:', error);
            });
            return updated;
        });
    }, [isPrivateSessionLoaded, privateSession]);

    useEffect(() => {
        recordTrackPlayedRef.current = recordTrackPlayed;
    }, [recordTrackPlayed]);

    const setPrivateSession = useCallback(async (enabled) => {
        const uid = activeUserIdRef.current;
        try {
            await AsyncStorage.setItem(getUserStorageKey(uid, 'private_session'), JSON.stringify(enabled));
            setPrivateSessionState(enabled);
        } catch (error) {
            console.warn('Could not save private session setting:', error);
            throw error;
        }
    }, []);

    const clearRecentTracks = useCallback(async () => {
        const uid = activeUserIdRef.current;
        try {
            await AsyncStorage.removeItem(getUserStorageKey(uid, 'recents'));
            setRecentTracks([]);
        } catch (error) {
            console.warn('Could not clear recent listening history:', error);
            throw error;
        }
    }, []);

    // Safe listener subscription for audioPlayer
    useEffect(() => {
        if (typeof audioPlayer?.addListener !== 'function') return;

        const uid = currentUserId;
        if (!db || !uid) return;

        const presenceRef = doc(db, 'listener_sessions', uid);
        let isDisposed = false;
        const clearHeartbeat = () => {
            if (listenerHeartbeatRef.current) {
                clearInterval(listenerHeartbeatRef.current);
                listenerHeartbeatRef.current = null;
            }
        };
        const writeHeartbeat = async () => {
            try {
                await setDoc(presenceRef, {
                    uid,
                    isPlaying: true,
                    lastHeartbeat: serverTimestamp(),
                });
            } catch (error) {
                console.warn('Could not update active listener presence:', error);
            }
        };
        const syncPresence = (isPlaying) => {
            if (isPlaying) {
                if (listenerHeartbeatRef.current) return;
                writeHeartbeat();
                listenerHeartbeatRef.current = setInterval(() => {
                    if (!isDisposed) writeHeartbeat();
                }, 20_000);
                return;
            }

            clearHeartbeat();
            deleteDoc(presenceRef).catch((error) => {
                console.warn('Could not clear active listener presence:', error);
            });
        };

        const unsubscribe = audioPlayer.addListener((event, data) => {
            if (event === 'status') {
                if (data?.track && data?.isPlaying) recordTrackPlayedRef.current?.(data.track);
                syncPresence(data?.isPlaying === true);
            }
        });

        if (audioPlayer.getIsPlaying?.()) syncPresence(true);

        return () => {
            isDisposed = true;
            clearHeartbeat();
            deleteDoc(presenceRef).catch((error) => {
                console.warn('Could not clear active listener presence:', error);
            });
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, [currentUserId]);

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
