import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Platform } from 'react-native';

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockOnAuthStateChanged = jest.fn();
const mockLogin = jest.fn();
const mockRegister = jest.fn();
const mockGoogle = jest.fn();
const mockLogout = jest.fn();
const mockSaveUsername = jest.fn();
const mockGetProfile = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: (...args) => mockGetItem(...args), setItem: (...args) => mockSetItem(...args) }));
jest.mock('firebase/auth', () => ({ onAuthStateChanged: (...args) => mockOnAuthStateChanged(...args) }));
jest.mock('../src/services/firebaseConfig', () => ({ auth: {}, isFirebaseConfigured: () => true }));
jest.mock('../src/services/audioPlayer', () => ({ reset: jest.fn() }));
jest.mock('../src/services/authService', () => ({
  loginWithEmail: (...args) => mockLogin(...args), registerWithEmail: (...args) => mockRegister(...args),
  loginWithGoogle: (...args) => mockGoogle(...args), getUserProfile: (...args) => mockGetProfile(...args),
  logoutUser: (...args) => mockLogout(...args), saveUserUsername: (...args) => mockSaveUsername(...args),
}));
const { AuthProvider, useAuth } = require('../src/context/AuthContext');
let current;
function Probe() { current = useAuth(); return null; }

describe('Android shared authentication guard', () => {
  let renderer, originalPlatform, onAuth;
  beforeEach(() => {
    originalPlatform = Platform.OS; Platform.OS = 'android';
    jest.resetAllMocks(); current = undefined;
    mockGetItem.mockResolvedValue('true'); mockSetItem.mockResolvedValue();
    mockGetProfile.mockResolvedValue({ username: 'listener' });
    mockOnAuthStateChanged.mockImplementation((auth, callback) => { onAuth = callback; callback(null); return jest.fn(); });
  });
  afterEach(async () => { if (renderer) await ReactTestRenderer.act(() => renderer.unmount()); renderer = null; Platform.OS = originalPlatform; });
  async function mount() { await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<AuthProvider><Probe /></AuthProvider>); }); }

  it('rejects a second auth method before the first settles, then allows retry', async () => {
    let finish;
    mockLogin.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    mockRegister.mockResolvedValue({ uid: 'mock-2', email: 'other@example.test' });
    await mount();
    let first, second;
    await ReactTestRenderer.act(() => { first = current.login('one@example.test', 'test-one'); second = current.register('two@example.test', 'test-two').catch((error) => error); });
    expect((await second).message).toContain('Authentication is already in progress');
    expect(mockLogin).toHaveBeenCalledTimes(1);
    expect(mockRegister).not.toHaveBeenCalled();
    expect(current.authBusy).toBe(true);
    await ReactTestRenderer.act(async () => { finish({ uid: 'mock-1', email: 'one@example.test' }); await first; });
    expect(current.authBusy).toBe(false);
    await ReactTestRenderer.act(async () => { await current.register('two@example.test', 'test-two'); });
    expect(mockRegister).toHaveBeenCalledTimes(1);
  });

  it('releases the shared guard when a provider attempt fails', async () => {
    let fail;
    mockGoogle.mockImplementationOnce(() => new Promise((resolve, reject) => { fail = reject; }));
    mockLogin.mockResolvedValue({ uid: 'mock-1', email: 'one@example.test' });
    await mount();
    let pending;
    await ReactTestRenderer.act(() => { pending = current.loginGoogle(); });
    expect(current.authBusy).toBe(true);
    await ReactTestRenderer.act(async () => { fail(new Error('cancelled')); await expect(pending).rejects.toThrow('cancelled'); });
    expect(current.authBusy).toBe(false);
    await ReactTestRenderer.act(async () => { await current.login('one@example.test', 'test-one'); });
    expect(mockLogin).toHaveBeenCalledTimes(1);
  });
  it('does not restore an account if registration completes after sign-out', async () => {
    let finish;
    mockRegister.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    await mount();
    let registration;
    await ReactTestRenderer.act(() => { registration = current.register('one@example.test', 'test-one').catch((error) => error); });
    await ReactTestRenderer.act(async () => { await onAuth({ uid: 'mock-1', email: 'one@example.test' }); });
    await ReactTestRenderer.act(async () => { await onAuth(null); });
    await ReactTestRenderer.act(async () => { finish({ uid: 'mock-1', email: 'one@example.test' }); await registration; });
    expect(current.user).toBeNull(); expect(current.userProfile).toBeNull(); expect(current.authBusy).toBe(false);
  });

  it('does not restore an old registration over a directly switched Android account', async () => {
    let finishRegistration;
    mockRegister.mockImplementationOnce(() => new Promise((resolve) => { finishRegistration = resolve; }));
    mockGetProfile.mockImplementation(async (uid) => ({ uid, username: uid }));
    await mount();
    let registration;
    await ReactTestRenderer.act(() => { registration = current.register('one@example.test', 'test-one').catch((error) => error); });
    await ReactTestRenderer.act(async () => { await onAuth({ uid: 'account-a', email: 'a@example.test' }); });
    await ReactTestRenderer.act(async () => { await onAuth({ uid: 'account-b', email: 'b@example.test' }); });
    await ReactTestRenderer.act(async () => { finishRegistration({ uid: 'account-a', email: 'a@example.test' }); await registration; });
    expect(current.user.uid).toBe('account-b');
    expect(current.userProfile.uid).toBe('account-b');
    expect(await registration).toBeInstanceOf(Error);
  });

  it.each(['listener', 'logout'])('allows a new login after %s sign-out while an old registration stalls', async (kind) => {
    let finishRegistration, finishLogin;
    mockRegister.mockImplementationOnce((email, password, name, onAuthCreated) => {
      onAuthCreated?.();
      return new Promise((resolve) => { finishRegistration = resolve; });
    });
    mockLogin.mockImplementationOnce(() => new Promise((resolve) => { finishLogin = resolve; }));
    await mount();
    let registration, login;
    await ReactTestRenderer.act(() => { registration = current.register('one@example.test', 'test-one').catch((error) => error); });
    await ReactTestRenderer.act(async () => { await onAuth({ uid: 'mock-1', email: 'one@example.test' }); });
    await ReactTestRenderer.act(async () => { if (kind === 'listener') await onAuth(null); else await current.logout(); });
    expect(current.authBusy).toBe(false);
    await ReactTestRenderer.act(() => { login = current.login('two@example.test', 'test-two'); });
    expect(mockLogin).toHaveBeenCalledTimes(1);
    expect(current.authBusy).toBe(true);
    await ReactTestRenderer.act(async () => { finishRegistration({ uid: 'mock-1', email: 'one@example.test' }); await registration; });
    expect(current.authBusy).toBe(true);
    expect(current.authError).toBeNull();
    await ReactTestRenderer.act(async () => { finishLogin({ uid: 'mock-2', email: 'two@example.test' }); await login; });
    expect(current.user.uid).toBe('mock-2');
    expect(current.authBusy).toBe(false);
  });

  it('releases a registration after its Auth callback arrives following external sign-out', async () => {
    let markAuthCreated, finishRegistration;
    mockRegister.mockImplementationOnce((email, password, name, onAuthCreated) => {
      markAuthCreated = onAuthCreated;
      return new Promise((resolve) => { finishRegistration = resolve; });
    });
    await mount();
    let registration;
    await ReactTestRenderer.act(() => { registration = current.register('one@example.test', 'test-one').catch((error) => error); });
    await ReactTestRenderer.act(async () => { await onAuth({ uid: 'mock-1', email: 'one@example.test' }); });
    await ReactTestRenderer.act(async () => { await onAuth(null); });
    expect(current.authBusy).toBe(true);
    await ReactTestRenderer.act(() => { markAuthCreated(); });
    expect(current.authBusy).toBe(false);
    await ReactTestRenderer.act(async () => { finishRegistration({ uid: 'mock-1', email: 'one@example.test' }); await registration; });
  });

  it('does not unlock another login while a cancelled Google provider request can still sign in', async () => {
    let failGoogle;
    mockGoogle.mockImplementationOnce(() => new Promise((resolve, reject) => { failGoogle = reject; }));
    await mount();
    let google;
    await ReactTestRenderer.act(() => { google = current.loginGoogle().catch((error) => error); });
    await ReactTestRenderer.act(async () => { await onAuth({ uid: 'existing', email: 'existing@example.test' }); });
    await ReactTestRenderer.act(async () => { await onAuth(null); });
    expect(current.authBusy).toBe(true);
    await ReactTestRenderer.act(async () => { await expect(current.login('two@example.test', 'test-two')).rejects.toThrow('already in progress'); });
    expect(mockLogin).not.toHaveBeenCalled();
    await ReactTestRenderer.act(async () => { failGoogle(new Error('cancelled')); await google; });
    expect(current.authBusy).toBe(false);
  });

  it('does not apply an old username save to the next Android account', async () => {
    let finishSave;
    mockSaveUsername.mockImplementationOnce(() => new Promise((resolve) => { finishSave = resolve; }));
    mockGetProfile.mockImplementation(async (uid) => ({ uid, username: uid }));
    await mount();
    await ReactTestRenderer.act(async () => { await onAuth({ uid: 'account-a', email: 'a@example.test' }); });
    let save;
    await ReactTestRenderer.act(() => { save = current.saveUsername('First').catch((error) => error); });
    await ReactTestRenderer.act(async () => { await onAuth(null); await onAuth({ uid: 'account-b', email: 'b@example.test' }); });
    await ReactTestRenderer.act(async () => { finishSave({ username: 'First' }); await save; });
    expect(current.user.uid).toBe('account-b');
    expect(current.userProfile).toMatchObject({ uid: 'account-b', username: 'account-b' });
    expect(await save).toBeInstanceOf(Error);
  });

  it('does not reject a username save when the same account refreshes its profile', async () => {
    let finishSave;
    mockSaveUsername.mockImplementationOnce(() => new Promise((resolve) => { finishSave = resolve; }));
    mockGetProfile.mockResolvedValue({ uid: 'account-a', username: 'Before' });
    await mount();
    const user = { uid: 'account-a', email: 'a@example.test' };
    await ReactTestRenderer.act(async () => { await onAuth(user); });
    let save;
    await ReactTestRenderer.act(() => { save = current.saveUsername('After'); });
    await ReactTestRenderer.act(async () => { await onAuth(user); });
    await ReactTestRenderer.act(async () => { finishSave({ username: 'After' }); await save; });
    expect(current.userProfile).toMatchObject({ uid: 'account-a', username: 'After' });
  });

  it('keeps a saved username when an older same-account profile read finishes later', async () => {
    let finishSave, finishProfile;
    mockSaveUsername.mockImplementationOnce(() => new Promise((resolve) => { finishSave = resolve; }));
    mockGetProfile.mockResolvedValueOnce({ uid: 'account-a', username: 'Before' })
      .mockImplementationOnce(() => new Promise((resolve) => { finishProfile = resolve; }));
    await mount();
    const user = { uid: 'account-a', email: 'a@example.test' };
    await ReactTestRenderer.act(async () => { await onAuth(user); });
    let save, refresh;
    await ReactTestRenderer.act(() => { save = current.saveUsername('After'); refresh = onAuth(user); });
    await ReactTestRenderer.act(async () => { finishSave({ username: 'After' }); await save; });
    await ReactTestRenderer.act(async () => { finishProfile({ uid: 'account-a', username: 'Before' }); await refresh; });
    expect(current.userProfile).toMatchObject({ uid: 'account-a', username: 'After' });
    expect(current.isProfileLoading).toBe(false);
  });

  it('does not sign out while a provider authentication can still change Firebase state', async () => {
    let finishGoogle;
    mockGoogle.mockImplementationOnce(() => new Promise((resolve) => { finishGoogle = resolve; }));
    await mount();
    let google;
    await ReactTestRenderer.act(() => { google = current.loginGoogle().catch((error) => error); });
    await ReactTestRenderer.act(async () => { await onAuth({ uid: 'existing', email: 'existing@example.test' }); });
    await ReactTestRenderer.act(async () => { await expect(current.logout()).rejects.toThrow('in progress'); });
    expect(mockLogout).not.toHaveBeenCalled();
    await ReactTestRenderer.act(async () => { finishGoogle({ uid: 'existing', email: 'existing@example.test' }); await google; });
    await ReactTestRenderer.act(async () => { await current.logout(); });
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('prevents overlapping logout operations', async () => {
    let finishLogout;
    mockLogout.mockImplementationOnce(() => new Promise((resolve) => { finishLogout = resolve; }));
    await mount();
    let logout;
    await ReactTestRenderer.act(() => { logout = current.logout(); });
    await ReactTestRenderer.act(async () => { await expect(current.logout()).rejects.toThrow('in progress'); });
    expect(mockLogout).toHaveBeenCalledTimes(1);
    await ReactTestRenderer.act(async () => { finishLogout(); await logout; });
  });

  it('releases logout when the onboarding flag write stalls', async () => {
    await mount();
    mockSetItem.mockImplementationOnce(() => new Promise(() => {}));
    let result;
    await ReactTestRenderer.act(async () => {
      result = await Promise.race([current.logout().then(() => 'done'), new Promise((resolve) => setTimeout(() => resolve('stalled'), 100))]);
    });
    expect(result).toBe('done');
    mockLogin.mockResolvedValueOnce({ uid: 'mock-2', email: 'two@example.test' });
    await ReactTestRenderer.act(async () => { await current.login('two@example.test', 'test-two'); });
    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it('rejects login until a pending logout completes', async () => {
    let finishLogout;
    mockLogout.mockImplementationOnce(() => new Promise((resolve) => { finishLogout = resolve; }));
    await mount();
    let logout;
    await ReactTestRenderer.act(() => { logout = current.logout(); });
    await ReactTestRenderer.act(async () => {
      await expect(current.login('two@example.test', 'test-two')).rejects.toThrow('in progress');
    });
    expect(mockLogin).not.toHaveBeenCalled();
    await ReactTestRenderer.act(async () => { finishLogout(); await logout; });
  });

  it('does not restore registration between the sign-out event and logout completing', async () => {
    let finishRegistration, finishLogout;
    mockRegister.mockImplementationOnce((email, password, name, onAuthCreated) => {
      onAuthCreated();
      return new Promise((resolve) => { finishRegistration = resolve; });
    });
    mockLogout.mockImplementationOnce(() => new Promise((resolve) => { finishLogout = resolve; }));
    await mount();
    let registration, logout;
    await ReactTestRenderer.act(() => { registration = current.register('one@example.test', 'test-one').catch((error) => error); });
    await ReactTestRenderer.act(async () => { await onAuth({ uid: 'mock-1', email: 'one@example.test' }); });
    await ReactTestRenderer.act(() => { logout = current.logout(); });
    await ReactTestRenderer.act(async () => { await onAuth(null); });
    await ReactTestRenderer.act(async () => { finishRegistration({ uid: 'mock-1', email: 'one@example.test' }); await registration; });
    expect(current.user).toBeNull();
    await ReactTestRenderer.act(async () => { finishLogout(); await logout; });
  });

  it('does not report login success when sign-out happens during profile loading', async () => {
    const user = { uid: 'mock-1', email: 'one@example.test' };
    const finishProfiles = [];
    mockLogin.mockResolvedValueOnce(user);
    mockGetProfile.mockImplementation(() => new Promise((resolve) => { finishProfiles.push(resolve); }));
    await mount();
    let login;
    await ReactTestRenderer.act(async () => { login = current.login(user.email, 'test-one').catch((error) => error); await Promise.resolve(); });
    await ReactTestRenderer.act(() => { onAuth(user); });
    await ReactTestRenderer.act(async () => { await onAuth(null); });
    await ReactTestRenderer.act(async () => { finishProfiles.forEach((resolve) => resolve({ username: 'listener' })); });
    expect(await login).toBeInstanceOf(Error);
    expect(current.user).toBeNull();
    mockGetProfile.mockResolvedValue({ username: 'listener' });
  });
});
