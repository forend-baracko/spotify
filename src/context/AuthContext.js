import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../services/firebaseConfig';
import {
  registerWithEmail,
  loginWithEmail,
  loginWithGoogle,
  logoutUser,
  getUserProfile,
  saveUserUsername,
} from '../services/authService';

const ONBOARDING_KEY = '@spotibai_has_seen_onboarding';
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true); // Default to true so returning users don't see onboarding
  const [authError, setAuthError] = useState(null);
  const profileLoadId = useRef(0);

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      setHasSeenOnboarding(true);
    } catch (e) {
      console.warn('Error persisting onboarding state:', e);
    }
  };

  const syncAuthenticatedUser = useCallback(async (authUser) => {
    const loadId = ++profileLoadId.current;

    if (!authUser) {
      setUser(null);
      setUserProfile(null);
      setIsProfileLoading(false);
      return null;
    }

    // Since user is authenticated, ensure onboarding is marked as seen
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
  }, []);

  useEffect(() => {
    // 1. Check whether onboarding has already been completed or skipped
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((val) => {
        if (val === 'true') {
          setHasSeenOnboarding(true);
        } else if (val === 'false') {
          setHasSeenOnboarding(false);
        }
      })
      .catch(() => {});

    if (!isFirebaseConfigured() || !auth) {
      setIsLoading(false);
      return;
    }

    // 2. Listen to Firebase Auth state - restores session across app restarts
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          await syncAuthenticatedUser(currentUser);
        } else {
          setUser(null);
          setUserProfile(null);
          setIsProfileLoading(false);
        }
      } catch (err) {
        console.warn('Auth state change error:', err);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      profileLoadId.current += 1;
      unsubscribe();
    };
  }, [syncAuthenticatedUser]);

  const login = async (email, password) => {
    setAuthError(null);
    try {
      const loggedInUser = await loginWithEmail(email, password);
      await syncAuthenticatedUser(loggedInUser);
      return loggedInUser;
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const register = async (email, password, displayName) => {
    setAuthError(null);
    try {
      const newUser = await registerWithEmail(email, password, displayName);
      await syncAuthenticatedUser(newUser);
      return newUser;
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const loginGoogle = async () => {
    setAuthError(null);
    try {
      const loggedInUser = await loginWithGoogle();
      await syncAuthenticatedUser(loggedInUser);
      return loggedInUser;
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const saveUsername = async (username) => {
    setAuthError(null);
    if (!user) {
      throw new Error('You must be signed in to set a username.');
    }
    const trimmed = (username || '').trim();
    if (!trimmed) {
      throw new Error('Please enter a username.');
    }

    // Immediately update local state so the user is never stuck on a loading screen
    setUserProfile((prev) => ({
      ...(prev || {}),
      uid: user.uid,
      email: user.email,
      username: trimmed,
      displayName: trimmed,
    }));

    try {
      const savedData = await saveUserUsername(user.uid, trimmed, {
        email: user.email || '',
        photoURL: user.photoURL || null,
      });

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
      console.warn('Background saveUserUsername error:', error);
      return { username: trimmed, displayName: trimmed };
    }
  };

  const logout = async () => {
    setAuthError(null);
    try {
      await logoutUser();
      setUser(null);
      setUserProfile(null);
      setIsProfileLoading(false);
      // Ensure that once logged out, the user is never bounced back to Onboarding, only Login
      setHasSeenOnboarding(true);
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true').catch(() => {});
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const clearError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        isLoading,
        isProfileLoading,
        hasSeenOnboarding,
        completeOnboarding,
        authError,
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