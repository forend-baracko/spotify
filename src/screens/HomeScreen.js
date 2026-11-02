// @refresh reset
import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
  Modal,
  Pressable,
  Keyboard,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import audioPlayer, { REPEAT_MODE } from '../services/audioPlayer';
import { MOCK_TRACKS } from '../services/audiomackService';
import { searchAudiusTracks } from '../services/audiusService';
import { getArtworkSource } from '../utils/artworkHelper';
import BottomNavBar, { TABS } from '../components/navigation/BottomNavBar';
import GeminiDJ from '../components/search/GeminiDJ';
import { CreateView, LibraryView } from '../components/playlists/LibraryAndCreateViews';
import PlaylistDetailModal from '../components/playlists/PlaylistDetailModal';
import AddToPlaylistModal from '../components/playlists/AddToPlaylistModal';
import SwipeableTrackRow from '../components/player/SwipeableTrackRow';
import QueueModal from '../components/player/QueueModal';
import TrackActionSheetModal from '../components/player/TrackActionSheetModal';
import ProfileDrawer from '../components/profile/ProfileDrawer';
import ProfileDetailsModal from '../components/profile/ProfileDetailsModal';
import UserStatsModal from '../components/profile/UserStatsModal';
import RecentPlayedModal from '../components/social/RecentPlayedModal';
import SettingsModal from '../components/settings/SettingsModal';
import * as AuthContextModule from '../context/AuthContext';
import { useMusic } from '../context/MusicContext';

const DefaultContext = React.createContext(null);
const ResolvedAuthContext =
  AuthContextModule?.AuthContext || AuthContextModule?.default || DefaultContext;

const SEARCH_CATEGORIES = [
  { id: 'music', title: 'Music', color: '#E91E63', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80' },
  { id: 'made-for-you', title: 'Made For You', color: '#7E57C2', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&q=80' },
];

const HOME_SHORTCUTS = [
  { id: 'shortcut-recent', title: 'Recently Played', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=160&q=80' },
  { id: 'shortcut-episodes', title: 'Your Episodes', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=160&q=80' },
  { id: 'shortcut-releases', title: 'New Releases', image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=160&q=80' },
];

const HOME_FEATURED_SECTIONS = [
  {
    id: 'new-music',
    title: "It's New Music Friday!",
    cards: [
      {
        id: 'new-friday',
        title: 'NEW MUSIC FRIDAY PHILIPPINES',
        subtitle: 'Gracie Abrams, Dominic Fike, JISOO, Gloc-9, SUPAF...',
        image: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=500&q=85',
      },
      {
        id: 'release-radar',
        title: 'Release Radar',
        subtitle: 'Catch all the latest music from artists you follow, plus...',
        image: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=500&q=80',
      },
      {
        id: 'best-new',
        title: 'Best New Music',
        subtitle: 'Fresh tracks picked for you this week',
        image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=500&q=80',
      },
    ],
  },
  {
    id: 'made-for-you',
    title: 'Made For You',
    cards: [
      {
        id: 'daily-mix',
        title: 'Daily Mix 1',
        subtitle: 'The Weeknd, Drake and more',
        image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=500&q=80',
      },
      {
        id: 'on-repeat',
        title: 'On Repeat',
        subtitle: 'The songs you can’t stop playing',
        image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=500&q=80',
      },
      {
        id: 'discover-weekly',
        title: 'Discover Weekly',
        subtitle: 'Your weekly mixtape of fresh music',
        image: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=500&q=80',
      },
    ],
  },
];

const formatTime = (secs) => {
  const m = Math.floor(secs / 60) || 0;
  const s = Math.floor(secs % 60) || 0;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const HomeScreen = ({ navigation }) => {
  const authContextValue = useContext(ResolvedAuthContext);
  const musicContext = useMusic();
  const musicCatalog = musicContext.availableTracks || MOCK_TRACKS;

  const [currentTrack, setCurrentTrack] = useState(MOCK_TRACKS[0] || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(230);
  const [isShuffle, setIsShuffle] = useState(audioPlayer.getIsShuffle());
  const [repeatMode, setRepeatMode] = useState(audioPlayer.getRepeatMode());
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [trackToAdd, setTrackToAdd] = useState(null);
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [trackForActions, setTrackForActions] = useState(null);
  const [actionTrackPlaylistId, setActionTrackPlaylistId] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [audiusSearchResults, setAudiusSearchResults] = useState([]);
  const [isMusicSearchLoading, setIsMusicSearchLoading] = useState(false);
  const [searchCategory, setSearchCategory] = useState(null);
  const [isHomeSearchOpen, setIsHomeSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(TABS.HOME);
  const [homeFilter, setHomeFilter] = useState('All');
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [isRecentsModalOpen, setIsRecentsModalOpen] = useState(false);
  const [isProfileDetailsOpen, setIsProfileDetailsOpen] = useState(false);
  const [isListeningStatsOpen, setIsListeningStatsOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const currentUser = authContextValue?.userProfile || authContextValue?.user || null;
  const selectedPlaylist =
    musicContext.playlists.find((playlist) => playlist.id === selectedPlaylistId) || null;
  const isLiked = musicContext.isLiked(currentTrack?.id);
  const userName =
    authContextValue?.userProfile?.username ||
    currentUser?.username ||
    authContextValue?.userProfile?.displayName ||
    currentUser?.displayName ||
    currentUser?.name ||
    (currentUser?.email ? currentUser.email.split('@')[0] : null) ||
    'User';

  const featuredSections = useMemo(
    () =>
      HOME_FEATURED_SECTIONS.map((section) =>
        section.id === 'made-for-you'
          ? { ...section, title: `Made For ${userName}` }
          : section
      ),
    [userName]
  );

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setAudiusSearchResults([]);
      setIsMusicSearchLoading(false);
      return undefined;
    }

    let isCurrentSearch = true;
    setAudiusSearchResults([]);
    const searchTimeout = setTimeout(() => {
      setIsMusicSearchLoading(true);
      searchAudiusTracks(query)
        .then((tracks) => {
          if (isCurrentSearch) setAudiusSearchResults(tracks);
        })
        .catch((error) => {
          console.warn('Audius search failed:', error);
          if (isCurrentSearch) setAudiusSearchResults([]);
        })
        .finally(() => {
          if (isCurrentSearch) setIsMusicSearchLoading(false);
        });
    }, 350);

    return () => {
      isCurrentSearch = false;
      clearTimeout(searchTimeout);
    };
  }, [searchQuery]);

  useEffect(() => {
    let unsubscribe = null;
    try {
      if (typeof audioPlayer?.getQueue === 'function' && audioPlayer.getQueue().length === 0) {
        audioPlayer.setQueue(musicCatalog, 0);
      }
      if (typeof audioPlayer?.addListener === 'function') {
        unsubscribe = audioPlayer.addListener((event, data) => {
          if (event === 'error' && data?.error) {
            Alert.alert(
              'Playback unavailable',
              [data.error.code, data.error.message]
                .filter(Boolean)
                .join('\n') ||
                'Check the audio source and your network connection, then try again.'
            );
            return;
          }
          if (data?.track) setCurrentTrack(data.track);
          if (data?.isPlaying !== undefined) setIsPlaying(data.isPlaying);
          if (data?.currentTime !== undefined) setCurrentTime(data.currentTime);
          if (data?.duration !== undefined) setDuration(data.duration);
          if (data?.isShuffle !== undefined) setIsShuffle(data.isShuffle);
          if (data?.repeatMode !== undefined) setRepeatMode(data.repeatMode);
        });
      }
    } catch (err) {
      console.warn('Audio listener subscription error:', err);
    }

    return () => {
      if (typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch (e) {}
      }
    };
  }, [musicCatalog]);

  useEffect(() => {
    if (musicCatalog.length <= MOCK_TRACKS.length) return;
    const queue = audioPlayer.getQueue();
    const queuedIds = new Set(queue.map((track) => track.id));
    const newlyAvailableTracks = musicCatalog.filter(
      (track) => !queuedIds.has(track.id)
    );
    if (newlyAvailableTracks.length > 0) {
      audioPlayer.setQueue(
        [...queue, ...newlyAvailableTracks],
        audioPlayer.getCurrentIndex()
      );
    }
  }, [musicCatalog]);

  const handlePlayTrack = (track, queueTracks = musicCatalog) => {
    if (!track) return;
    setActiveTab(TABS.HOME);
    setHomeFilter('Music');
    setIsHomeSearchOpen(false);
    setSelectedPlaylistId(null);
    setIsPlayerModalOpen(true);
    Keyboard.dismiss();
    try {
      if (typeof audioPlayer?.setQueue === 'function') {
        if (typeof audioPlayer.setQueueForTrack === 'function') {
          audioPlayer.setQueueForTrack(track, queueTracks);
        } else {
          const tracks = queueTracks.some((queuedTrack) => queuedTrack.id === track.id)
            ? queueTracks
            : [track, ...queueTracks];
          audioPlayer.setQueue(tracks, tracks.findIndex((queuedTrack) => queuedTrack.id === track.id));
        }
      }
      if (typeof audioPlayer?.playTrack === 'function') {
        audioPlayer.playTrack(track);
      }
    } catch (err) {
      console.warn('Error triggering track playback:', err);
    }
  };

  const handleStartDJSet = (tracks) => {
    if (!tracks.length) return;
    setActiveTab(TABS.HOME);
    setHomeFilter('Music');
    setIsPlayerModalOpen(true);
    Keyboard.dismiss();
    audioPlayer.setQueue(tracks, 0);
    audioPlayer.playTrack(tracks[0]);
  };

  const handleOpenAddToPlaylist = (track) => {
    setTrackToAdd(track);
    setIsAddToPlaylistOpen(true);
  };

  const handleOpenTrackActions = (track, playlistId = null) => {
    setTrackForActions(track);
    setActionTrackPlaylistId(playlistId);
  };

  const closeTrackActions = () => {
    setTrackForActions(null);
    setActionTrackPlaylistId(null);
  };

  const handleAddTrackToPlaylist = (playlistId, track) => {
    musicContext.addTrackToPlaylist(playlistId, track);
    setIsAddToPlaylistOpen(false);
  };

  const handleTogglePlay = () => {
    try {
      if (typeof audioPlayer?.togglePlay === 'function') {
        audioPlayer.togglePlay(currentTrack);
      } else {
        setIsPlaying(!isPlaying);
      }
    } catch (e) {}
  };

  const handlePlayNext = () => {
    try {
      if (typeof audioPlayer?.playNext === 'function') {
        audioPlayer.playNext();
      }
    } catch (e) {}
  };

  const handlePlayPrevious = () => {
    try {
      if (typeof audioPlayer?.playPrevious === 'function') {
        audioPlayer.playPrevious();
      }
    } catch (e) {}
  };

  const handleToggleShuffle = () => {
    try {
      if (typeof audioPlayer?.toggleShuffle === 'function') {
        const state = audioPlayer.toggleShuffle();
        setIsShuffle(state);
      } else {
        setIsShuffle(!isShuffle);
      }
    } catch (e) {}
  };

  const handleToggleRepeat = () => {
    try {
      if (typeof audioPlayer?.toggleRepeat === 'function') {
        const mode = audioPlayer.toggleRepeat();
        setRepeatMode(mode);
      }
    } catch (e) {}
  };

  const handleSelectTab = (tabId) => {
    setIsHomeSearchOpen(false);
    setActiveTab(tabId);
  };

  const handleSignOut = async () => {
    try {
      if (typeof authContextValue?.logout === 'function') {
        await authContextValue.logout();
      } else if (typeof authContextValue?.signOut === 'function') {
        await authContextValue.signOut();
      } else {
        navigation?.navigate?.('Login');
      }
    } catch (error) {
      console.warn('Error signing out:', error);
      Alert.alert('Sign out failed', 'Please try again.');
    }
  };

  const closeHomeSearch = () => {
    Keyboard.dismiss();
    setIsHomeSearchOpen(false);
    setSearchQuery('');
  };

  const playerArtwork = getArtworkSource(currentTrack?.artwork);
  const homePlaylistCards = [
    ...musicContext.playlists.slice(0, 5).map((playlist) => ({
      id: playlist.id,
      title: playlist.title,
      image: getArtworkSource(playlist.tracks?.[0]?.artwork),
      playlist,
    })),
    ...HOME_SHORTCUTS,
  ];
  const recommendedTracks = musicCatalog.filter((track) => {
    const query = searchQuery.trim().toLowerCase();
    return (
      !query ||
      track.title.toLowerCase().includes(query) ||
      track.artist.toLowerCase().includes(query)
    );
  }).slice(0, homeFilter === 'Music' ? musicCatalog.length : 6);
  const localSearchResults = musicCatalog.filter((track) => {
    const query = searchQuery.trim().toLowerCase();
    return (
      searchCategory === 'music' && !query
        ? true
        : query &&
          (track.title.toLowerCase().includes(query) ||
            track.artist.toLowerCase().includes(query) ||
            track.album?.toLowerCase().includes(query)            )
    );
  });
  const localSearchIds = new Set(localSearchResults.map((track) => track.id));
  const searchResults = [
    ...localSearchResults,
    ...audiusSearchResults.filter((track) => !localSearchIds.has(track.id)),
  ];
  const progressPercent = Math.min(
    100,
    Math.max(0, ((currentTime || 0) / (duration || 230)) * 100)
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      <View style={styles.contentContainer}>
        {activeTab === TABS.SEARCH ? (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.searchHeader}>
              <View style={styles.searchHeaderLeft}>
                <TouchableOpacity
                  style={styles.miniAvatar}
                  onPress={() => setIsProfileDrawerOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Open your profile menu"
                >
                  <Text style={styles.miniAvatarText}>
                    {userName.charAt(0).toUpperCase()}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.searchTitle}>Search</Text>
              </View>
            </View>

            <View style={styles.whiteSearchBar}>
              <Text style={styles.searchIconDark}>🔍</Text>
              <TextInput
                style={styles.whiteSearchInput}
                placeholder="What do you want to listen to?"
                placeholderTextColor="#666666"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                accessibilityLabel="Search songs, artists, or albums"
              />
              {searchQuery ? (
                <TouchableOpacity
                  style={styles.searchClearButton}
                  onPress={() => setSearchQuery('')}
                  accessibilityLabel="Clear search"
                >
                  <Text style={styles.searchClearTextDark}>×</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {!searchQuery.trim() && !searchCategory && (
              <GeminiDJ tracks={musicCatalog} onStartSet={handleStartDJSet} />
            )}

            {searchCategory === 'made-for-you' && !searchQuery.trim() ? (
              <View>
                <TouchableOpacity
                  style={styles.changeCategoryButton}
                  onPress={() => setSearchCategory(null)}
                >
                  <Text style={styles.changeCategoryText}>‹ Categories</Text>
                </TouchableOpacity>
                {featuredSections.map((section) => (
                  <View key={section.id} style={styles.homeFeaturedSection}>
                    <Text style={styles.homeSectionTitle}>{section.title}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {section.cards.map((card, index) => (
                        <TouchableOpacity
                          key={card.id}
                          style={styles.homeFeaturedCard}
                          onPress={() => handlePlayTrack(musicCatalog[index % musicCatalog.length])}
                        >
                          <Image source={{ uri: card.image }} style={styles.homeFeaturedImage} />
                          <Text style={styles.homeFeaturedTitle} numberOfLines={2}>
                            {card.subtitle}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ))}
              </View>
            ) : searchQuery.trim() || searchCategory === 'music' ? (
              <View style={styles.searchResults}>
                {searchCategory && (
                  <TouchableOpacity
                    style={styles.changeCategoryButton}
                    onPress={() => setSearchCategory(null)}
                  >
                    <Text style={styles.changeCategoryText}>‹ Categories</Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.searchResultsHeading}>Songs</Text>
                {isMusicSearchLoading && searchQuery.trim() ? (
                  <Text style={styles.searchResultsHeading}>Searching Audius…</Text>
                ) : null}
                {searchResults.length ? searchResults.map((track) => {
                  const artwork = getArtworkSource(track.artwork);
                  return (
                    <View key={track.id} style={styles.searchResultRow}>
                      <TouchableOpacity
                        style={styles.searchResultMain}
                        activeOpacity={0.75}
                        onPress={() => handlePlayTrack(track, searchResults)}
                      >
                        {artwork ? (
                          <Image source={artwork} style={styles.searchResultArtwork} />
                        ) : (
                          <View style={[styles.searchResultArtwork, styles.placeholderBox]}>
                            <Text style={styles.placeholderSymbol}>♪</Text>
                          </View>
                        )}
                        <View style={styles.searchResultMeta}>
                          <Text style={styles.searchResultTitle} numberOfLines={1}>{track.title}</Text>
                          <Text style={styles.searchResultSubtitle} numberOfLines={1}>
                            {track.artist} · {track.source === 'audius'
                              ? 'Audius · Full track'
                              : track.isPreview ? 'Preview' : 'Full track'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.songMoreButton}
                        onPress={() => handleOpenTrackActions(track)}
                        accessibilityLabel={`More options for ${track.title}`}
                        hitSlop={8}
                      >
                        <Text style={styles.songMoreIcon}>•••</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }) : isMusicSearchLoading ? null : (
                  <Text style={styles.noRecommendedTracks}>No results found. Try another search.</Text>
                )}
              </View>
            ) : (
              <View style={styles.categoryGrid}>
                {SEARCH_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryCard, { backgroundColor: cat.color }]}
                    onPress={() => {
                      setSearchQuery('');
                      setSearchCategory(cat.id);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Browse ${cat.title}`}
                  >
                    <Text style={styles.categoryTitle}>{cat.title}</Text>
                    <Image source={{ uri: cat.image }} style={styles.categoryImage} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

          </ScrollView>
        ) : activeTab === TABS.LIBRARY ? (
          <LibraryView
            onOpenPlaylist={(playlist) => setSelectedPlaylistId(playlist.id)}
            userProfile={currentUser}
          />
        ) : activeTab === TABS.CREATE ? (
          <CreateView
            onOpenPlaylist={(playlist) => {
              setActiveTab(TABS.HOME);
              setSelectedPlaylistId(playlist.id);
            }}
            onSwitchToLibrary={() => setActiveTab(TABS.LIBRARY)}
            userProfile={currentUser}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.homeScrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.homeFilterRow}>
              <TouchableOpacity
                style={styles.homeAvatar}
                onPress={() => setIsProfileDrawerOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Open your profile menu"
              >
                {currentUser?.photoURL || authContextValue?.userProfile?.photoURL ? (
                  <Image
                    source={{ uri: currentUser?.photoURL || authContextValue.userProfile.photoURL }}
                    style={styles.homeAvatarImage}
                  />
                ) : (
                  <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
                )}
              </TouchableOpacity>
              {['All', 'Music'].map((filter) => {
                const isActive = homeFilter === filter;
                return (
                  <TouchableOpacity
                    key={filter}
                    style={[styles.homeFilterChip, isActive && styles.homeFilterChipActive]}
                    onPress={() => setHomeFilter(filter)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={filter === 'Music' ? 'Show all music recommendations' : 'Show all recommendations'}
                    activeOpacity={0.65}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[styles.homeFilterText, isActive && styles.homeFilterTextActive]}>
                      {filter}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={styles.homeSignOutButton}
                onPress={handleSignOut}
                accessibilityRole="button"
                activeOpacity={0.65}
                hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
              >
                <Text style={styles.homeSignOutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.searchBarContainer}
              activeOpacity={0.85}
              onPress={() => setIsHomeSearchOpen(true)}
              accessibilityRole="search"
              accessibilityLabel={searchQuery || 'Search songs or artists'}
            >
              <Text style={styles.searchIcon}>🔍</Text>
              <Text style={styles.homeSearchPlaceholder} numberOfLines={1}>
                {searchQuery || 'Search songs or artists...'}
              </Text>
              {searchQuery ? (
                <TouchableOpacity
                  style={styles.searchClearButton}
                  onPress={(event) => {
                    event.stopPropagation();
                    setSearchQuery('');
                  }}
                  accessibilityLabel="Clear search"
                >
                  <Text style={styles.searchClearText}>×</Text>
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>

            <View style={[styles.homeShortcutGrid, searchQuery.trim() && styles.dimmedWhileSearching]}>
              {homePlaylistCards.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.homeShortcut}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (item.playlist) {
                      setSelectedPlaylistId(item.playlist.id);
                    } else {
                      handlePlayTrack(musicCatalog[index % musicCatalog.length]);
                    }
                  }}
                >
                  {item.image ? (
                    <Image
                      source={typeof item.image === 'string' ? { uri: item.image } : item.image}
                      style={styles.homeShortcutImage}
                    />
                  ) : (
                    <View style={[styles.homeShortcutImage, styles.homeShortcutFallback]}>
                      <Text style={styles.homeShortcutFallbackText}>♫</Text>
                    </View>
                  )}
                  <Text style={styles.homeShortcutTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {featuredSections.map((section) => (
              <React.Fragment key={section.id}>
                <View
                  style={[
                    styles.homeFeaturedSection,
                    searchQuery.trim() && styles.dimmedWhileSearching,
                  ]}
                >
                  <Text style={styles.homeSectionTitle}>{section.title}</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.homeFeaturedRow}
                  >
                    {section.cards.map((card, index) => (
                      <TouchableOpacity
                        key={card.id}
                        style={styles.homeFeaturedCard}
                        activeOpacity={0.8}
                        onPress={() => handlePlayTrack(musicCatalog[index % musicCatalog.length])}
                      >
                        <Image source={{ uri: card.image }} style={styles.homeFeaturedImage} />
                        <Text style={styles.homeFeaturedTitle} numberOfLines={2}>
                          {card.subtitle}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                {section.id === 'new-music' && (
                  <View
                    style={[
                      styles.recommendedSection,
                      searchQuery.trim() && styles.dimmedWhileSearching,
                    ]}
                  >
                    <Text style={styles.homeSectionTitle}>Recommended tracks</Text>
                    {recommendedTracks.length > 0 ? recommendedTracks.map((track) => (
                      <SwipeableTrackRow
                        key={track.id}
                        track={track}
                        isSelected={currentTrack?.id === track.id}
                        onPress={() => handlePlayTrack(track)}
                        onOpenMenu={() => handleOpenTrackActions(track)}
                        onAddToQueue={musicContext.addToQueue}
                        onAddToPlaylist={handleOpenAddToPlaylist}
                        onToggleFavorite={musicContext.toggleLikeTrack}
                        isLiked={musicContext.isLiked(track.id)}
                      />
                    )) : (
                      <Text style={styles.noRecommendedTracks}>
                        No tracks found. Try another search.
                      </Text>
                    )}
                  </View>
                )}
              </React.Fragment>
            ))}
          </ScrollView>
        )}
      </View>

      <Modal
        visible={isHomeSearchOpen && activeTab === TABS.HOME}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeHomeSearch}
      >
        <View style={styles.homeSearchModal}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeHomeSearch}
            accessibilityLabel="Close search"
          />
          <View style={styles.homeSearchPanel}>
            <View style={styles.searchBarContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search songs or artists..."
                placeholderTextColor="#777777"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoFocus
                accessibilityLabel="Search songs or artists"
              />
              <TouchableOpacity
                style={styles.searchClearButton}
                onPress={closeHomeSearch}
                accessibilityLabel="Cancel search"
              >
                <Text style={styles.searchClearText}>×</Text>
              </TouchableOpacity>
            </View>
            {searchQuery.trim() ? (
              <ScrollView
                style={styles.searchResults}
                keyboardShouldPersistTaps="always"
              >
                <Text style={styles.searchResultsHeading}>Songs</Text>
                {isMusicSearchLoading ? (
                  <Text style={styles.searchResultsHeading}>Searching music sources…</Text>
                ) : null}
                {searchResults.length ? searchResults.map((track) => (
                  <SwipeableTrackRow
                    key={track.id}
                    track={track}
                    isSelected={currentTrack?.id === track.id}
                    onPress={() => {
                      handlePlayTrack(track);
                      closeHomeSearch();
                    }}
                    onOpenMenu={() => handleOpenTrackActions(track)}
                    onAddToQueue={musicContext.addToQueue}
                    onAddToPlaylist={(t) => {
                      handleOpenAddToPlaylist(t);
                      closeHomeSearch();
                    }}
                    onToggleFavorite={musicContext.toggleLikeTrack}
                    isLiked={musicContext.isLiked(track.id)}
                  />
                )) : isMusicSearchLoading ? null : (
                  <Text style={styles.noRecommendedTracks}>No results found. Try another search.</Text>
                )}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      <PlaylistDetailModal
        visible={!!selectedPlaylist}
        playlist={selectedPlaylist}
        onClose={() => setSelectedPlaylistId(null)}
        onPlayTrack={(track) =>
          handlePlayTrack(track, selectedPlaylist?.tracks?.length ? selectedPlaylist.tracks : musicCatalog)
        }
        currentTrack={currentTrack}
        onOpenTrackMenu={(track, playlistId) => handleOpenTrackActions(track, playlistId)}
        onAddToQueue={musicContext.addToQueue}
        onAddToPlaylist={handleOpenAddToPlaylist}
        onToggleFavorite={musicContext.toggleLikeTrack}
        isLiked={musicContext.isLiked}
        onDeletePlaylist={musicContext.deletePlaylist}
        userProfile={currentUser}
        onAttachProfile={(playlistId) =>
          musicContext.attachUserProfileToPlaylist(playlistId, currentUser)
        }
      />

      <AddToPlaylistModal
        visible={isAddToPlaylistOpen}
        track={trackToAdd}
        playlists={musicContext.playlists}
        onClose={() => setIsAddToPlaylistOpen(false)}
        onSelectPlaylist={handleAddTrackToPlaylist}
        onCreatePlaylist={musicContext.createPlaylist}
      />

      {/* Full-Screen Player Modal */}
      <Modal
        visible={isPlayerModalOpen}
        animationType="slide"
        onRequestClose={() => setIsPlayerModalOpen(false)}
      >
        <SafeAreaView style={styles.fullPlayerBackground}>
          <ScrollView contentContainerStyle={styles.fullPlayerScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.fullPlayerHeader}>
              <TouchableOpacity
                onPress={() => setIsPlayerModalOpen(false)}
                style={styles.headerBtnLeft}
                activeOpacity={0.6}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <Text style={styles.headerChevron}>⌵</Text>
              </TouchableOpacity>

              <Text style={styles.headerTitleText}>Playing Song</Text>

              <TouchableOpacity
                style={styles.headerBtnRight}
                activeOpacity={0.6}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <Text style={styles.headerDots}>•••</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.artworkWrapper}>
              {playerArtwork ? (
                <Image source={playerArtwork} style={styles.fullArtworkImage} />
              ) : (
                <View style={[styles.fullArtworkImage, styles.placeholderBox]}>
                  <Text style={styles.placeholderSymbolLarge}>♪</Text>
                </View>
              )}
            </View>

            <View style={styles.trackDetailsRow}>
              <View style={styles.trackTextGroup}>
                <Text style={styles.fullTrackTitle} numberOfLines={1}>
                  {currentTrack?.title || 'Na Para Bang'}
                </Text>
                <Text style={styles.fullTrackArtist} numberOfLines={1}>
                  {currentTrack?.artist || 'Mariah Deborah'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => currentTrack && musicContext.toggleLikeTrack(currentTrack)}
                style={styles.addCircleBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.addCircleIcon, isLiked && styles.likedHeartActive]}>
                  {isLiked ? '♥' : '♡'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={1}
              style={styles.scrubberContainer}
              onPress={(evt) => {
                const clickX = evt.nativeEvent.locationX;
                const totalWidth = 320;
                const pct = Math.max(0, Math.min(1, clickX / totalWidth));
                const targetSecs = pct * duration;
                if (typeof audioPlayer?.seekTo === 'function') {
                  audioPlayer.seekTo(targetSecs);
                }
              }}
            >
              <View style={styles.scrubberTrackBg}>
                <View style={[styles.scrubberTrackFill, { width: `${progressPercent}%` }]} />
                <View style={[styles.scrubberKnob, { left: `${progressPercent}%` }]} />
              </View>
              <View style={styles.timeLabelRow}>
                <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                <Text style={styles.timeText}>
                  -{formatTime(Math.max(0, duration - currentTime))}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.controlsRow}>
              <TouchableOpacity
                onPress={handleToggleShuffle}
                style={styles.controlTouchArea}
                accessibilityRole="button"
                accessibilityLabel={isShuffle ? 'Turn shuffle off' : 'Turn shuffle on'}
              >
                <Text
                  style={[styles.secondaryControl, isShuffle && styles.activeControlState]}
                >
                  🔀
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handlePlayPrevious} style={styles.controlTouchArea}>
                <Text style={styles.prevNextControl}>⏮</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.playCircleButton}
                onPress={handleTogglePlay}
                activeOpacity={0.8}
              >
                <Text style={styles.playCircleIcon}>{isPlaying ? '❚❚' : '▶'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handlePlayNext} style={styles.controlTouchArea}>
                <Text style={styles.prevNextControl}>⏭</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleToggleRepeat}
                style={styles.controlTouchArea}
                accessibilityRole="button"
                accessibilityLabel={
                  repeatMode === REPEAT_MODE.ONE
                    ? 'Repeat current song'
                    : repeatMode === REPEAT_MODE.ALL
                      ? 'Repeat all songs'
                      : 'Repeat off'
                }
              >
                <Text
                  style={[
                    styles.secondaryControl,
                    repeatMode !== (REPEAT_MODE?.OFF || 'OFF') && styles.activeControlState,
                  ]}
                >
                  {repeatMode === (REPEAT_MODE?.ONE || 'ONE') ? '🔂' : '🔁'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionBarRow}>
              <TouchableOpacity style={styles.actionIconBtn}>
                <Text style={styles.actionIconSymbol}>📱</Text>
              </TouchableOpacity>

              <View style={styles.fromBadge}>
                <View style={styles.badgeAvatar}>
                  <Text style={styles.badgeAvatarText}>
                    {userName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.badgeText}>From {userName}</Text>
              </View>

              <View style={styles.actionRightGroup}>
                <TouchableOpacity style={styles.actionIconBtn}>
                  <Text style={styles.actionIconSymbol}>⬆</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionIconBtn}
                  onPress={() => setIsQueueModalOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Open playback queue"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.actionIconSymbol}>≡</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.aboutArtistContainer}>
              <Image
                source={{
                  uri:
                    currentTrack?.artistImage ||
                    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80',
                }}
                style={styles.artistBannerImage}
              />
              <View style={styles.artistInfoOverlay}>
                <Text style={styles.aboutArtistHeader}>About the artist</Text>
                <Text style={styles.artistNameTitle}>
                  {currentTrack?.artist || 'Mariah Deborah'}
                </Text>
                <View style={styles.listenersRow}>
                  <Text style={styles.listenersText}>1,248,590 monthly listeners</Text>
                  <TouchableOpacity style={styles.followButton}>
                    <Text style={styles.followButtonText}>Follow</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.artistBioText} numberOfLines={3}>
                  Mariah Deborah is an independent indie-pop singer-songwriter known for her soulful acoustic arrangements and heartfelt lyrical storytelling.
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <QueueModal
        visible={isQueueModalOpen}
        onClose={() => setIsQueueModalOpen(false)}
      />

      <TrackActionSheetModal
        visible={!!trackForActions}
        track={trackForActions}
        onClose={closeTrackActions}
        onAddToPlaylist={handleOpenAddToPlaylist}
        onRemoveFromPlaylist={
          actionTrackPlaylistId
            ? (track) => musicContext.removeTrackFromPlaylist(actionTrackPlaylistId, track.id)
            : undefined
        }
        onAddToQueue={musicContext.addToQueue}
        onGoToQueue={() => setIsQueueModalOpen(true)}
        onToggleLike={musicContext.toggleLikeTrack}
        isLiked={trackForActions ? musicContext.isLiked(trackForActions.id) : false}
        isInPlaylist={!!actionTrackPlaylistId}
      />

      <ProfileDrawer
        visible={isProfileDrawerOpen}
        onClose={() => setIsProfileDrawerOpen(false)}
        user={authContextValue?.user}
        userProfile={authContextValue?.userProfile}
        onLogout={handleSignOut}
        onOpenProfile={() => setIsProfileDetailsOpen(true)}
        onOpenRecents={() => setIsRecentsModalOpen(true)}
        onOpenStats={() => setIsListeningStatsOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      <ProfileDetailsModal
        visible={isProfileDetailsOpen}
        onClose={() => setIsProfileDetailsOpen(false)}
        user={authContextValue?.user}
        userProfile={authContextValue?.userProfile}
      />

      <UserStatsModal
        visible={isListeningStatsOpen}
        onClose={() => setIsListeningStatsOpen(false)}
        user={authContextValue?.user}
        userProfile={authContextValue?.userProfile}
        recentTracks={musicContext.recentTracks}
      />

      <RecentPlayedModal
        visible={isRecentsModalOpen}
        onClose={() => setIsRecentsModalOpen(false)}
        recentTracks={musicContext.recentTracks}
        onPlayTrack={(track) => handlePlayTrack(track, musicContext.recentTracks)}
        currentTrack={currentTrack}
        onOpenTrackMenu={handleOpenTrackActions}
        onAddToQueue={musicContext.addToQueue}
        onAddToPlaylist={handleOpenAddToPlaylist}
        onToggleFavorite={musicContext.toggleLikeTrack}
        isLiked={musicContext.isLiked}
      />

      <SettingsModal
        visible={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        user={authContextValue?.user}
        userProfile={authContextValue?.userProfile}
        onLogout={handleSignOut}
        onOpenProfile={() => setIsProfileDetailsOpen(true)}
        privateSession={musicContext.privateSession}
        onSetPrivateSession={musicContext.setPrivateSession}
        onClearHistory={musicContext.clearRecentTracks}
      />

      {/* Bottom Bar Integration */}
      <BottomNavBar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenPlayer={() => setIsPlayerModalOpen(true)}
      />
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 8,
  },
  homeScrollContent: {
    paddingHorizontal: 14,
    paddingTop: 22,
    paddingBottom: 24,
  },
  homeFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    minHeight: 44,
    position: 'relative',
    zIndex: 2,
    elevation: 2,
  },
  homeAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1DB954',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 10,
  },
  homeAvatarImage: {
    width: '100%',
    height: '100%',
  },
  homeFilterChip: {
    minHeight: 36,
    minWidth: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#6A6A6A',
    backgroundColor: '#282828',
    marginRight: 8,
  },
  homeFilterChipActive: {
    borderColor: '#1ED760',
    backgroundColor: '#1ED760',
  },
  homeFilterText: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  homeFilterTextActive: {
    color: '#101010',
    fontWeight: '600',
  },
  homeSignOutButton: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    minHeight: 36,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#282828',
    zIndex: 3,
    elevation: 3,
  },
  homeSignOutText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  homeShortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  dimmedWhileSearching: {
    opacity: 0.4,
  },
  homeShortcut: {
    width: '49%',
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#292929',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  homeShortcutImage: {
    width: 43,
    height: 43,
    backgroundColor: '#333333',
  },
  homeShortcutFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeShortcutFallbackText: {
    color: '#1ED760',
    fontSize: 24,
    fontWeight: 'bold',
  },
  homeShortcutTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    paddingHorizontal: 8,
  },
  recommendedSection: {
    marginBottom: 18,
  },
  recommendedPlayIcon: {
    color: '#FFFFFF',
    fontSize: 13,
    marginHorizontal: 12,
  },
  trackRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 58,
  },
  songMoreButton: {
    minWidth: 40,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  songMoreIcon: {
    color: '#B3B3B3',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  changeCategoryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  changeCategoryText: {
    color: '#1ED760',
    fontSize: 14,
    fontWeight: '600',
  },
  noRecommendedTracks: {
    color: '#B3B3B3',
    fontSize: 14,
    paddingVertical: 12,
  },
  homeFeaturedSection: {
    marginBottom: 18,
  },
  homeSectionTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 14,
  },
  homeFeaturedRow: {
    paddingRight: 14,
  },
  homeFeaturedCard: {
    width: 150,
    marginRight: 16,
  },
  homeFeaturedImage: {
    width: '100%',
    height: 150,
    borderRadius: 6,
    backgroundColor: '#242424',
  },
  homeFeaturedTitle: {
    color: '#B3B3B3',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  welcomeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  userProfileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeTextGroup: {
    marginLeft: 10,
  },
  welcomeSubtext: {
    color: '#B3B3B3',
    fontSize: 12,
  },
  welcomeUsername: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  avatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1DB954',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 15,
  },
  signOutBtn: {
    backgroundColor: '#282828',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  signOutBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#242424',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 0,
  },
  homeSearchPlaceholder: {
    flex: 1,
    color: '#B3B3B3',
    fontSize: 14,
  },
  searchClearButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchClearText: {
    color: '#FFFFFF',
    fontSize: 25,
    lineHeight: 28,
    fontWeight: '300',
  },
  homeSearchModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 54,
    paddingHorizontal: 14,
  },
  homeSearchPanel: {
    backgroundColor: '#121212',
    borderRadius: 10,
    padding: 10,
    maxHeight: '75%',
  },
  sectionHeader: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 12,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTrackRow: {
    backgroundColor: '#1a241a',
    borderRadius: 6,
  },
  trackArtwork: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#282828',
  },
  placeholderBox: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#282828',
  },
  placeholderSymbol: {
    color: '#B3B3B3',
    fontSize: 18,
  },
  trackMetaContainer: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  activeText: {
    color: '#1DB954',
  },
  trackArtist: {
    color: '#B3B3B3',
    fontSize: 12,
    marginTop: 2,
  },
  moreButton: {
    padding: 8,
  },
  moreIcon: {
    color: '#B3B3B3',
    fontSize: 14,
  },
  searchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1DB954',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  miniAvatarText: {
    color: '#000',
    fontWeight: 'bold',
  },
  searchTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  whiteSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    height: 46,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIconDark: {
    fontSize: 16,
    marginRight: 8,
  },
  whiteSearchInput: {
    flex: 1,
    color: '#000',
    fontSize: 14,
  },
  searchClearTextDark: {
    color: '#333333',
    fontSize: 25,
    lineHeight: 28,
    fontWeight: '300',
  },
  searchResults: {
    backgroundColor: '#202020',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  searchResultsHeading: {
    color: '#B3B3B3',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  searchResultMain: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchResultArtwork: {
    width: 44,
    height: 44,
    borderRadius: 4,
    backgroundColor: '#333333',
  },
  searchResultMeta: {
    flex: 1,
    marginLeft: 12,
  },
  searchResultTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  searchResultSubtitle: {
    color: '#B3B3B3',
    fontSize: 12,
    marginTop: 3,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    height: 90,
    borderRadius: 4,
    padding: 10,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  categoryTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    width: '70%',
  },
  categoryImage: {
    width: 60,
    height: 60,
    position: 'absolute',
    bottom: -5,
    right: -10,
    transform: [{ rotate: '25deg' }],
    borderRadius: 4,
  },
  libraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topIcon: {
    color: '#FFF',
    fontSize: 18,
  },
  chipSingleRow: {
    marginBottom: 12,
  },
  chip: {
    backgroundColor: '#282828',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  sortBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sortLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortIcon: {
    color: '#B3B3B3',
    fontSize: 14,
    marginRight: 6,
  },
  sortLabel: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  coverBox: {
    width: 52,
    height: 52,
    borderRadius: 4,
    backgroundColor: '#282828',
  },
  likedBox: {
    backgroundColor: '#4A148C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  likedHeart: {
    color: '#FFF',
    fontSize: 22,
  },
  djBox: {
    backgroundColor: '#006064',
    justifyContent: 'center',
    alignItems: 'center',
  },
  djCircle: {
    color: '#1DB954',
    fontSize: 24,
  },
  playlistMeta: {
    flex: 1,
    marginLeft: 12,
  },
  playlistTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  playlistSub: {
    color: '#B3B3B3',
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#282828',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 80,
  },
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#383838',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOptionIcon: {
    fontSize: 18,
  },
  modalMeta: {
    flex: 1,
    marginLeft: 12,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOptionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  betaTag: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  betaText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: 'bold',
  },
  modalOptionSub: {
    color: '#B3B3B3',
    fontSize: 12,
    marginTop: 2,
  },
  fullPlayerBackground: {
    flex: 1,
    backgroundColor: '#3D4853',
  },
  fullPlayerScroll: {
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 24,
  },
  fullPlayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 12,
    minHeight: 40,
    zIndex: 10,
  },
  headerBtnLeft: {
    padding: 10,
    zIndex: 20,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnRight: {
    padding: 10,
    zIndex: 20,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerChevron: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: -4,
  },
  headerTitleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerDots: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  artworkWrapper: {
    alignItems: 'center',
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  fullArtworkImage: {
    width: 310,
    height: 310,
    borderRadius: 8,
    backgroundColor: '#282828',
  },
  placeholderSymbolLarge: {
    color: '#B3B3B3',
    fontSize: 72,
  },
  trackDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  trackTextGroup: {
    flex: 1,
    marginRight: 16,
  },
  fullTrackTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  fullTrackArtist: {
    color: '#C0C7CE',
    fontSize: 15,
    marginTop: 4,
  },
  addCircleBtn: {
    padding: 6,
  },
  addCircleIcon: {
    color: '#FFFFFF',
    fontSize: 24,
  },
  likedHeartActive: {
    color: '#1DB954',
  },
  scrubberContainer: {
    marginBottom: 20,
    paddingVertical: 4,
  },
  scrubberTrackBg: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 2,
    position: 'relative',
    marginBottom: 8,
  },
  scrubberTrackFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  scrubberKnob: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    marginLeft: -6,
  },
  timeLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: '#C0C7CE',
    fontSize: 12,
    fontWeight: '500',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  controlTouchArea: {
    padding: 8,
  },
  secondaryControl: {
    color: '#FFFFFF',
    fontSize: 20,
    opacity: 0.7,
  },
  activeControlState: {
    color: '#1DB954',
    opacity: 1,
  },
  prevNextControl: {
    color: '#FFFFFF',
    fontSize: 28,
  },
  playCircleButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playCircleIcon: {
    color: '#000000',
    fontSize: 22,
    marginLeft: 2,
  },
  actionBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  actionIconBtn: {
    padding: 6,
  },
  actionIconSymbol: {
    color: '#FFFFFF',
    fontSize: 18,
    opacity: 0.8,
  },
  fromBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1DB954',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  badgeAvatarText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  actionRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aboutArtistContainer: {
    backgroundColor: '#242D35',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 30,
  },
  artistBannerImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#1C2329',
  },
  artistInfoOverlay: {
    padding: 16,
  },
  aboutArtistHeader: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  artistNameTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  listenersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listenersText: {
    color: '#C0C7CE',
    fontSize: 12,
  },
  followButton: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  artistBioText: {
    color: '#C0C7CE',
    fontSize: 13,
    lineHeight: 18,
  },
});