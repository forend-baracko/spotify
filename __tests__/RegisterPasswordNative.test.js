import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Platform, Text, TouchableOpacity } from 'react-native';
const mockRegister = jest.fn();
jest.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ register: mockRegister, loginGoogle: jest.fn(), isConfigured: true }) }));
require('../test-utils/expoIcons');
jest.doMock('../src/components/auth/AuthEmailField', () => jest.requireActual('../src/components/auth/AuthEmailField.android'));
jest.doMock('../src/components/auth/AuthPasswordField', () => jest.requireActual('../src/components/auth/AuthPasswordField.android'));
const RegisterScreen = require('../src/navigation/RegisterScreen').default;
describe('Android native registration password fields', () => {
  let renderer, platform;
  beforeEach(() => { platform = Platform.OS; Platform.OS = 'android'; mockRegister.mockReset(); });
  afterEach(async () => { if (renderer) await ReactTestRenderer.act(() => renderer.unmount()); renderer = null; Platform.OS = platform; });
  it('keeps both fields, visibility toggle and exact mocked registration payload', async () => {
    mockRegister.mockResolvedValue(undefined);
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<RegisterScreen navigation={{}} />); });
    const field = (label) => renderer.root.findAllByType('ExpoUiTextInput').find((node) => node.props.placeholder === label);
    expect(field('Create a password')).toBeDefined();
    expect(field('Confirm password')).toBeDefined();
    expect(field('Enter your email').props.autoComplete).toBe('email');
    expect(field('Create a password').props.autoComplete).toBe('new-password');
    expect(field('Confirm password').props.autoComplete).toBe('new-password');
    for (const [name, text] of [['Enter your email', 'test@example.com'], ['Create a password', 'mock-secret'], ['Confirm password', 'mock-secret']]) {
      await ReactTestRenderer.act(() => { field(name).props.value.value = text; field(name).props.onChangeText(text); });
    }
    expect(field('Create a password').props.secureTextEntry).toBe(true);
    expect(field('Confirm password').props.secureTextEntry).toBe(true);
    const show = renderer.root.findAllByType(TouchableOpacity).find((node) => node.findAllByType(Text).some((text) => text.props.children === 'Show'));
    await ReactTestRenderer.act(() => show.props.onPress());
    expect(field('Create a password').props.secureTextEntry).toBe(false);
    expect(field('Confirm password').props.secureTextEntry).toBe(false);
    expect(field('Confirm password').props.value.value).toBe('mock-secret');
    const submit = renderer.root.findAllByType('ExpoUiButton').find((node) => node.props.label === 'Create Account');
    await ReactTestRenderer.act(async () => submit.props.onPress());
    expect(mockRegister).toHaveBeenCalledWith('test@example.com', 'mock-secret');
  });
});
