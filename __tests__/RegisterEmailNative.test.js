import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Platform, TextInput } from 'react-native';
const mockRegister = jest.fn();
jest.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ register: mockRegister, loginGoogle: jest.fn(), isConfigured: true }) }));
require('../test-utils/expoIcons');
jest.doMock('../src/components/auth/AuthEmailField', () => jest.requireActual('../src/components/auth/AuthEmailField.android'));
const RegisterScreen = require('../src/navigation/RegisterScreen').default;
describe('Android registration email field', () => {
  let renderer, platform;
  beforeEach(() => { platform = Platform.OS; Platform.OS = 'android'; mockRegister.mockReset(); });
  afterEach(async () => { if (renderer) await ReactTestRenderer.act(() => renderer.unmount()); renderer = null; Platform.OS = platform; });
  it('keeps registration validation and payload unchanged', async () => {
    mockRegister.mockResolvedValue(undefined);
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<RegisterScreen navigation={{}} />); });
    const email = renderer.root.findByType('ExpoUiTextInput');
    await ReactTestRenderer.act(() => { email.props.value.value = 'test@example.com'; email.props.onChangeText('test@example.com'); });
    for (const name of ['Create a password', 'Confirm password']) {
      const input = renderer.root.findAllByType(TextInput).find((node) => node.props.placeholder === name);
      await ReactTestRenderer.act(() => input.props.onChangeText('mock-password'));
    }
    const submit = renderer.root.findAllByType('ExpoUiButton').find((node) => node.props.label === 'Create Account');
    await ReactTestRenderer.act(async () => submit.props.onPress());
    expect(mockRegister).toHaveBeenCalledWith('test@example.com', 'mock-password');
  });
});
