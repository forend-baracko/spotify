import { AUDIO_CONFIG } from '../constants/config';
import { normalizeTrackCategories } from '../utils/trackCategories';

const API_BASE_URL = 'https://discoveryprovider.audius.co/v1';
const APP_NAME = 'Spotibai';

const getDirectTrackStreamUrl = (trackId) =>
  `${API_BASE_URL}/tracks/${encodeURIComponent(trackId)}/stream?app_name=${encodeURIComponent(APP_NAME)}`;

const getTrackStreamUrl = (trackId) =>
  AUDIO_CONFIG.apiBaseUrl
    ? `${AUDIO_CONFIG.apiBaseUrl.replace(/\/+$/, '')}/api/audio/tracks/${encodeURIComponent(trackId)}`
    : getDirectTrackStreamUrl(trackId);

const requestTracks = async (path) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(
      `${API_BASE_URL}${path}${path.includes('?') ? '&' : '?'}app_name=${encodeURIComponent(APP_NAME)}`,
      { signal: controller.signal }
    );
    if (!response.ok) {
      throw new Error(`Audius returned HTTP ${response.status}`);
    }

    const payload = await response.json();
    if (payload?.data == null) {
      throw new Error(payload?.error || 'Audius response did not contain track data');
    }
    if (!Array.isArray(payload.data)) {
      throw new Error('Audius response did not contain a tracks list');
    }
    return payload.data;
  } finally {
    clearTimeout(timeoutId);
  }
};

const normalizeTrack = (track) => {
  if (track.is_streamable === false || track.is_stream_gated === true) return null;
  const trackId = track.id ?? track.track_id;
  if (trackId == null) return null;

  const artwork =
    track.artwork?.['1000x1000'] ||
    track.artwork?.['480x480'] ||
    track.artwork?.['150x150'] ||
    track.user?.profile_picture?.['480x480'] ||
    '';
  const artist = track.user?.name || track.user?.handle || 'Unknown Artist';
  const genre = typeof track.genre === 'string' ? track.genre : '';
  const permalink = track.permalink
    ? `https://audius.co${track.permalink.startsWith('/') ? '' : '/'}${track.permalink}`
    : `https://audius.co/track/${trackId}`;

  return {
    id: `audius-${trackId}`,
    title: track.title || 'Untitled',
    artist,
    album: '',
    ...(genre ? { genre } : {}),
    categories: normalizeTrackCategories(
      track.categories,
      track.tags,
      track.moods,
      track.mood,
      genre
    ),
    artwork,
    stream_url: getTrackStreamUrl(trackId),
    fallback_stream_url: getDirectTrackStreamUrl(trackId),
    source_url: permalink,
    duration: Number(track.duration) || 0,
    source: 'audius',
    isPreview: false,
  };
};

const normalizeTracks = (tracks) =>
  tracks.map(normalizeTrack).filter(Boolean);

export const fetchAudiusTracks = async (limit = 50) => {
  const cappedLimit = Math.max(1, Math.min(Number(limit) || 50, 100));
  const tracks = await requestTracks(
    `/tracks/trending?time=week&limit=${cappedLimit}`
  );
  return normalizeTracks(tracks).slice(0, cappedLimit);
};

export const searchAudiusTracks = async (query, limit = 20) => {
  const normalizedQuery = query?.trim();
  if (!normalizedQuery) return [];

  const cappedLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
  const tracks = await requestTracks(
    `/tracks/search?query=${encodeURIComponent(normalizedQuery)}&limit=${cappedLimit}`
  );
  return normalizeTracks(tracks).slice(0, cappedLimit);
};