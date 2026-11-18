import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Platform, Text } from 'react-native';
const mockGoogle = jest.fn();
let mockAuthBusy = false;
let mockAuthError = null;
jest.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ login: jest.fn(), register: jest.fn(), loginGoogle: mockGoogle, authBusy: mockAuthBusy, authError: mockAuthError, isConfigured: true }) }));
require('../test-utils/expoIcons');
jest.doMock('../src/components/buttons/GoogleAuthButton', () => jest.requireActual('../src/components/buttons/GoogleAuthButton.android'));
const LoginScreen = require('../src/navigation/LoginScreen').default;
const RegisterScreen = require('../src/navigation/RegisterScreen').default;
describe('Android native Google login candidate', () => {
  let renderer, platform;
  beforeEach(() => { platform = Platform.OS; Platform.OS = 'android'; mockGoogle.mockReset(); mockAuthBusy = false; mockAuthError = null; });
  afterEach(async () => { if (renderer) await ReactTestRenderer.act(() => renderer.unmount()); renderer = null; Platform.OS = platform; });
  it('preserves one provider request and busy state', async () => {
    let finish; mockGoogle.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<LoginScreen navigation={{}} />); });
    const button = renderer.root.findAllByType('ExpoHomePill').find((node) => node.props.modifiers?.some((item) => item.contentDescription === 'Continue with Google'));
    expect(button).toBeDefined();
    const press = button.props.onClick;
    let first, second;
    await ReactTestRenderer.act(() => { first = press(); second = press(); });
    expect(mockGoogle).toHaveBeenCalledTimes(1);
    expect(renderer.root.findAllByType('ExpoCircularProgress')).toHaveLength(1);
    expect(renderer.root.findAllByType('ExpoUiButton').find((node) => node.props.label === 'Log In').props.disabled).toBe(true);
    await ReactTestRenderer.act(async () => { finish(); await Promise.all([first, second]); });
    expect(renderer.root.findAllByType('ExpoCircularProgress')).toHaveLength(0);
  });
  it('uses the same native provider button for sign-up without duplicate requests', async () => {
    let finish; mockGoogle.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<RegisterScreen navigation={{}} />); });
    const button = renderer.root.findAllByType('ExpoHomePill').find((node) => node.props.modifiers?.some((item) => item.contentDescription === 'Continue with Google'));
    expect(button).toBeDefined();
    const press = button.props.onClick;
    let first, second;
    await ReactTestRenderer.act(() => { first = press(); second = press(); });
    expect(mockGoogle).toHaveBeenCalledTimes(1);
    expect(renderer.root.findAllByType('ExpoCircularProgress')).toHaveLength(1);
    expect(renderer.root.findAllByType('ExpoUiButton').find((node) => node.props.label === 'Create Account').props.disabled).toBe(true);
    await ReactTestRenderer.act(async () => { finish(); await Promise.all([first, second]); });
  });
  it.each([[LoginScreen, 'Log In'], [RegisterScreen, 'Create Account']])('disables both actions when another screen is authenticating', async (Screen, label) => {
    mockAuthBusy = true;
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<Screen navigation={{}} />); });
    const primary = renderer.root.findAllByType('ExpoUiButton').find((node) => node.props.label === label);
    const google = renderer.root.findAllByType('ExpoHomePill').find((node) => node.props.modifiers?.some((item) => item.contentDescription === 'Continue with Google'));
    expect(primary.props.disabled).toBe(true);
    expect(google.props.enabled).toBe(false);
    expect(renderer.root.findAllByType(Text).some((node) => node.props.children === 'Authentication in progress. Please wait.')).toBe(true);
  });
  it.each([LoginScreen, RegisterScreen])('shows a shared auth error after the user switches screens', async (Screen) => {
    mockAuthError = 'Sign-in failed on the other screen';
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<Screen navigation={{}} />); });
    expect(renderer.root.findAllByType(Text).some((node) => node.props.children === mockAuthError)).toBe(true);
  });
});
