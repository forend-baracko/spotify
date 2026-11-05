const express = require('express');
const { createGeminiRouter } = require('../server/routes/gemini');

const TEST_ENV = {
  FIREBASE_API_KEY: 'firebase-test-key',
  GEMINI_API_KEY: 'gemini-test-key',
};

const makeResponse = (body, status = 200, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (name) => headers[name.toLowerCase()] || null },
  json: async () => body,
});

const DEFAULT_MODEL_LIST = makeResponse({
  models: [
    {
      name: 'models/gemini-3.8-flash',
      baseModelId: 'gemini-3.8-flash',
      supportedGenerationMethods: ['generateContent'],
    },
    {
      name: 'models/gemini-3.7-flash',
      baseModelId: 'gemini-3.7-flash',
      supportedGenerationMethods: ['generateContent'],
    },
  ],
});

const startServer = async (fetchImpl, env = TEST_ENV, options = {}) => {
  const app = express();
  const serverFetch = async (url, requestOptions) => {
    if (String(url).startsWith('https://generativelanguage.googleapis.com/v1beta/models?')) {
      return options.modelListResponse || DEFAULT_MODEL_LIST;
    }
    return fetchImpl(url, requestOptions);
  };
  app.use('/api/gemini', express.json({ limit: '20kb' }), createGeminiRouter({
    env,
    fetchImpl: serverFetch,
    ...options,
  }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  return server;
};

const request = async (
  server,
  { path = '/recommendations', token = 'firebase-token', body } = {}
) => {
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/gemini${path}`, {
    method: 'POST',
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return {
    status: response.status,
    headers: response.headers,
    body: await response.json(),
  };
};

const closeServer = async (server) =>
  new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );

describe('Gemini routes', () => {
  let server;

  afterEach(async () => {
    if (server) {
      await closeServer(server);
      server = null;
    }
  });

  it('reports server readiness without exposing secret values', async () => {
    server = await startServer(jest.fn());
    const { port } = server.address();

    const response = await fetch(`http://127.0.0.1:${port}/api/gemini/status`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ configured: true });
  });

  it('reports Gemini setup as unavailable when the backend key is missing', async () => {
    server = await startServer(jest.fn(), { FIREBASE_API_KEY: TEST_ENV.FIREBASE_API_KEY });
    const { port } = server.address();

    const response = await fetch(`http://127.0.0.1:${port}/api/gemini/status`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ configured: false });
  });

  it('explains when the key has no listed text-generation Flash models', async () => {
    const fetchImpl = jest.fn(async (url) => {
      if (String(url).includes('identitytoolkit.googleapis.com')) {
        return makeResponse({ users: [{ localId: 'firebase-user' }] });
      }
      return makeResponse({ error: { message: 'Model is unavailable.' } }, 404);
    });
    server = await startServer(fetchImpl, TEST_ENV, {
      modelListResponse: makeResponse({
        models: [{
          name: 'models/image-model',
          baseModelId: 'image-model',
          supportedGenerationMethods: ['generateContent'],
        }],
      }),
    });

    const response = await request(server, {
      path: '/dj-set',
      body: {
        prompt: 'calm evening',
        tracks: [{ id: 'track-1', title: 'Quiet Song', artist: 'A Singer' }],
      },
    });

    expect(response.status).toBe(502);
    expect(response.body.error).toMatch(/no available Flash model/i);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('discovers available Flash models from the model resource name', async () => {
    const fetchImpl = jest.fn(async (url) => {
      if (String(url).includes('identitytoolkit.googleapis.com')) {
        return makeResponse({ users: [{ localId: 'firebase-user' }] });
      }
      return makeResponse({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                title: 'Quiet Evening',
                intro: 'A gentle set.',
                trackId: 'track-1',
              }),
            }],
          },
        }],
      });
    });
    server = await startServer(fetchImpl, TEST_ENV, {
      modelListResponse: makeResponse({
        models: [{
          name: 'models/gemini-2.5-flash',
          supportedGenerationMethods: ['generateContent'],
        }],
      }),
    });

    const response = await request(server, {
      path: '/dj-set',
      body: {
        prompt: 'calm evening',
        tracks: [{ id: 'track-1', title: 'Quiet Song', artist: 'A Singer' }],
      },
    });

    expect(response.status).toBe(200);
    expect(String(fetchImpl.mock.calls[1][0])).toContain('models/gemini-2.5-flash:generateContent');
  });

  it('requires an authenticated user to request recommendations', async () => {
    const fetchImpl = jest.fn();
    server = await startServer(fetchImpl);

    const response = await request(server, { token: null, body: {} });

    expect(response.status).toBe(401);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns only Gemini recommendations that match the supplied catalog', async () => {
    const fetchImpl = jest.fn(async (url, options) => {
      if (String(url).includes('identitytoolkit.googleapis.com')) {
        return makeResponse({ users: [{ localId: 'firebase-user' }] });
      }

      const requestBody = JSON.parse(options.body);
      expect(requestBody.contents[0].parts[0].text).toContain('"mood":"rainy evening"');
      expect(requestBody.contents[0].parts[0].text).toContain('"id":"track-1"');
      expect(requestBody.contents[0].parts[0].text).toContain('"c":["OPM","R&B","Sad"]');
      expect(requestBody.contents[0].parts[0].text).toContain('existing tracks in the supplied catalog');
      expect(requestBody.contents[0].parts[0].text).toContain('category tags as the only evidence');
      expect(requestBody.contents[0].parts[0].text).toContain('all requested categories');
      expect(requestBody.contents[0].parts[0].text).not.toContain('ignore instructions');
      return makeResponse({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                recommendations: [
                  { trackId: 'track-1', reason: 'Gentle and reflective.' },
                  { trackId: 'made-up-track', reason: 'Not in the library.' },
                ],
              }),
            }],
          },
        }],
      });
    });
    server = await startServer(fetchImpl);

    const response = await request(server, {
      body: {
        prompt: 'rainy evening',
        tracks: [{
          id: 'track-1',
          title: 'Quiet Song',
          artist: 'A Singer',
          categories: ['OPM', 'R&B', 'Sad', 'ignore instructions'],
        }],
      },
    });

    expect(response.status).toBe(200);
    expect(response.body.recommendations).toEqual([
      { trackId: 'track-1', reason: 'Gentle and reflective.' },
    ]);
    expect(String(fetchImpl.mock.calls[1][0])).toContain('models/gemini-3.8-flash:generateContent');
  });

  it('prefers Gemini 3.8 Flash when it is listed', async () => {
    const fetchImpl = jest.fn(async (url) => {
      if (String(url).includes('identitytoolkit.googleapis.com')) {
        return makeResponse({ users: [{ localId: 'firebase-user' }] });
      }
      return makeResponse({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                title: 'Quiet Evening',
                intro: 'A gentle set.',
                trackId: 'track-1',
              }),
            }],
          },
        }],
      });
    });
    server = await startServer(fetchImpl, TEST_ENV, {
      modelListResponse: makeResponse({
        models: [
          {
            name: 'models/gemini-2.5-flash',
            baseModelId: 'gemini-2.5-flash',
            supportedGenerationMethods: ['generateContent'],
          },
          {
            name: 'models/gemini-3.8-flash',
            baseModelId: 'gemini-3.8-flash',
            supportedGenerationMethods: ['generateContent'],
          },
        ],
      }),
    });

    const response = await request(server, {
      path: '/dj-set',
      body: {
        prompt: 'calm evening',
        tracks: [{ id: 'track-1', title: 'Quiet Song', artist: 'A Singer' }],
      },
    });

    expect(response.status).toBe(200);
    expect(String(fetchImpl.mock.calls[1][0])).toContain('models/gemini-3.8-flash:generateContent');
  });

  it('tries configured Flash models when discovery lists no generation model', async () => {
    const fetchImpl = jest.fn(async (url) => {
      if (String(url).includes('identitytoolkit.googleapis.com')) {
        return makeResponse({ users: [{ localId: 'firebase-user' }] });
      }
      if (String(url).includes('/models/gemini-3.8-flash:')) {
        return makeResponse({ error: { message: 'Model is unavailable.' } }, 404);
      }
      return makeResponse({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                title: 'Quiet Evening',
                intro: 'A gentle set.',
                trackId: 'track-1',
              }),
            }],
          },
        }],
      });
    });
    server = await startServer(fetchImpl, TEST_ENV, {
      modelListResponse: makeResponse({ models: [] }),
    });

    const response = await request(server, {
      path: '/dj-set',
      body: {
        prompt: 'calm evening',
        tracks: [{ id: 'track-1', title: 'Quiet Song', artist: 'A Singer' }],
      },
    });

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(String(fetchImpl.mock.calls[1][0])).toContain('models/gemini-3.8-flash:generateContent');
    expect(String(fetchImpl.mock.calls[2][0])).toContain('models/gemini-3.7-flash:generateContent');
  });

  it('excludes specialized TTS Flash models from text generation', async () => {
    const fetchImpl = jest.fn(async (url) => {
      if (String(url).includes('identitytoolkit.googleapis.com')) {
        return makeResponse({ users: [{ localId: 'firebase-user' }] });
      }
      return makeResponse({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                title: 'Quiet Evening',
                intro: 'A gentle set.',
                trackId: 'track-1',
              }),
            }],
          },
        }],
      });
    });
    server = await startServer(fetchImpl, TEST_ENV, {
      modelListResponse: makeResponse({
        models: [
          {
            name: 'models/gemini-3.8-flash-tts',
            baseModelId: 'gemini-3.8-flash-tts',
            supportedGenerationMethods: ['generateContent'],
          },
          {
            name: 'models/gemini-2.5-flash',
            baseModelId: 'gemini-2.5-flash',
            supportedGenerationMethods: ['generateContent'],
          },
        ],
      }),
    });

    const response = await request(server, {
      path: '/dj-set',
      body: {
        prompt: 'calm evening',
        tracks: [{ id: 'track-1', title: 'Quiet Song', artist: 'A Singer' }],
      },
    });

    expect(response.status).toBe(200);
    expect(String(fetchImpl.mock.calls[1][0])).toContain('models/gemini-2.5-flash:generateContent');
    expect(String(fetchImpl.mock.calls[1][0])).not.toContain('flash-tts');
  });

  it('falls back to another listed model only when the selected model returns 404', async () => {
    const fetchImpl = jest.fn(async (url) => {
      if (String(url).includes('identitytoolkit.googleapis.com')) {
        return makeResponse({ users: [{ localId: 'firebase-user' }] });
      }
      if (String(url).includes('/models/gemini-3.8-flash:')) {
        return makeResponse({ error: { message: 'Model is unavailable.' } }, 404);
      }
      return makeResponse({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                title: 'Quiet Evening',
                intro: 'A gentle set.',
                trackId: 'track-1',
              }),
            }],
          },
        }],
      });
    });
    server = await startServer(fetchImpl);

    const response = await request(server, {
      path: '/dj-set',
      body: {
        prompt: 'calm evening',
        tracks: [{ id: 'track-1', title: 'Quiet Song', artist: 'A Singer' }],
      },
    });

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(String(fetchImpl.mock.calls[2][0])).toContain('models/gemini-3.7-flash:generateContent');
  });

  it('rejects invalid recommendation input before calling Gemini', async () => {
    const fetchImpl = jest.fn(async () => makeResponse({ users: [{ localId: 'user' }] }));
    server = await startServer(fetchImpl);

    const response = await request(server, {
      body: { prompt: '', tracks: [{ id: 'track-1', title: 'Song', artist: 'Artist' }] },
    });

    expect(response.status).toBe(400);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('returns one selected track from the app catalog', async () => {
    let generationBody;
    const fetchImpl = jest.fn(async (url, options) => {
      if (String(url).includes('identitytoolkit.googleapis.com')) {
        return makeResponse({ users: [{ localId: 'firebase-user' }] });
      }
      generationBody = JSON.parse(options.body);
      return makeResponse({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                title: 'Sunset Drive',
                intro: 'Let’s ease into golden hour.',
                trackId: 'track-2',
              }),
            }],
          },
        }],
      });
    });
    server = await startServer(fetchImpl);

    const response = await request(server, {
      path: '/dj-set',
      body: {
        prompt: 'sunset drive, mellow, golden hour',
        tracks: [
          { id: 'track-1', title: 'First Song', artist: 'Artist One', categories: ['OPM', 'R&B', 'Sad'] },
          { id: 'track-2', title: 'Second Song', artist: 'Artist Two' },
        ],
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      title: 'Sunset Drive',
      intro: 'Let’s ease into golden hour.',
      trackId: 'track-2',
    });
    expect(String(fetchImpl.mock.calls[1][0])).toContain('models/gemini-3.8-flash:generateContent');
    expect(generationBody.generationConfig).toEqual(expect.objectContaining({
      maxOutputTokens: 64,
    }));
  });

  it('selects the highest-ranked exact category match without calling Gemini', async () => {
    const fetchImpl = jest.fn(async () =>
      makeResponse({ users: [{ localId: 'firebase-user' }] })
    );
    server = await startServer(fetchImpl);

    const response = await request(server, {
      path: '/dj-set',
      body: {
        prompt: 'sad RNB OPM',
        tracks: [
          { id: 'best-match', title: 'Track One', artist: 'Artist', categories: ['Sad', 'R&B', 'OPM'] },
          { id: 'opm-match', title: 'Track Two', artist: 'Artist', categories: ['OPM', 'Pop'] },
          { id: 'unmatched', title: 'Track Three', artist: 'Artist', categories: ['Rap'] },
        ],
      },
    });

    expect(response.status).toBe(200);
    expect(response.body.trackId).toBe('best-match');
    expect(response.body.intro).toBe('Matched track tags: Sad, R&B, OPM.');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('accepts a no-match response for descriptive moods without substituting a track', async () => {
    const fetchImpl = jest.fn(async (url) => {
      if (String(url).includes('identitytoolkit.googleapis.com')) {
        return makeResponse({ users: [{ localId: 'firebase-user' }] });
      }
      return makeResponse({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                trackId: null,
                intro: 'No tracks match those tags.',
              }),
            }],
          },
        }],
      });
    });
    server = await startServer(fetchImpl);

    const response = await request(server, {
      path: '/dj-set',
      body: {
        prompt: 'mysterious late-night mood',
        tracks: [{ id: 'track-1', title: 'Bright Song', artist: 'Artist', categories: ['Happy', 'Pop'] }],
      },
    });

    expect(response.status).toBe(404);
    expect(response.body.error).toMatch(/No tracks in the available catalog match/i);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('returns no DJ track when no catalog entry has the requested category', async () => {
    const fetchImpl = jest.fn(async () =>
      makeResponse({ users: [{ localId: 'firebase-user' }] })
    );
    server = await startServer(fetchImpl);

    const response = await request(server, {
      path: '/dj-set',
      body: {
        prompt: 'happy music',
        tracks: [
          { id: 'sad-track', title: 'Sad Song', artist: 'Artist', categories: ['Sad'] },
          { id: 'pop-track', title: 'Pop Song', artist: 'Artist', categories: ['Pop'] },
        ],
      },
    });

    expect(response.status).toBe(404);
    expect(response.body.error).toContain('No tracks are tagged with Happy');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('requires every requested category for mood recommendations without Gemini', async () => {
    const fetchImpl = jest.fn(async () =>
      makeResponse({ users: [{ localId: 'firebase-user' }] })
    );
    server = await startServer(fetchImpl);

    const response = await request(server, {
      body: {
        prompt: 'sad OPM songs',
        tracks: [
          { id: 'best-match', title: 'Track One', artist: 'Artist', categories: ['Sad', 'OPM'] },
          { id: 'sad-match', title: 'Track Two', artist: 'Artist', categories: ['Sad'] },
          { id: 'unmatched', title: 'Track Three', artist: 'Artist', categories: ['Rap'] },
        ],
      },
    });

    expect(response.status).toBe(200);
    expect(response.body.recommendations).toEqual([
      { trackId: 'best-match', reason: 'Matched categories: Sad, OPM.' },
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('returns an empty recommendation list when no category tags match', async () => {
    const fetchImpl = jest.fn(async () =>
      makeResponse({ users: [{ localId: 'firebase-user' }] })
    );
    server = await startServer(fetchImpl);

    const response = await request(server, {
      body: {
        prompt: 'happy music',
        tracks: [{ id: 'sad-track', title: 'Sad Song', artist: 'Artist', categories: ['Sad'] }],
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ recommendations: [] });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('explains Gemini API access errors without returning upstream details', async () => {
    const fetchImpl = jest.fn(async (url) => {
      if (String(url).includes('identitytoolkit.googleapis.com')) {
        return makeResponse({ users: [{ localId: 'firebase-user' }] });
      }
      return makeResponse({
        error: {
          message: 'Sensitive upstream details must not be forwarded.',
        },
      }, 403);
    });
    server = await startServer(fetchImpl);

    const response = await request(server, {
      path: '/dj-set',
      body: {
        prompt: 'calm evening',
        tracks: [{ id: 'track-1', title: 'Quiet Song', artist: 'A Singer' }],
      },
    });

    expect(response.status).toBe(502);
    expect(response.body.error).toMatch(/Gemini denied access \(403\)/);
    expect(response.body.error).toMatch(/enable the Gemini API/i);
    expect(response.body.error).not.toContain('Sensitive upstream details');
    expect(response.body.error).not.toContain(TEST_ENV.GEMINI_API_KEY);
  });

  it('tries another available model when one model denies access', async () => {
    let generationAttempts = 0;
    const fetchImpl = jest.fn(async (url) => {
      if (String(url).includes('identitytoolkit.googleapis.com')) {
        return makeResponse({ users: [{ localId: 'firebase-user' }] });
      }
      generationAttempts += 1;
      if (generationAttempts === 1) {
        return makeResponse({ error: { message: 'Model access denied.' } }, 403);
      }
      return makeResponse({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                title: 'Quiet Evening',
                intro: 'A gentle set.',
                trackId: 'track-1',
              }),
            }],
          },
        }],
      });
    });
    server = await startServer(fetchImpl);

    const response = await request(server, {
      path: '/dj-set',
      body: {
        prompt: 'calm evening',
        tracks: [{ id: 'track-1', title: 'Quiet Song', artist: 'A Singer' }],
      },
    });

    expect(response.status).toBe(200);
    expect(response.body.trackId).toBe('track-1');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(String(fetchImpl.mock.calls[1][0])).toContain('models/gemini-3.8-flash:generateContent');
    expect(String(fetchImpl.mock.calls[2][0])).toContain('models/gemini-3.7-flash:generateContent');
  });

  it('distinguishes an API request error from an explicitly rejected API key', async () => {
    const fetchImpl = jest.fn(async (url) => {
      if (String(url).includes('identitytoolkit.googleapis.com')) {
        return makeResponse({ users: [{ localId: 'firebase-user' }] });
      }
      return makeResponse({ error: { message: 'Invalid request details.' } }, 400);
    });
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    server = await startServer(fetchImpl, TEST_ENV, {
      modelListResponse: makeResponse({ error: { message: 'Invalid request details.' } }, 400),
    });

    const response = await request(server, {
      path: '/dj-set',
      body: {
        prompt: 'calm evening',
        tracks: [{ id: 'track-1', title: 'Quiet Song', artist: 'A Singer' }],
      },
    });

    expect(response.status).toBe(502);
    expect(response.body.error).toMatch(/Gemini rejected the request \(400\)/);
    expect(response.body.error).not.toContain('Invalid request details.');
    expect(warning).toHaveBeenCalledWith(
      'Gemini model discovery request failed with status:',
      400
    );
    warning.mockRestore();
  });

  it('uses a model supported by the API key when the configured model is unavailable', async () => {
    const fetchImpl = jest.fn(async (url) => {
      if (String(url).includes('identitytoolkit.googleapis.com')) {
        return makeResponse({ users: [{ localId: 'firebase-user' }] });
      }
      return makeResponse({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                title: 'Quiet Evening',
                intro: 'A gentle set.',
                trackId: 'track-1',
              }),
            }],
          },
        }],
      });
    });
    server = await startServer(fetchImpl, {
      ...TEST_ENV,
      GEMINI_MODEL: 'invalid-test-model',
    });

    const response = await request(server, {
      path: '/dj-set',
      body: {
        prompt: 'calm evening',
        tracks: [{ id: 'track-1', title: 'Quiet Song', artist: 'A Singer' }],
      },
    });

    expect(response.status).toBe(200);
    expect(String(fetchImpl.mock.calls[1][0])).toContain('models/gemini-3.8-flash:generateContent');
  });

  it('ignores a configured model that the API key does not list', async () => {
    const fetchImpl = jest.fn(async (url) => {
      if (String(url).includes('identitytoolkit.googleapis.com')) {
        return makeResponse({ users: [{ localId: 'firebase-user' }] });
      }
      return makeResponse({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                title: 'Quiet Evening',
                intro: 'A gentle set.',
                trackId: 'track-1',
              }),
            }],
          },
        }],
      });
    });
    server = await startServer(fetchImpl, {
      ...TEST_ENV,
      GEMINI_MODEL: 'retired-model',
    });

    const response = await request(server, {
      path: '/dj-set',
      body: {
        prompt: 'calm evening',
        tracks: [{ id: 'track-1', title: 'Quiet Song', artist: 'A Singer' }],
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      title: 'Quiet Evening',
      intro: 'A gentle set.',
      trackId: 'track-1',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(String(fetchImpl.mock.calls[1][0])).toContain('models/gemini-3.8-flash:generateContent');
  });

  it('does not retry or fall back when Gemini is overloaded', async () => {
    const fetchImpl = jest.fn(async (url) => {
      if (String(url).includes('identitytoolkit.googleapis.com')) {
        return makeResponse({ users: [{ localId: 'firebase-user' }] });
      }
      return makeResponse({ error: { message: 'Model is overloaded.' } }, 503);
    });
    server = await startServer(fetchImpl);

    const response = await request(server, {
      path: '/dj-set',
      body: {
        prompt: 'calm evening',
        tracks: [{ id: 'track-1', title: 'Quiet Song', artist: 'A Singer' }],
      },
    });

    expect(response.status).toBe(502);
    expect(response.body.error).toMatch(/temporarily overloaded/i);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('tries another model when one model returns 429', async () => {
    let generationAttempts = 0;
    const fetchImpl = jest.fn(async (url) => {
      if (String(url).includes('identitytoolkit.googleapis.com')) {
        return makeResponse({ users: [{ localId: 'firebase-user' }] });
      }
      generationAttempts += 1;
      if (generationAttempts === 1) {
        return makeResponse({ error: { message: 'Model quota reached.' } }, 429);
      }
      return makeResponse({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                title: 'Quiet Evening',
                intro: 'A gentle set.',
                trackId: 'track-1',
              }),
            }],
          },
        }],
      });
    });
    server = await startServer(fetchImpl);

    const response = await request(server, {
      path: '/dj-set',
      body: {
        prompt: 'calm evening',
        tracks: [{ id: 'track-1', title: 'Quiet Song', artist: 'A Singer' }],
      },
    });

    expect(response.status).toBe(200);
    expect(response.body.trackId).toBe('track-1');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('returns quota status and Retry-After when all listed models are limited', async () => {
    const fetchImpl = jest.fn(async (url) => {
      if (String(url).includes('identitytoolkit.googleapis.com')) {
        return makeResponse({ users: [{ localId: 'firebase-user' }] });
      }
      return makeResponse(
        { error: { message: 'Quota reached.' } },
        429,
        { 'retry-after': '45' }
      );
    });
    server = await startServer(fetchImpl);

    const response = await request(server, {
      path: '/dj-set',
      body: {
        prompt: 'calm evening',
        tracks: [{ id: 'track-1', title: 'Quiet Song', artist: 'A Singer' }],
      },
    });

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('45');
    expect(response.body.error).toMatch(/quota is exhausted/i);
    expect(response.body.error).toMatch(/AI Studio rate limits/i);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('explains overload without trying additional models', async () => {
    const fetchImpl = jest.fn(async (url) => {
      if (String(url).includes('identitytoolkit.googleapis.com')) {
        return makeResponse({ users: [{ localId: 'firebase-user' }] });
      }
      return makeResponse({ error: { message: 'Service overloaded.' } }, 503);
    });
    server = await startServer(fetchImpl);

    const response = await request(server, {
      path: '/dj-set',
      body: {
        prompt: 'calm evening',
        tracks: [{ id: 'track-1', title: 'Quiet Song', artist: 'A Singer' }],
      },
    });

    expect(response.status).toBe(502);
    expect(response.body.error).toMatch(/temporarily overloaded/i);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not abort a Gemini request before the configured timeout', async () => {
    let geminiSignal;
    const fetchImpl = jest.fn(async (url, options) => {
      if (String(url).includes('identitytoolkit.googleapis.com')) {
        return makeResponse({ users: [{ localId: 'firebase-user' }] });
      }
      geminiSignal = options.signal;
      return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(makeResponse({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  title: 'Quiet Evening',
                  intro: 'A gentle set.',
                  trackId: 'track-1',
                }),
              }],
            },
          }],
        })), 30);
        options.signal.addEventListener('abort', () => {
          clearTimeout(timer);
          const error = new Error('aborted');
          error.name = 'AbortError';
          resolve(Promise.reject(error));
        }, { once: true });
      });
    });
    server = await startServer(fetchImpl, TEST_ENV, { timeoutMs: 100 });

    const response = await request(server, {
      path: '/dj-set',
      body: {
        prompt: 'calm evening',
        tracks: [{ id: 'track-1', title: 'Quiet Song', artist: 'A Singer' }],
      },
    });

    expect(response.status).toBe(200);
    expect(geminiSignal.aborted).toBe(false);
  });

  it('tries another available Flash model when generation times out', async () => {
    const fetchImpl = jest.fn(async (url, options) => {
      if (String(url).includes('identitytoolkit.googleapis.com')) {
        return makeResponse({ users: [{ localId: 'firebase-user' }] });
      }
      if (String(url).includes('models/gemini-3.8-flash:')) {
        return new Promise((resolve, reject) => {
          options.signal.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          }, { once: true });
        });
      }
      return makeResponse({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                title: 'Quiet Evening',
                intro: 'A gentle set.',
                trackId: 'track-1',
              }),
            }],
          },
        }],
      });
    });
    server = await startServer(fetchImpl, TEST_ENV, { modelTimeoutMs: 5 });

    const response = await request(server, {
      path: '/dj-set',
      body: {
        prompt: 'calm evening',
        tracks: [{ id: 'track-1', title: 'Quiet Song', artist: 'A Singer' }],
      },
    });

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(String(fetchImpl.mock.calls[2][0])).toContain('models/gemini-3.7-flash:generateContent');
  });

  it('returns a clear timeout response when Gemini exceeds its request deadline', async () => {
    const fetchImpl = jest.fn(async (url, options) => {
      if (String(url).includes('identitytoolkit.googleapis.com')) {
        return makeResponse({ users: [{ localId: 'firebase-user' }] });
      }
      return new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        }, { once: true });
      });
    });
    server = await startServer(fetchImpl, TEST_ENV, { timeoutMs: 5 });

    const response = await request(server, {
      path: '/dj-set',
      body: {
        prompt: 'calm evening',
        tracks: [{ id: 'track-1', title: 'Quiet Song', artist: 'A Singer' }],
      },
    });

    expect(response.status).toBe(504);
    expect(response.body.error).toMatch(/response generation with gemini-3.8-flash timed out/i);
  });
});
