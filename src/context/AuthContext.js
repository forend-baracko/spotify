import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../services/firebaseConfig';
import audioPlayer from '../services/audioPlayer';
import {
  registerWithEmail,
  loginWithEmail,
  loginWithGoogle,
  logoutUser,
  getUserProfile,
  saveUserUsername,
} from '../services/authService';

const ONBOARDING_KEY = '@spotibai_has_seen_onboarding';
const ONBOARDING_READ_TIMEOUT_MS = 5000;
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboardingLoading, setIsOnboardingLoading] = useState(Platform.OS === 'android');
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true); // Default to true so returning users don't see onboarding
  const [authError, setAuthError] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);
  const authBusyRef = useRef(false);
  const authGuardVersion = useRef(0);
  const committedRegistrationVersion = useRef(null);
  const logoutInFlight = useRef(false);

  const onboardingRevision = useRef(0);
  const signOutRevision = useRef(0);
  const profileLoadId = useRef(0);
  const previousUserUidRef = useRef(null);
  const activeUserUid = useRef(null);
  const accountSessionRevision = useRef(0);

  const noteAndroidAccount = useCallback((uid) => {
    if (Platform.OS === 'android' && activeUserUid.current !== uid) {
      activeUserUid.current = uid;
      accountSessionRevision.current += 1;
    }
  }, []);

  const releaseCommittedRegistration = useCallback(() => {
    if (authBusyRef.current && committedRegistrationVersion.current === authGuardVersion.current) {
      authGuardVersion.current += 1;
      committedRegistrationVersion.current = null;
      authBusyRef.current = false;
      setAuthBusy(false);
    }
  }, []);


  const completeOnboarding = async () => {
    if (Platform.OS === 'android') {
      onboardingRevision.current += 1;
      setHasSeenOnboarding(true);
    }
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      setHasSeenOnboarding(true);
    } catch (e) {
      console.warn('Error persisting onboarding state:', e);
    }
  };

  const syncAuthenticatedUser = useCallback(async (authUser) => {
    noteAndroidAccount(authUser?.uid || null);
    const loadId = ++profileLoadId.current;

    if (!authUser) {
      setUser(null);
      setUserProfile(null);
      setIsProfileLoading(false);
      return null;
    }

    // Since user is authenticated, ensure onboarding is marked as seen
    if (Platform.OS === 'android') onboardingRevision.current += 1;
    setHasSeenOnboarding(true);
    AsyncStorage.setItem(ONBOARDING_KEY, 'true').catch(() => {});

    setIsProfileLoading(true);
    setUser(authUser);

    const fallback = {
      uid: authUser.uid,
      email: authUser.email,
      username: authUser.displayName || null,
      displayName: authUser.displayName || (authUser.email ? authUser.email.split('@')[0] : 'User'),
      photoURL: authUser.photoURL || null,
      favoriteTracks: [],
    };

    try {
      const profile = await getUserProfile(authUser.uid, authUser);
      if (profileLoadId.current === loadId) {
        setUserProfile(profile || fallback);
        setIsProfileLoading(false);
        return profile || fallback;
      }
    } catch (error) {
      console.warn('Error loading user profile:', error);
      if (profileLoadId.current === loadId) {
        setUserProfile(fallback);
        setIsProfileLoading(false);
      }
    }
    return fallback;
  }, [noteAndroidAccount]);

  useEffect(() => {
    // 1. Check whether onboarding has already been completed or skipped
    let active = true;
    let authEventRevision = 0;
    let readSettled = false;
    const readTimeout = Platform.OS === 'android' ? setTimeout(() => {
      if (active && !readSettled) {
        readSettled = true;
        setIsOnboardingLoading(false);
      }
    }, ONBOARDING_READ_TIMEOUT_MS) : null;
    const revisionAtRead = onboardingRevision.current;
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((val) => {
        if (!active || readSettled) return;
        if (Platform.OS === 'android') {
          if (onboardingRevision.current === revisionAtRead) {
            setHasSeenOnboarding(val !== null && val !== 'false');
          }
          return;
        }
        if (val === 'true') {
          setHasSeenOnboarding(true);
        } else if (val === 'false') {
          setHasSeenOnboarding(false);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active && Platform.OS === 'android' && !readSettled) {
          readSettled = true;
          clearTimeout(readTimeout);
          setIsOnboardingLoading(false);
        }
      });

    if (!isFirebaseConfigured() || !auth) {
      setIsLoading(false);
      return () => { active = false; clearTimeout(readTimeout); };
    }

    // 2. Listen to Firebase Auth state - restores session across app restarts
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!active) return;
      const eventRevision = ++authEventRevision;
      try {
        if (currentUser) {
          if (previousUserUidRef.current && previousUserUidRef.current !== currentUser.uid) {
            if (Platform.OS === 'android') signOutRevision.current += 1;
            if (typeof audioPlayer?.reset === 'function') {
              audioPlayer.reset();
            }
          }
          previousUserUidRef.current = currentUser.uid;
          await syncAuthenticatedUser(currentUser);
        } else {
          noteAndroidAccount(null);
          if (Platform.OS === 'android') profileLoadId.current += 1;
          if (previousUserUidRef.current) {
            if (Platform.OS === 'android') {
              signOutRevision.current += 1;
              if (!logoutInFlight.current) releaseCommittedRegistration();
            }
            if (typeof audioPlayer?.reset === 'function') {
              audioPlayer.reset();
            }
          }
          previousUserUidRef.current = null;
          setUser(null);
          setUserProfile(null);
          setIsProfileLoading(false);
        }
      } catch (err) {
        console.warn('Auth state change error:', err);
      } finally {
        if (active && (Platform.OS !== 'android' || eventRevision === authEventRevision)) setIsLoading(false);
      }
    }, Platform.OS === 'android' ? (error) => {
      if (!active) return;
      authEventRevision += 1;
      console.warn('Auth initialization error:', error);
      setIsLoading(false);
    } : undefined);

    return () => {
      active = false;
      clearTimeout(readTimeout);
      profileLoadId.current += 1;
      unsubscribe();
    };
  }, [syncAuthenticatedUser, releaseCommittedRegistration, noteAndroidAccount]);

  const runAuthentication = async (operation) => {
    const guard = Platform.OS === 'android';
    const signOutAtStart = signOutRevision.current;
    if (guard && (authBusyRef.current || logoutInFlight.current)) {
      throw new Error('Authentication is already in progress.');
    }
    const guardVersion = guard ? ++authGuardVersion.current : null;

    if (guard) {
      authBusyRef.current = true;
      setAuthBusy(true);
    }
    setAuthError(null);
    try {
      const loggedInUser = await operation(() => {
        if (guard && authGuardVersion.current === guardVersion) {
          committedRegistrationVersion.current = guardVersion;
          if (signOutRevision.current !== signOutAtStart && !logoutInFlight.current && !auth?.currentUser) {
            releaseCommittedRegistration();
          }
        }
      }, () => !guard || (authGuardVersion.current === guardVersion && signOutRevision.current === signOutAtStart && !logoutInFlight.current));
      if (guard && signOutRevision.current !== signOutAtStart) {
        throw new Error('Authentication was cancelled because the account signed out.');
      }
      await syncAuthenticatedUser(loggedInUser);
      if (guard && signOutRevision.current !== signOutAtStart) {
        throw new Error('Authentication was cancelled because the account signed out.');
      }
      return loggedInUser;
    } catch (error) {
      if (!guard || (authGuardVersion.current === guardVersion && signOutRevision.current === signOutAtStart)) setAuthError(error.message);
      throw error;
    } finally {
      if (guard && authGuardVersion.current === guardVersion) {
        authBusyRef.current = false;
        committedRegistrationVersion.current = null;
        setAuthBusy(false);
      }
    }
  };

  const login = async (email, password) => runAuthentication(() => loginWithEmail(email, password));

  const register = async (email, password, displayName) => {
    return runAuthentication((onAuthCreated) => Platform.OS === 'android'
      ? registerWithEmail(email, password, displayName, onAuthCreated)
      : registerWithEmail(email, password, displayName));
  };

  const loginGoogle = async () => runAuthentication((unused, canComplete) => Platform.OS === 'android' ? loginWithGoogle(canComplete) : loginWithGoogle());

  const saveUsername = async (username, { requireFirestore = false } = {}) => {
    setAuthError(null);
    if (!user) {
      throw new Error('You must be signed in to set a username.');
    }
    const trimmed = (username || '').trim();
    if (!trimmed) {
      throw new Error('Please enter a username.');
    }

    const accountRevisionAtStart = accountSessionRevision.current;
    try {
      const savedData = await saveUserUsername(user.uid, trimmed, {
        email: user.email || '',
        photoURL: user.photoURL || null,
      }, { requireFirestore });

      if (Platform.OS === 'android' && accountSessionRevision.current !== accountRevisionAtStart) {
        throw new Error('The account changed while the username was being saved.');
      }
      if (Platform.OS === 'android') {
        profileLoadId.current += 1;
        setIsProfileLoading(false);
      }
      setUserProfile((prev) => ({
        ...(prev || {}),
        uid: user.uid,
        email: user.email,
        username: trimmed,
        displayName: trimmed,
        ...savedData,
      }));

      return savedData;
    } catch (error) {
      if (Platform.OS !== 'android' || accountSessionRevision.current === accountRevisionAtStart) setAuthError(error.message);
      throw error;
    }
  };

  const logout = async () => {
    if (Platform.OS === 'android' && logoutInFlight.current) {
      throw new Error('Sign-out is already in progress.');
    }
    if (Platform.OS === 'android' && authBusyRef.current && committedRegistrationVersion.current !== authGuardVersion.current) {
      throw new Error('Authentication is in progress. Please wait before signing out.');
    }
    setAuthError(null);
    if (Platform.OS === 'android') logoutInFlight.current = true;
    try {
      if (typeof audioPlayer?.reset === 'function') {
        audioPlayer.reset();
      }
      if (Platform.OS !== 'android') previousUserUidRef.current = null;
      await logoutUser();
      if (Platform.OS === 'android') {
        noteAndroidAccount(null);
        profileLoadId.current += 1;
        signOutRevision.current += 1;
        previousUserUidRef.current = null;
        releaseCommittedRegistration();

      }
      setUser(null);
      setUserProfile(null);
      setIsProfileLoading(false);
      // Ensure that once logged out, the user is never bounced back to Onboarding, only Login
      if (Platform.OS === 'android') onboardingRevision.current += 1;
      setHasSeenOnboarding(true);
      if (Platform.OS === 'android') {
        AsyncStorage.setItem(ONBOARDING_KEY, 'true').catch(() => {});
      } else {
        await AsyncStorage.setItem(ONBOARDING_KEY, 'true').catch(() => {});
      }
    } catch (error) {
      setAuthError(error.message);
      throw error;
    } finally {
      if (Platform.OS === 'android') logoutInFlight.current = false;
    }
  };

  const clearError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        isLoading: Platform.OS === 'android' ? isLoading || isOnboardingLoading : isLoading,
        isProfileLoading,
        hasSeenOnboarding,
        completeOnboarding,
        authError,
        authBusy,
        login,
        register,
        loginGoogle,
        saveUsername,
        logout,
        clearError,
        isConfigured: isFirebaseConfigured(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext };