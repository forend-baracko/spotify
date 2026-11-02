import {
    FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID,
    AUDIOMACK_API_KEY,
    AUDIO_API_BASE_URL,
    GOOGLE_WEB_CLIENT_ID,
    GOOGLE_IOS_CLIENT_ID,
} from '@env';

/**
 * Application Configuration
 * Reads values securely from your local .env file.
 */
export const FIREBASE_CONFIG = {
    apiKey: FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY",
    authDomain: FIREBASE_AUTH_DOMAIN || "your-app.firebaseapp.com",
    projectId: FIREBASE_PROJECT_ID || "your-app-id",
    storageBucket: FIREBASE_STORAGE_BUCKET || "your-app.firebasestorage.app",
    messagingSenderId: FIREBASE_MESSAGING_SENDER_ID || "1234567890",
    appId: FIREBASE_APP_ID || "1:1234567890:web:abcdef123456"
};

/**
 * Audiomack API Configuration
 * When useMockData is true (or when AUDIOMACK_API_KEY is empty),
 * the app uses high-fidelity offline mock music data.
 */
export const AUDIOMACK_CONFIG = {
    baseUrl: 'https://api.audiomack.com/v1',
    apiKey: AUDIOMACK_API_KEY || '',
    useMockData: !AUDIOMACK_API_KEY || AUDIOMACK_API_KEY === 'undefined',
};

export const AUDIO_CONFIG = {
    apiBaseUrl: (AUDIO_API_BASE_URL || '').replace(/\/+$/, ''),
};

/**
 * Google Sign-In Configuration
 */
const rawGoogleClientId = GOOGLE_WEB_CLIENT_ID || '1059014495317-3c5mamk6f5i6rt7dbj1ffadi61oo18nh.apps.googleusercontent.com';
export const GOOGLE_CONFIG = {
    webClientId: rawGoogleClientId ? rawGoogleClientId.replace(/^["']|["']$/g, '').trim() : '',
    iosClientId: GOOGLE_IOS_CLIENT_ID
        ? GOOGLE_IOS_CLIENT_ID.replace(/^["']|["']$/g, '').trim()
        : '',
};