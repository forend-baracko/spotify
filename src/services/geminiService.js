import { AUDIO_CONFIG } from '../constants/config';

export const getGeminiStatus = async () => {
  const baseUrl = AUDIO_CONFIG.apiBaseUrl;
  if (!baseUrl) {
    return {
      configured: false,
      message: 'Set AUDIO_API_BASE_URL in the app .env to connect the AI DJ server.',
    };
  }

  let response;
  try {
    response = await fetch(`${baseUrl}/api/gemini/status`);
  } catch {
    return {
      configured: false,
      message: 'AI DJ server is offline. Start it with npm run server and try again.',
    };
  }

  let body;
  try {
    body = await response.json();
  } catch {
    return {
      configured: false,
      message: 'AI DJ server returned an invalid status. Restart the backend and try again.',
    };
  }
  if (!response.ok) {
    return {
      configured: false,
      message: body?.error || 'AI DJ server is unavailable. Try again in a moment.',
    };
  }
  if (!body?.configured) {
    return {
      configured: false,
      message: 'Add GEMINI_API_KEY to the backend .env, then restart npm run server.',
    };
  }
  return { configured: true, message: '' };
};

export const createGeminiDjSet = async (user, prompt, tracks) => {
  const baseUrl = AUDIO_CONFIG.apiBaseUrl;
  if (!baseUrl) {
    throw new Error('Set AUDIO_API_BASE_URL to the reachable backend address first.');
  }
  if (typeof user?.getIdToken !== 'function') {
    throw new Error('Sign in to use the AI DJ.');
  }

  const idToken = await user.getIdToken();
  let response;
  try {
    response = await fetch(`${baseUrl}/api/gemini/dj-set`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${idToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        tracks: tracks.slice(0, 50).map(({ id, title, artist, categories }) => ({
          id,
          title,
          artist,
          categories,
        })),
      }),
    });
  } catch {
    throw new Error('AI DJ server is offline. Start it with npm run server and try again.');
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error('The Gemini DJ server returned an invalid response.');
  }
  if (!response.ok) {
    throw new Error(body?.error || `Gemini DJ request failed (${response.status}).`);
  }
  if (
    typeof body?.title !== 'string' ||
    typeof body?.intro !== 'string' ||
    typeof body?.trackId !== 'string'
  ) {
    throw new Error('The Gemini DJ server returned an invalid track recommendation.');
  }
  return body;
};
