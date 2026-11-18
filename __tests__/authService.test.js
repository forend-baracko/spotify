const mockCreateUserWithEmailAndPassword = jest.fn();
const mockSignInWithEmailAndPassword = jest.fn();
const mockUpdateProfile = jest.fn();
const mockSetDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockGoogleConfigure = jest.fn();
const mockGoogleHasPlayServices = jest.fn();
const mockGoogleSignIn = jest.fn();
const mockGoogleCredential = jest.fn();
const mockSignInWithCredential = jest.fn();

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: (...args) => mockCreateUserWithEmailAndPassword(...args),
  signInWithEmailAndPassword: (...args) => mockSignInWithEmailAndPassword(...args),
  signOut: jest.fn(),
  updateProfile: (...args) => mockUpdateProfile(...args),
  GoogleAuthProvider: { credential: (...args) => mockGoogleCredential(...args) },
  signInWithCredential: (...args) => mockSignInWithCredential(...args),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((...args) => args),
  setDoc: (...args) => mockSetDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  serverTimestamp: jest.fn(() => 'server-timestamp'),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: (...args) => mockGoogleConfigure(...args),
    hasPlayServices: (...args) => mockGoogleHasPlayServices(...args),
    signIn: (...args) => mockGoogleSignIn(...args),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
}));

jest.mock('../src/services/firebaseConfig', () => ({
  auth: {},
  db: {},
  isFirebaseConfigured: () => true,
}));

jest.mock('../src/constants/config', () => ({
  GOOGLE_CONFIG: { webClientId: 'web-client-id', iosClientId: '' },
}));

const {
  configureGoogleSignIn,
  getUserProfile,
  loginWithEmail,
  loginWithGoogle,
  registerWithEmail,
  saveUserUsername,
} = require('../src/services/authService');

describe('authService profile availability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetDoc.mockReset();
    mockSetDoc.mockResolvedValue(undefined);
    mockUpdateProfile.mockResolvedValue(undefined);
    mockGoogleHasPlayServices.mockResolvedValue(true);
    mockGoogleCredential.mockReturnValue('google-credential');
    mockSignInWithCredential.mockResolvedValue({
      user: { uid: 'google-user', email: 'google@example.com' },
    });
  });

  it('completes email registration when Firestore is offline after Auth succeeds', async () => {
    const user = { uid: 'new-user', email: 'new@example.com' };
    mockCreateUserWithEmailAndPassword.mockResolvedValue({ user });
    mockSetDoc.mockRejectedValue(new Error('Failed to get document because the client is offline.'));
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(registerWithEmail(user.email, 'password123', 'New User')).resolves.toBe(user);
    await Promise.resolve();

    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalled();
    expect(mockSetDoc).toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      'Firestore initial user doc creation error:',
      expect.any(Error)
    );
    console.warn.mockRestore();
  });

  it('signals Android authentication completion before a stalled registration document write', async () => {
    const { Platform } = require('react-native');
    const oldPlatform = Platform.OS;
    Platform.OS = 'android';
    const user = { uid: 'new-user', email: 'new@example.com' };
    mockCreateUserWithEmailAndPassword.mockResolvedValue({ user });
    mockSetDoc.mockReturnValue(new Promise(() => {}));
    const onAuthCreated = jest.fn();
    try {
      registerWithEmail(user.email, 'password123', 'New User', onAuthCreated);
      await Promise.resolve();
      await Promise.resolve();
      expect(onAuthCreated).toHaveBeenCalledTimes(1);
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
    } finally { Platform.OS = oldPlatform; }
  });

  it('does not wait for Android registration profile updates or writes to finish', async () => {
    const { Platform } = require('react-native');
    const oldPlatform = Platform.OS;
    Platform.OS = 'android';
    const user = { uid: 'nonblocking-user', email: 'new@example.com' };
    let finishProfile, finishDocument;
    mockCreateUserWithEmailAndPassword.mockResolvedValue({ user });
    mockUpdateProfile.mockReturnValue(new Promise((resolve) => { finishProfile = resolve; }));
    mockSetDoc.mockReturnValue(new Promise((resolve) => { finishDocument = resolve; }));
    try {
      const result = await Promise.race([
        registerWithEmail(user.email, 'password123', 'New User'),
        new Promise((resolve) => setTimeout(() => resolve('blocked'), 100)),
      ]);
      expect(result).toBe(user);
      expect(mockSetDoc).toHaveBeenCalledWith(
        [{}, 'users', user.uid],
        expect.objectContaining({ uid: user.uid, email: user.email, displayName: 'New User' }),
        { merge: true }
      );
    } finally { finishProfile?.(); finishDocument?.(); Platform.OS = oldPlatform; }
  });

  it('keeps registration document writes awaited on other platforms', async () => {
    const { Platform } = require('react-native');
    const oldPlatform = Platform.OS;
    Platform.OS = 'web';
    const user = { uid: 'other-platform-user', email: 'other@example.test' };
    let finishDocument;
    mockCreateUserWithEmailAndPassword.mockResolvedValue({ user });
    mockSetDoc.mockImplementationOnce(() => new Promise((resolve) => { finishDocument = resolve; }));
    try {
      let settled = false;
      const registration = registerWithEmail(user.email, 'password123').then(() => { settled = true; });
      await Promise.resolve();
      await Promise.resolve();
      expect(finishDocument).toEqual(expect.any(Function));
      expect(settled).toBe(false);
      finishDocument();
      await registration;
      expect(settled).toBe(true);
    } finally { finishDocument?.(); Platform.OS = oldPlatform; }
  });

  it('orders an early Android username save after registration initialization', async () => {
    const { Platform } = require('react-native');
    const { auth } = require('../src/services/firebaseConfig');
    const oldPlatform = Platform.OS;
    Platform.OS = 'android';
    const user = { uid: 'early-save-user', email: 'early@example.test' };
    let finishAuth, finishProfile, finishDocument;
    mockCreateUserWithEmailAndPassword.mockImplementationOnce(() => new Promise((resolve) => { finishAuth = resolve; }));
    mockUpdateProfile.mockImplementationOnce(() => new Promise((resolve) => { finishProfile = resolve; })).mockResolvedValue(undefined);
    mockSetDoc.mockImplementationOnce(() => new Promise((resolve) => { finishDocument = resolve; })).mockResolvedValue(undefined);
    try {
      const registration = registerWithEmail(user.email, 'password123', 'Old Name');
      auth.currentUser = user;
      const save = saveUserUsername(user.uid, 'NewName');
      await Promise.resolve();
      expect(mockSetDoc).not.toHaveBeenCalled();
      finishAuth({ user });
      await expect(registration).resolves.toBe(user);
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      finishDocument();
      await Promise.resolve();
      await Promise.resolve();
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      finishProfile();
      await expect(save).resolves.toMatchObject({ uid: user.uid, username: 'NewName' });
      expect(mockSetDoc).toHaveBeenCalledTimes(2);
      expect(mockSetDoc.mock.calls[1][1].username).toBe('NewName');
      expect(mockUpdateProfile).toHaveBeenLastCalledWith(user, { displayName: 'NewName' });
    } finally { finishProfile?.(); finishDocument?.(); delete auth.currentUser; Platform.OS = oldPlatform; }
  });

  it('orders two Android saves started synchronously by the registration callback', async () => {
    const { Platform } = require('react-native');
    const { auth } = require('../src/services/firebaseConfig');
    const oldPlatform = Platform.OS;
    Platform.OS = 'android';
    const user = { uid: 'reentrant-user', email: 'reentrant@example.test' };
    let finishDocument;
    mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({ user });
    mockSetDoc.mockImplementationOnce(() => new Promise((resolve) => { finishDocument = resolve; })).mockResolvedValue(undefined);
    auth.currentUser = user;
    let first, second;
    try {
      await registerWithEmail(user.email, 'password123', 'Original', () => {
        first = saveUserUsername(user.uid, 'First');
        second = saveUserUsername(user.uid, 'Second');
      });
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      finishDocument();
      await Promise.all([first, second]);
      expect(mockSetDoc).toHaveBeenCalledTimes(3);
      expect(mockSetDoc.mock.calls[1][1].username).toBe('First');
      expect(mockSetDoc.mock.calls[2][1].username).toBe('Second');
      expect(mockUpdateProfile).toHaveBeenLastCalledWith(user, { displayName: 'Second' });
    } finally { finishDocument?.(); delete auth.currentUser; Platform.OS = oldPlatform; }
  });

  it('releases the Android registration barrier when Firebase Auth rejects', async () => {
    const { Platform } = require('react-native');
    const { auth } = require('../src/services/firebaseConfig');
    const oldPlatform = Platform.OS;
    Platform.OS = 'android';
    const user = { uid: 'barrier-failure-user', email: 'existing@example.test' };
    let failAuth;
    mockCreateUserWithEmailAndPassword.mockImplementationOnce(() => new Promise((resolve, reject) => { failAuth = reject; }));
    auth.currentUser = user;
    try {
      const registration = registerWithEmail('invalid@example.test', 'password123').catch((error) => error);
      const save = saveUserUsername(user.uid, 'Existing');
      await Promise.resolve();
      expect(mockSetDoc).not.toHaveBeenCalled();
      failAuth({ code: 'auth/network-request-failed' });
      expect(await registration).toBeInstanceOf(Error);
      await expect(save).resolves.toMatchObject({ uid: user.uid, username: 'Existing' });
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
    } finally { delete auth.currentUser; Platform.OS = oldPlatform; }
  });

  it('continues Android registration and queued saves after initialization throws synchronously', async () => {
    const { Platform } = require('react-native');
    const { auth } = require('../src/services/firebaseConfig');
    const oldPlatform = Platform.OS;
    Platform.OS = 'android';
    const user = { uid: 'sync-failure-user', email: 'sync@example.test' };
    mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({ user });
    mockUpdateProfile.mockImplementationOnce(() => { throw new Error('profile unavailable'); }).mockResolvedValue(undefined);
    mockSetDoc.mockImplementationOnce(() => { throw new Error('write unavailable'); }).mockResolvedValue(undefined);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    auth.currentUser = user;
    let save;
    try {
      await expect(registerWithEmail(user.email, 'password123', 'Old', () => {
        save = saveUserUsername(user.uid, 'New');
      })).resolves.toBe(user);
      await expect(save).resolves.toMatchObject({ uid: user.uid, username: 'New' });
      expect(warn).toHaveBeenCalledWith('Failed to update the Firebase Auth display name:', expect.any(Error));
      expect(warn).toHaveBeenCalledWith('Firestore initial user doc creation error:', expect.any(Error));
      expect(mockSetDoc).toHaveBeenCalledTimes(2);
    } finally { warn.mockRestore(); delete auth.currentUser; Platform.OS = oldPlatform; }
  });

  it('returns auth identity details when the Firestore profile cannot be read', async () => {
    const authUser = {
      uid: 'offline-user',
      email: 'listener@example.com',
      displayName: 'Listener',
      photoURL: 'https://example.com/avatar.png',
    };
    mockGetDoc.mockRejectedValue(new Error('client is offline'));
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(getUserProfile(authUser.uid, authUser)).resolves.toEqual({
      uid: authUser.uid,
      email: authUser.email,
      displayName: authUser.displayName,
      username: authUser.displayName,
      photoURL: authUser.photoURL,
      favoriteTracks: [],
    });
    console.warn.mockRestore();
  });

  it('does not apply an old Android profile to a newly signed-in account', async () => {
    const { Platform } = require('react-native');
    const { auth } = require('../src/services/firebaseConfig');
    const oldPlatform = Platform.OS;
    let finishRead;
    Platform.OS = 'android';
    const firstUser = { uid: 'account-a' };
    const nextUser = { uid: 'account-b', displayName: 'Second', email: 'second@example.test', photoURL: 'https://example.test/b.png' };
    auth.currentUser = firstUser;
    mockGetDoc.mockImplementationOnce(() => new Promise((resolve) => { finishRead = resolve; }));
    try {
      const pending = getUserProfile(firstUser.uid, firstUser);
      await Promise.resolve();
      await Promise.resolve();
      expect(finishRead).toEqual(expect.any(Function));
      auth.currentUser = nextUser;
      finishRead({ exists: () => false });
      const profile = await pending;
      expect(profile).toMatchObject({ uid: 'account-a', username: null, email: null, photoURL: null });
      expect(mockSetDoc).not.toHaveBeenCalled();
      expect(mockUpdateProfile).not.toHaveBeenCalledWith(nextUser, expect.anything());
    } finally {
      delete auth.currentUser;
      Platform.OS = oldPlatform;
    }
  });

  it('does not persist a stale Android profile read after a newer username save', async () => {
    const { Platform } = require('react-native');
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const { auth } = require('../src/services/firebaseConfig');
    const originalPlatform = Platform.OS;
    Platform.OS = 'android';
    auth.currentUser = { uid: 'account-a', displayName: 'Old', email: 'a@example.test' };
    let finishRead;
    mockGetDoc.mockImplementationOnce(() => new Promise((resolve) => { finishRead = resolve; }));
    const getItem = jest.spyOn(AsyncStorage, 'getItem').mockResolvedValue(JSON.stringify({ username: 'Old' }));
    try {
      const pending = getUserProfile('account-a', auth.currentUser);
      await Promise.resolve();
      await Promise.resolve();
      expect(finishRead).toEqual(expect.any(Function));
      await saveUserUsername('account-a', 'New');
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      finishRead({ exists: () => false });
      await pending;
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      expect(mockUpdateProfile).not.toHaveBeenCalledWith(auth.currentUser, { displayName: 'Old' });
    } finally { getItem.mockRestore(); delete auth.currentUser; Platform.OS = originalPlatform; }
  });

  it('does not auto-sync an old profile while an Android username save is pending', async () => {
    const { Platform } = require('react-native');
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const { auth } = require('../src/services/firebaseConfig');
    const originalPlatform = Platform.OS;
    Platform.OS = 'android';
    auth.currentUser = { uid: 'account-a', displayName: 'Old', email: 'a@example.test' };
    let finishWrite;
    mockSetDoc.mockImplementationOnce(() => new Promise((resolve) => { finishWrite = resolve; }));
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    const getItem = jest.spyOn(AsyncStorage, 'getItem').mockResolvedValue(JSON.stringify({ username: 'Old' }));
    try {
      const save = saveUserUsername('account-a', 'New');
      await getUserProfile('account-a', auth.currentUser);
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      expect(mockUpdateProfile).not.toHaveBeenCalledWith(auth.currentUser, { displayName: 'Old' });
      finishWrite();
      await save;
    } finally { getItem.mockRestore(); delete auth.currentUser; Platform.OS = originalPlatform; }
  });

  it('waits for an older Android cache write before saving a newer username', async () => {
    const { Platform } = require('react-native');
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const { auth } = require('../src/services/firebaseConfig');
    const originalPlatform = Platform.OS;
    Platform.OS = 'android';
    auth.currentUser = { uid: 'account-a', displayName: 'Old', email: 'a@example.test' };
    let finishCache;
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ username: 'Old' }) });
    const setItem = jest.spyOn(AsyncStorage, 'setItem').mockImplementationOnce(() => new Promise((resolve) => { finishCache = resolve; })).mockResolvedValue(undefined);
    try {
      const read = getUserProfile('account-a', auth.currentUser);
      for (let i = 0; i < 8 && !finishCache; i += 1) await Promise.resolve();
      expect(finishCache).toEqual(expect.any(Function));
      const save = saveUserUsername('account-a', 'New');
      await Promise.resolve();
      expect(mockSetDoc).not.toHaveBeenCalled();
      finishCache();
      await Promise.all([read, save]);
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      expect(mockSetDoc.mock.calls[0][1].username).toBe('New');
    } finally { setItem.mockRestore(); delete auth.currentUser; Platform.OS = originalPlatform; }
  });

  it('waits for a started Android profile sync before saving a newer username', async () => {
    const { Platform } = require('react-native');
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const { auth } = require('../src/services/firebaseConfig');
    const originalPlatform = Platform.OS;
    Platform.OS = 'android';
    auth.currentUser = { uid: 'account-a', displayName: 'Before', email: 'a@example.test' };
    let finishSync;
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    mockUpdateProfile.mockImplementationOnce(() => new Promise((resolve) => { finishSync = resolve; }));
    const getItem = jest.spyOn(AsyncStorage, 'getItem').mockResolvedValue(JSON.stringify({ username: 'Old' }));
    try {
      await getUserProfile('account-a', auth.currentUser);
      expect(finishSync).toEqual(expect.any(Function));
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      const save = saveUserUsername('account-a', 'New');
      await Promise.resolve();
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      finishSync();
      await save;
      expect(mockSetDoc).toHaveBeenCalledTimes(2);
      expect(mockUpdateProfile).toHaveBeenLastCalledWith(auth.currentUser, { displayName: 'New' });
    } finally { getItem.mockRestore(); delete auth.currentUser; Platform.OS = originalPlatform; }
  });

  it('serializes overlapping Android username saves for the same account', async () => {
    const { Platform } = require('react-native');
    const { auth } = require('../src/services/firebaseConfig');
    const originalPlatform = Platform.OS;
    Platform.OS = 'android';
    auth.currentUser = { uid: 'account-a', displayName: 'Before', email: 'a@example.test' };
    let finishFirst;
    mockSetDoc.mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve; }));
    try {
      const first = saveUserUsername('account-a', 'First');
      const second = saveUserUsername('account-a', 'Second');
      await Promise.resolve();
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      finishFirst();
      await Promise.all([first, second]);
      expect(mockSetDoc).toHaveBeenCalledTimes(2);
      expect(mockSetDoc.mock.calls[1][1].username).toBe('Second');
      expect(mockUpdateProfile).toHaveBeenLastCalledWith(auth.currentUser, { displayName: 'Second' });
    } finally { delete auth.currentUser; Platform.OS = originalPlatform; }
  });

  it('continues a queued Android username save after an earlier save fails', async () => {
    const { Platform } = require('react-native');
    const { auth } = require('../src/services/firebaseConfig');
    const originalPlatform = Platform.OS;
    Platform.OS = 'android';
    auth.currentUser = { uid: 'account-a', email: 'a@example.test' };
    mockSetDoc.mockRejectedValueOnce(new Error('offline'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const first = saveUserUsername('account-a', 'First', {}, { requireFirestore: true }).catch((error) => error);
      const second = saveUserUsername('account-a', 'Second');
      expect(await first).toBeInstanceOf(Error);
      await expect(second).resolves.toMatchObject({ username: 'Second' });
      expect(mockSetDoc).toHaveBeenCalledTimes(2);
    } finally { warn.mockRestore(); delete auth.currentUser; Platform.OS = originalPlatform; }
  });

  it('rejects an Android username save that starts for a different current account', async () => {
    const { Platform } = require('react-native');
    const { auth } = require('../src/services/firebaseConfig');
    const originalPlatform = Platform.OS;
    Platform.OS = 'android';
    auth.currentUser = { uid: 'account-b', email: 'b@example.test' };
    try {
      await expect(saveUserUsername('account-a', 'First')).rejects.toThrow('account');
      expect(mockSetDoc).not.toHaveBeenCalled();
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    } finally { delete auth.currentUser; Platform.OS = originalPlatform; }
  });

  it('does not update a new Android account when an old username save finishes', async () => {
    const { Platform } = require('react-native');
    const { auth } = require('../src/services/firebaseConfig');
    const originalPlatform = Platform.OS;
    Platform.OS = 'android';
    const nextUser = { uid: 'account-b', displayName: 'Second' };
    auth.currentUser = { uid: 'account-a', email: 'first@example.test' };
    let finishWrite;
    mockSetDoc.mockImplementationOnce(() => new Promise((resolve) => { finishWrite = resolve; }));
    try {
      const pending = saveUserUsername('account-a', 'First');
      auth.currentUser = nextUser;
      finishWrite();
      await pending;
      expect(mockUpdateProfile).not.toHaveBeenCalledWith(nextUser, expect.anything());
    } finally { delete auth.currentUser; Platform.OS = originalPlatform; }
  });

  it('keeps Firebase Auth network errors actionable during login', async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue({ code: 'auth/network-request-failed' });

    await expect(loginWithEmail('user@example.com', 'password123')).rejects.toThrow(
      'Network error. Please check your internet connection.'
    );
  });

  it('configures Google Sign-In with the web client without requesting unused offline access', () => {
    configureGoogleSignIn();

    expect(mockGoogleConfigure).toHaveBeenCalledWith(
      expect.objectContaining({ webClientId: 'web-client-id', offlineAccess: false })
    );
  });

  it('does not exchange a late Google token after Android sign-out', async () => {
    const { Platform } = require('react-native');
    const originalPlatform = Platform.OS;
    Platform.OS = 'android';
    let finishGoogle;
    mockGoogleSignIn.mockImplementationOnce(() => new Promise((resolve) => { finishGoogle = resolve; }));
    let allowed = true;
    try {
      const pending = loginWithGoogle(() => allowed).catch((error) => error);
      await Promise.resolve();
      await Promise.resolve();
      expect(finishGoogle).toEqual(expect.any(Function));
      allowed = false;
      finishGoogle({ type: 'success', data: { idToken: 'synthetic-token' } });
      expect(await pending).toBeInstanceOf(Error);
      expect(mockSignInWithCredential).not.toHaveBeenCalled();
    } finally { Platform.OS = originalPlatform; }
  });

  it('signs into Firebase with the Google ID token', async () => {
    mockGoogleSignIn.mockResolvedValue({
      type: 'success',
      data: { idToken: 'google-id-token' },
    });

    const user = await loginWithGoogle();

    expect(mockGoogleHasPlayServices).toHaveBeenCalledWith({
      showPlayServicesUpdateDialog: true,
    });
    expect(mockGoogleCredential).toHaveBeenCalledWith('google-id-token');
    expect(mockSignInWithCredential).toHaveBeenCalledWith({}, 'google-credential');
    expect(user.uid).toBe('google-user');
  });

  it('reports a user-cancelled Google sign-in without attempting Firebase auth', async () => {
    mockGoogleSignIn.mockResolvedValue({ type: 'cancelled', data: null });

    await expect(loginWithGoogle()).rejects.toThrow('Google sign-in was cancelled.');
    expect(mockSignInWithCredential).not.toHaveBeenCalled();
  });

  it('explains Android Google OAuth package or SHA-1 configuration errors', async () => {
    mockGoogleSignIn.mockRejectedValue({ code: 'DEVELOPER_ERROR', message: '10' });

    await expect(loginWithGoogle()).rejects.toThrow(
      'Verify the Android package name and SHA-1 certificate fingerprints in Firebase'
    );
  });
});
