import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Platform } from 'react-native';
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockOnAuthStateChanged = jest.fn();
const mockConfigured = jest.fn();
const mockGetProfile = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: (...args) => mockGetItem(...args), setItem: (...args) => mockSetItem(...args) }));
jest.mock('firebase/auth', () => ({ onAuthStateChanged: (...args) => mockOnAuthStateChanged(...args) }));
jest.mock('../src/services/firebaseConfig', () => ({ auth: {}, isFirebaseConfigured: () => mockConfigured() }));
jest.mock('../src/services/audioPlayer', () => ({ reset: jest.fn() }));
jest.mock('../src/services/authService', () => ({
  loginWithEmail: jest.fn(), registerWithEmail: jest.fn(), loginWithGoogle: jest.fn(),
  logoutUser: jest.fn(), saveUserUsername: jest.fn(), getUserProfile: (...args) => mockGetProfile(...args),
}));
const { AuthProvider, useAuth } = require('../src/context/AuthContext');
let current;
function Probe() { current = useAuth(); return null; }
const deferred = () => { let resolve, reject; const promise = new Promise((res, rej) => { resolve = res; reject = rej; }); return { promise, resolve, reject }; };

describe('Android onboarding startup', () => {
  let renderer, originalPlatform, onAuth;
  beforeEach(() => {
    originalPlatform = Platform.OS; Platform.OS = 'android';
    jest.clearAllMocks(); current = undefined; onAuth = undefined;
    mockConfigured.mockReturnValue(true); mockSetItem.mockResolvedValue();
    mockGetProfile.mockResolvedValue({ username: 'listener' });
    mockOnAuthStateChanged.mockImplementation((auth, callback) => { onAuth = callback; return jest.fn(); });
  });
  afterEach(async () => { if (renderer) await ReactTestRenderer.act(() => renderer.unmount()); renderer = null; Platform.OS = originalPlatform; });
  async function mount() { await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<AuthProvider><Probe /></AuthProvider>); }); }
  async function emit(user) { await ReactTestRenderer.act(async () => { await onAuth(user); }); }

  it('waits for stored onboarding state before routing a fresh signed-out user', async () => {
    const stored = deferred(); mockGetItem.mockReturnValue(stored.promise);
    await mount(); await emit(null);
    expect(current.isLoading).toBe(true);
    await ReactTestRenderer.act(async () => { stored.resolve(null); await stored.promise; });
    expect(current.isLoading).toBe(false);
    expect(current.hasSeenOnboarding).toBe(false);
  });
  it('waits for auth restoration when storage resolves first', async () => {
    mockGetItem.mockResolvedValue(null); await mount();
    expect(current.isLoading).toBe(true);
    await emit(null);
    expect(current.isLoading).toBe(false); expect(current.hasSeenOnboarding).toBe(false);
  });
  it('keeps returning signed-out users who completed onboarding on login', async () => {
    mockGetItem.mockResolvedValue('true'); await mount(); await emit(null);
    expect(current.isLoading).toBe(false); expect(current.hasSeenOnboarding).toBe(true);
  });
  it('does not allow a late old flag to override a restored signed-in account', async () => {
    const stored = deferred(); mockGetItem.mockReturnValue(stored.promise); await mount();
    await emit({ uid: 'mock-user', email: 'synthetic@example.test' });
    expect(current.isLoading).toBe(true);
    await ReactTestRenderer.act(async () => { stored.resolve('false'); await stored.promise; });
    expect(current.isLoading).toBe(false); expect(current.hasSeenOnboarding).toBe(true);
    expect(current.user.uid).toBe('mock-user');
  });
  it('defaults safely to login when reading storage fails', async () => {
    mockGetItem.mockRejectedValue(new Error('storage unavailable')); await mount(); await emit(null);
    expect(current.isLoading).toBe(false); expect(current.hasSeenOnboarding).toBe(true);
  });
  it('falls back to login if reading onboarding storage stalls, ignoring a later result', async () => {
    jest.useFakeTimers();
    try {
      const stored = deferred(); mockGetItem.mockReturnValue(stored.promise); await mount(); await emit(null);
      expect(current.isLoading).toBe(true);
      await ReactTestRenderer.act(async () => { jest.advanceTimersByTime(5000); });
      expect(current.isLoading).toBe(false); expect(current.hasSeenOnboarding).toBe(true);
      await ReactTestRenderer.act(async () => { stored.resolve(null); await stored.promise; });
      expect(current.hasSeenOnboarding).toBe(true);
    } finally { jest.useRealTimers(); }
  });
  it('defaults safely to login for an unrecognized stored value', async () => {
    mockGetItem.mockResolvedValue('unknown'); await mount(); await emit(null);
    expect(current.hasSeenOnboarding).toBe(true);
  });
  it('settles startup if the auth listener reports an initialization error', async () => {
    let failAuth;
    mockOnAuthStateChanged.mockImplementation((auth, callback, onError) => { onAuth = callback; failAuth = onError; return jest.fn(); });
    mockGetItem.mockResolvedValue('true'); await mount();
    expect(typeof failAuth).toBe('function');
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try { await ReactTestRenderer.act(() => failAuth(new Error('offline'))); }
    finally { warn.mockRestore(); }
    expect(current.isLoading).toBe(false); expect(current.hasSeenOnboarding).toBe(true);
  });
  it('keeps completed onboarding after a provider restart', async () => {
    let flag = null;
    mockGetItem.mockImplementation(async () => flag);
    mockSetItem.mockImplementation(async (key, value) => { flag = value; });
    await mount(); await emit(null); expect(current.hasSeenOnboarding).toBe(false);
    await ReactTestRenderer.act(async () => { await current.completeOnboarding(); });
    await ReactTestRenderer.act(() => renderer.unmount()); renderer = null;
    await mount(); await emit(null);
    expect(current.isLoading).toBe(false); expect(current.hasSeenOnboarding).toBe(true);
  });
  it('waits for onboarding even if Firebase is not configured', async () => {
    mockConfigured.mockReturnValue(false); const stored = deferred(); mockGetItem.mockReturnValue(stored.promise);
    await mount(); expect(current.isLoading).toBe(true);
    await ReactTestRenderer.act(async () => { stored.resolve(null); await stored.promise; });
    expect(current.isLoading).toBe(false); expect(current.hasSeenOnboarding).toBe(false);
  });
  it('keeps completion in memory when persistence fails and rejects stale reads', async () => {
    const stored = deferred(); mockGetItem.mockReturnValue(stored.promise);
    mockSetItem.mockRejectedValue(new Error('storage unavailable'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await mount(); await emit(null);
      await ReactTestRenderer.act(async () => { await current.completeOnboarding(); });
      await ReactTestRenderer.act(async () => { stored.resolve('false'); await stored.promise; });
      expect(current.hasSeenOnboarding).toBe(true);
    } finally { warn.mockRestore(); }
  });
  it('does not restore an old profile after the auth listener signs out', async () => {
    const profile = deferred(); mockGetItem.mockResolvedValue('true'); mockGetProfile.mockReturnValue(profile.promise);
    await mount();
    let first;
    await ReactTestRenderer.act(() => { first = onAuth({ uid: 'mock-user', email: 'synthetic@example.test' }); });
    await emit(null);
    await ReactTestRenderer.act(async () => { profile.resolve({ username: 'listener' }); await first; });
    expect(current.user).toBeNull(); expect(current.userProfile).toBeNull(); expect(current.isProfileLoading).toBe(false);
  });
  it('does not end initialization when an older account profile finishes first', async () => {
    const firstProfile = deferred(), secondProfile = deferred();
    mockGetItem.mockResolvedValue('true');
    mockGetProfile.mockReturnValueOnce(firstProfile.promise).mockReturnValueOnce(secondProfile.promise);
    await mount();
    let first, second;
    await ReactTestRenderer.act(() => { first = onAuth({ uid: 'first' }); second = onAuth({ uid: 'second' }); });
    await ReactTestRenderer.act(async () => { firstProfile.resolve({ username: 'old' }); await first; });
    expect(current.isLoading).toBe(true); expect(current.user.uid).toBe('second');
    await ReactTestRenderer.act(async () => { secondProfile.resolve({ username: 'new' }); await second; });
    expect(current.isLoading).toBe(false); expect(current.userProfile.username).toBe('new');
  });
});
