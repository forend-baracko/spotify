import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import auth, { isFirebaseConfigured } from '../services/firebaseConfig';
import {
  registerWithEmail,
  loginWithEmail,
  loginWithGoogle,
  logoutUser,
  getUserProfile,
} from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const profileLoadId = useRef(0);

  const syncAuthenticatedUser = useCallback((authUser) => {
    const loadId = ++profileLoadId.current;
    setUser(authUser);
    setUserProfile(
      authUser
        ? {
            uid: authUser.uid,
            email: authUser.email,
            displayName: authUser.displayName || authUser.email?.split('@')[0] || 'User',
            photoURL: authUser.photoURL || null,
            favoriteTracks: [],
          }
        : null
    );

    if (authUser) {
      getUserProfile(authUser.uid, authUser)
        .then((profile) => {
          if (profileLoadId.current === loadId) setUserProfile(profile);
        })
        .catch((error) => {
          console.warn('Error loading user profile:', error);
        });
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured() || !auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      syncAuthenticatedUser(currentUser);
      setIsLoading(false);
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
      syncAuthenticatedUser(loggedInUser);
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
      syncAuthenticatedUser(newUser);
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
      syncAuthenticatedUser(loggedInUser);
      return loggedInUser;
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const logout = async () => {
    setAuthError(null);
    try {
      await logoutUser();
      syncAuthenticatedUser(null);
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
        authError,
        login,
        register,
        loginGoogle,
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