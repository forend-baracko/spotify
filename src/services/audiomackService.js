import { AUDIOMACK_CONFIG } from '../constants/config';
import { MOCK_TRACKS } from '../assets/tracks/mockData';
import { normalizeTrackCategories } from '../utils/trackCategories';

export { MOCK_TRACKS };

const getAuthHeaders = () => ({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  ...(AUDIOMACK_CONFIG.apiKey
    ? { Authorization: `Bearer ${AUDIOMACK_CONFIG.apiKey}` }
    : {}),
});

const normalizeApiTracks = (results) =>
  results.map((item) => ({
    id: item.id || String(Math.random()),
    title: item.title || 'Untitled',
    artist: item.artist || item.uploader_name || 'Unknown Artist',
    album: item.album || '',
    duration: item.duration || '3:00',
    artwork:
      item.image ||
      item.raw_image ||
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80',
    plays: item.plays || '0',
    genre: item.genre || 'Music',
    categories: normalizeTrackCategories(
      item.categories,
      item.tags,
      item.moods,
      item.mood,
      item.genre
    ),
  }));

const filterLocalTracks = (query) => {
  const normalizedQuery = query.trim().toLowerCase();
  return MOCK_TRACKS.filter((track) =>
    [track.title, track.artist, track.album, track.genre]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalizedQuery))
  );
};

export const getTrendingMusic = async (genre = 'all') => {
  if (AUDIOMACK_CONFIG.useMockData || !AUDIOMACK_CONFIG.apiKey) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return MOCK_TRACKS;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const url = `${AUDIOMACK_CONFIG.baseUrl}/trending${genre !== 'all' ? `?genre=${genre}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.warn(`Audiomack API error: ${response.status}. Falling back to local tracks.`);
      return MOCK_TRACKS;
    }

    const data = await response.json();
    return Array.isArray(data?.results) ? normalizeApiTracks(data.results) : MOCK_TRACKS;
  } catch (error) {
    console.warn('Audiomack API network failure, using local tracks:', error.message);
    return MOCK_TRACKS;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const searchMusic = async (query, show = 'songs') => {
  if (!query?.trim()) {
    return [];
  }

  const cleanQuery = query.trim().toLowerCase();
  if (AUDIOMACK_CONFIG.useMockData || !AUDIOMACK_CONFIG.apiKey) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return filterLocalTracks(cleanQuery);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const url = `${AUDIOMACK_CONFIG.baseUrl}/search?q=${encodeURIComponent(cleanQuery)}&show=${show}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.warn(`Audiomack search error: ${response.status}`);
      return filterLocalTracks(cleanQuery);
    }

    const data = await response.json();
    return Array.isArray(data?.results) ? normalizeApiTracks(data.results) : [];
  } catch (error) {
    console.warn('Audiomack search network error, filtering local tracks:', error.message);
    return filterLocalTracks(cleanQuery);
  } finally {
    clearTimeout(timeoutId);
  }
};

export const getSongDetails = async (songId) => {
  if (AUDIOMACK_CONFIG.useMockData || !AUDIOMACK_CONFIG.apiKey) {
    return MOCK_TRACKS.find((track) => track.id === songId) || MOCK_TRACKS[0];
  }

  try {
    const response = await fetch(`${AUDIOMACK_CONFIG.baseUrl}/songs/${songId}`, {
      headers: getAuthHeaders(),
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn('Failed to fetch song details:', error);
  }

  return MOCK_TRACKS[0];
};
