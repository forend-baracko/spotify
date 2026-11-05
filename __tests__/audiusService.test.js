jest.mock('../src/constants/config', () => ({
  AUDIO_CONFIG: { apiBaseUrl: '' },
}));

import {
  fetchAudiusTracks,
  searchAudiusTracks,
} from '../src/services/audiusService';
import { AUDIO_CONFIG } from '../src/constants/config';

const responseFor = (data) => ({
  ok: true,
  json: async () => ({ data }),
});

describe('Audius music service', () => {
  let originalFetch;
  let originalApiBaseUrl;

  beforeEach(() => {
    originalFetch = global.fetch;
    originalApiBaseUrl = AUDIO_CONFIG.apiBaseUrl;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    AUDIO_CONFIG.apiBaseUrl = originalApiBaseUrl;
    jest.restoreAllMocks();
  });

  it('loads trending streamable tracks as full-length playable tracks', async () => {
    global.fetch.mockResolvedValueOnce(
      responseFor([
        {
          id: 'track-id',
          title: 'Full Song',
          user: {
            name: 'Audius Artist',
            handle: 'artist',
          },
          artwork: {
            '1000x1000': 'https://example.test/cover.jpg',
          },
          duration: 205,
          genre: 'Hip-Hop/Rap',
          permalink: '/artist/full-song',
          is_streamable: true,
        },
        { id: 'unstreamable', is_streamable: false },
      ])
    );

    await expect(fetchAudiusTracks(1)).resolves.toEqual([
      {
        id: 'audius-track-id',
        title: 'Full Song',
        artist: 'Audius Artist',
        album: '',
        genre: 'Hip-Hop/Rap',
        categories: ['Hip-Hop', 'Rap'],
        artwork: 'https://example.test/cover.jpg',
        stream_url:
          'https://discoveryprovider.audius.co/v1/tracks/track-id/stream?app_name=Spotibai',
        fallback_stream_url:
          'https://discoveryprovider.audius.co/v1/tracks/track-id/stream?app_name=Spotibai',
        source_url: 'https://audius.co/artist/full-song',
        duration: 205,
        source: 'audius',
        isPreview: false,
      },
    ]);

    expect(global.fetch.mock.calls[0][0]).toContain('/tracks/trending?time=week&limit=1');
    expect(global.fetch.mock.calls[0][0]).toContain('app_name=Spotibai');
  });

  it('searches Audius and maps results to full-track stream URLs', async () => {
    global.fetch.mockResolvedValueOnce(
      responseFor([
        {
          id: 'search-id',
          title: 'Search Track',
          user: { handle: 'search-artist' },
          duration: 180,
          is_streamable: true,
        },
      ])
    );

    const tracks = await searchAudiusTracks('Search Song', 10);

    expect(tracks).toHaveLength(1);
    expect(tracks[0]).toMatchObject({
      id: 'audius-search-id',
      artist: 'search-artist',
      source: 'audius',
      isPreview: false,
    });
    expect(global.fetch.mock.calls[0][0]).toContain(
      '/tracks/search?query=Search%20Song&limit=10'
    );
    expect(tracks[0].stream_url).toContain('/tracks/search-id/stream');
  });

  it('uses the Express audio proxy when an API base URL is configured', async () => {
    AUDIO_CONFIG.apiBaseUrl = 'http://localhost:3001/';
    global.fetch.mockResolvedValueOnce(
      responseFor([
        {
          id: 'proxy-track',
          title: 'Proxy Track',
          is_streamable: true,
        },
      ])
    );

    const tracks = await searchAudiusTracks('Proxy');

    expect(tracks[0].stream_url).toBe(
      'http://localhost:3001/api/audio/tracks/proxy-track'
    );
  });

  it('rejects unsuccessful Audius API responses', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 503 });

    await expect(fetchAudiusTracks()).rejects.toThrow('Audius returned HTTP 503');
  });
});
