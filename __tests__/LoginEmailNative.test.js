import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Platform, TextInput } from 'react-native';
const mockLogin = jest.fn();
jest.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ login: mockLogin, loginGoogle: jest.fn(), isConfigured: true }) }));
require('../test-utils/expoIcons');
jest.doMock('../src/components/auth/AuthEmailField', () => jest.requireActual('../src/components/auth/AuthEmailField.android'));
const LoginScreen = require('../src/navigation/LoginScreen').default;
describe('Android login email field', () => {
  let renderer, platform;
  beforeEach(() => { platform = Platform.OS; Platform.OS = 'android'; mockLogin.mockReset(); });
  afterEach(async () => { if (renderer) await ReactTestRenderer.act(() => renderer.unmount()); renderer = null; Platform.OS = platform; });
  it('keeps the login payload unchanged', async () => {
    mockLogin.mockResolvedValue(undefined);
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<LoginScreen navigation={{}} />); });
    const email = renderer.root.findByType('ExpoUiTextInput');
    await ReactTestRenderer.act(() => { email.props.value.value = 'test@example.com'; email.props.onChangeText('test@example.com'); });
    const password = renderer.root.findAllByType(TextInput).find((node) => node.props.placeholder === 'Password');
    await ReactTestRenderer.act(() => password.props.onChangeText('mock-password'));
    const submit = renderer.root.findAllByType('ExpoUiButton').find((node) => node.props.label === 'Log In');
    await ReactTestRenderer.act(async () => submit.props.onPress());
    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'mock-password');
  });
});
