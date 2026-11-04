import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    GoogleAuthProvider,
    signInWithCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

    // Initialize user profile document in Firestore
    if (db && user?.uid) {
        try {
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: email.trim(),
                displayName: profileName,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            }, { merge: true });
        } catch (error) {
            console.warn('Firestore initial user doc creation error:', error);
        }
    }

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

        // Ensure user document exists in Firestore asynchronously (non-blocking)
        if (db && user?.uid) {
            setDoc(
                doc(db, 'users', user.uid),
                {
                    uid: user.uid,
                    email: user.email || '',
                    photoURL: user.photoURL || null,
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            ).catch((fsErr) => {
                console.warn('Firestore google user doc sync warning:', fsErr);
            });
        }

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

const LOCAL_USER_PREFIX = '@spotibai_user_profile_';

/**
 * Fetch extended user profile from Cloud Firestore, Firebase Auth, and AsyncStorage.
 * Ensures the username is permanently saved and retrieved even after sign out.
 */
export const getUserProfile = async (uid, authUser) => {
    if (!uid) return null;

    // 1. First, read local cache for instant zero-latency retrieval
    let localCached = null;
    try {
        const raw = await AsyncStorage.getItem(`${LOCAL_USER_PREFIX}${uid}`);
        if (raw) localCached = JSON.parse(raw);
    } catch (e) {
        // ignore storage read error
    }

    // 2. Fetch live profile data from Cloud Firestore with a short timeout
    // so slow networks or offline states never hang the sign-in transition
    let firestoreData = null;
    if (db) {
        try {
            const getDocPromise = getDoc(doc(db, 'users', uid));
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Firestore timeout')), 2500)
            );
            const userSnap = await Promise.race([getDocPromise, timeoutPromise]);
            if (userSnap && userSnap.exists && userSnap.exists()) {
                firestoreData = userSnap.data();
            }
        } catch (fsErr) {
            console.warn('Firestore getDoc notice (proceeding with cached/auth profile):', fsErr?.message || fsErr);
        }
    }

    // 3. Fallback to Firebase Auth displayName
    const firebaseDisplayName = authUser?.displayName || auth?.currentUser?.displayName || null;

    // 4. Resolve username with priority: Firestore > local cache > Firebase Auth
    const resolvedUsername =
        (firestoreData?.username && firestoreData.username.trim().length > 0
            ? firestoreData.username.trim()
            : null) ||
        (localCached?.username && localCached.username.trim().length > 0
            ? localCached.username.trim()
            : null) ||
        (firebaseDisplayName && firebaseDisplayName.trim().length > 0
            ? firebaseDisplayName.trim()
            : null) ||
        (firestoreData?.displayName && firestoreData.displayName.trim().length > 0
            ? firestoreData.displayName.trim()
            : null) ||
        null;

    const email =
        authUser?.email ||
        auth?.currentUser?.email ||
        firestoreData?.email ||
        localCached?.email ||
        null;

    const displayName =
        resolvedUsername ||
        firestoreData?.displayName ||
        localCached?.displayName ||
        firebaseDisplayName ||
        (email ? email.split('@')[0] : 'User');

    const photoURL =
        authUser?.photoURL ||
        auth?.currentUser?.photoURL ||
        firestoreData?.photoURL ||
        localCached?.photoURL ||
        null;

    const profile = {
        uid,
        email,
        photoURL,
        favoriteTracks: firestoreData?.favoriteTracks || localCached?.favoriteTracks || [],
        ...(localCached || {}),
        ...(firestoreData || {}),
        // Enforce resolved username & display name
        username: resolvedUsername,
        displayName,
    };

    // Keep AsyncStorage updated
    try {
        await AsyncStorage.setItem(`${LOCAL_USER_PREFIX}${uid}`, JSON.stringify(profile));
    } catch (e) {
        // ignore cache write warning
    }

    // If Firestore was missing this user's username but we resolved one from cache/auth,
    // automatically sync it back to Firestore so it is permanently preserved in Firebase
    if (db && resolvedUsername && (!firestoreData || !firestoreData.username)) {
        setDoc(
            doc(db, 'users', uid),
            {
                uid,
                username: resolvedUsername,
                displayName: resolvedUsername,
                email: email || '',
                photoURL: photoURL || null,
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        ).catch((err) => {
            console.warn('Auto-sync username to Firestore error:', err);
        });
    }

    // Also sync Firebase Auth currentUser displayName if not set
    if (auth?.currentUser && resolvedUsername && auth.currentUser.displayName !== resolvedUsername) {
        updateProfile(auth.currentUser, { displayName: resolvedUsername }).catch(() => {});
    }

    return profile;
};

/**
 * Save user username and profile data to Firebase (Firestore + Auth) and AsyncStorage
 */
export const saveUserUsername = async (
    uid,
    username,
    additionalData = {},
    { requireFirestore = false } = {}
) => {
    if (!uid) {
        throw new Error('User ID is required to save username.');
    }
    const trimmed = (username || '').trim();
    if (!trimmed) {
        throw new Error('Please enter a username.');
    }

    const email = auth?.currentUser?.email || additionalData.email || '';
    const photoURL = auth?.currentUser?.photoURL || additionalData.photoURL || null;

    // 1. Save directly to Cloud Firestore in Firebase (Permanent remote persistence)
    if (!db && requireFirestore) {
        throw new Error('Firestore is unavailable. Please try again when connected.');
    }
    if (db) {
        try {
            await setDoc(
                doc(db, 'users', uid),
                {
                    uid,
                    username: trimmed,
                    displayName: trimmed,
                    email,
                    photoURL,
                    updatedAt: serverTimestamp(),
                    ...additionalData,
                },
                { merge: true }
            );
        } catch (fsErr) {
            console.warn('Firestore setDoc error in saveUserUsername:', fsErr);
            if (requireFirestore) {
                throw new Error('Could not save your username to your account. Please try again.');
            }
        }
    }

    // 2. Save to Firebase Auth profile
    if (auth?.currentUser) {
        try {
            await updateProfile(auth.currentUser, { displayName: trimmed });
            if (auth.currentUser.reload) {
                await auth.currentUser.reload().catch(() => {});
            }
        } catch (err) {
            console.warn('Firebase Auth updateProfile warning:', err);
        }
    }

    const profileData = {
        uid,
        username: trimmed,
        displayName: trimmed,
        email,
        photoURL,
        updatedAt: new Date().toISOString(),
        favoriteTracks: [],
        ...additionalData,
    };

    // 3. Save locally to AsyncStorage for fast instant retrieval
    try {
        await AsyncStorage.setItem(`${LOCAL_USER_PREFIX}${uid}`, JSON.stringify(profileData));
    } catch (e) {
        console.warn('AsyncStorage setItem warning:', e);
    }

    return profileData;
};
