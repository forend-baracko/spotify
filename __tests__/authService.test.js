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
} = require('../src/services/authService');

describe('authService profile availability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      'Failed to save the Firestore user profile:',
      expect.any(Error)
    );
    console.warn.mockRestore();
  });

  it('does not wait for optional profile updates or writes to finish', async () => {
    const user = { uid: 'new-user', email: 'new@example.com' };
    mockCreateUserWithEmailAndPassword.mockResolvedValue({ user });
    mockUpdateProfile.mockReturnValue(new Promise(() => {}));
    mockSetDoc.mockReturnValue(new Promise(() => {}));

    const result = await Promise.race([
      registerWithEmail(user.email, 'password123', 'New User'),
      new Promise((resolve) => setTimeout(() => resolve('blocked'), 100)),
    ]);

    expect(result).toBe(user);
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
      photoURL: authUser.photoURL,
      favoriteTracks: [],
    });
    console.warn.mockRestore();
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
