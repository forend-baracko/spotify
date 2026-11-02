import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    GoogleAuthProvider,
    signInWithCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { auth, db, isFirebaseConfigured } from './firebaseConfig';
import { GOOGLE_CONFIG } from '../constants/config';

// The configured web client ID must match the OAuth client from Firebase.
export const configureGoogleSignIn = () => {
    if (GOOGLE_CONFIG.webClientId) {
        try {
            GoogleSignin.configure({
                webClientId: GOOGLE_CONFIG.webClientId,
                ...(GOOGLE_CONFIG.iosClientId ? { iosClientId: GOOGLE_CONFIG.iosClientId } : {}),
                offlineAccess: false,
                scopes: ['profile', 'email'],
            });
        } catch (err) {
            console.warn('GoogleSignin configure warning:', err);
        }
    }
};

// Initial setup
configureGoogleSignIn();

/**
 * Format Firebase Auth errors into clear, user-friendly messages
 */
export const getReadableAuthError = (errorCode) => {
    switch (errorCode) {
        case 'auth/email-already-in-use':
            return 'This email is already registered. Please sign in instead.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/weak-password':
            return 'Password is too weak. Please use at least 6 characters.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'Invalid email or password. Please try again.';
        case 'auth/too-many-requests':
            return 'Too many failed login attempts. Please try again later.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your internet connection.';
        case 'auth/operation-not-allowed':
            return 'Google sign-in is disabled. Enable Google as a sign-in provider in Firebase Console.';
        case 'auth/invalid-api-key':
            return 'Firebase rejected the app configuration. Check the Firebase API key in your app settings.';
        default:
            return 'An unexpected error occurred. Please try again.';
    }
};

/**
 * Register a new user with Email and Password
 * Creates Firebase Auth record + Firestore /users/{uid} document
 */
export const registerWithEmail = async (email, password, displayName) => {
    if (!email || !password) {
        throw new Error('Email and password are required.');
    }
    if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
    }

    if (!isFirebaseConfigured() || !auth) {
        throw new Error('Firebase credentials not configured. Please check your .env file.');
    }

    let user;
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        user = userCredential.user;
    } catch (error) {
        const readableMessage = getReadableAuthError(error.code);
        const enhancedError = new Error(readableMessage);
        enhancedError.code = error.code;
        throw enhancedError;
    }

    const profileName = displayName?.trim() || email.trim().split('@')[0];
    if (displayName) {
        try {
            updateProfile(user, { displayName: profileName }).catch((error) => {
                console.warn('Failed to update the Firebase Auth display name:', error);
            });
        } catch (error) {
            console.warn('Failed to update the Firebase Auth display name:', error);
        }
    }

    saveUserProfile(user.uid, {
        uid: user.uid,
        email: user.email,
        displayName: profileName,
        createdAt: serverTimestamp(),
        favoriteTracks: [],
    });

    return user;
};

/**
 * Sign in an existing user with Email and Password
 */
export const loginWithEmail = async (email, password) => {
    if (!email || !password) {
        throw new Error('Please enter both email and password.');
    }

    if (!isFirebaseConfigured() || !auth) {
        throw new Error('Firebase credentials not configured. Please check your .env file.');
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        return userCredential.user;
    } catch (error) {
        const readableMessage = getReadableAuthError(error.code);
        const enhancedError = new Error(readableMessage);
        enhancedError.code = error.code;
        throw enhancedError;
    }
};

/**
 * Sign in or Register using Google Account
 */
export const loginWithGoogle = async () => {
    if (!isFirebaseConfigured() || !auth) {
        throw new Error('Firebase credentials not configured. Please check your .env file.');
    }

    if (!GOOGLE_CONFIG.webClientId) {
        throw new Error(
            'Google Web Client ID is not configured. Please add GOOGLE_WEB_CLIENT_ID to your .env file.'
        );
    }

    try {
        configureGoogleSignIn();
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const signInResult = await GoogleSignin.signIn();
        if (signInResult.type === 'cancelled') {
            throw new Error('Google sign-in was cancelled.');
        }
        const idToken = signInResult.data?.idToken;

        if (!idToken) {
            throw new Error(
                'Google did not return an ID token. Check that GOOGLE_WEB_CLIENT_ID is the Web OAuth client ID from Firebase.'
            );
        }

        const credential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, credential);
        const user = userCredential.user;

        saveUserProfile(
            user.uid,
            {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email?.split('@')[0] || 'User',
                photoURL: user.photoURL || null,
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );

        return user;
    } catch (error) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
            throw new Error('Google sign-in was cancelled.');
        } else if (error.code === statusCodes.IN_PROGRESS) {
            throw new Error('Google sign-in is already in progress.');
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
            throw new Error('Google Play Services not available or outdated.');
        }
        if (error.code === 'DEVELOPER_ERROR' || error.code === '10') {
            throw new Error(
                'Google sign-in is misconfigured. Verify the Android package name and SHA-1 certificate fingerprints in Firebase, then download the updated google-services.json.'
            );
        }
        if (error.code === 'auth/operation-not-allowed') {
            throw new Error(getReadableAuthError(error.code));
        }
        throw new Error(error.message || 'Google sign-in failed.');
    }
};

/**
 * Sign out current user
 */
export const logoutUser = async () => {
    try {
        await GoogleSignin.signOut();
    } catch (e) {
        // Ignore if user wasn't signed in via Google
    }
    if (auth) {
        await signOut(auth);
    }
};

/**
 * Fetch extended user profile from Cloud Firestore
 */
export const getUserProfile = async (uid, authUser) => {
    if (!uid) return null;
    const fallbackProfile = {
        uid,
        email: authUser?.email || null,
        displayName: authUser?.displayName || authUser?.email?.split('@')[0] || 'User',
        photoURL: authUser?.photoURL || null,
        favoriteTracks: [],
    };
    if (!db) return fallbackProfile;

    try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { ...fallbackProfile, ...docSnap.data() };
        }
        return fallbackProfile;
    } catch (err) {
        console.warn('Failed to fetch user profile:', err);
        return fallbackProfile;
    }
};

const saveUserProfile = async (uid, profile, options) => {
    if (!db) return;
    try {
        await setDoc(doc(db, 'users', uid), profile, options);
    } catch (error) {
        console.warn('Failed to save the Firestore user profile:', error);
    }
};
