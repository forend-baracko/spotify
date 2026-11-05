jest.mock('../src/constants/config', () => ({
  AUDIO_CONFIG: { apiBaseUrl: 'http://localhost:3001' },
}));

import { createGeminiDjSet } from '../src/services/geminiService';

describe('Gemini service category payload', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('sends each track’s category tags to the AI DJ backend', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        title: 'Sad OPM R&B',
        intro: 'A reflective pick.',
        trackId: 'track-1',
      }),
    });
    const user = { getIdToken: jest.fn().mockResolvedValue('test-token') };

    await createGeminiDjSet(user, 'sad RNB OPM', [{
      id: 'track-1',
      title: 'Palayo Sa Mundo',
      artist: 'Jolianne & Arthur Nery',
      categories: ['OPM', 'R&B', 'Sad'],
    }]);

    const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(requestBody.tracks[0].categories).toEqual(['OPM', 'R&B', 'Sad']);
  });
});
