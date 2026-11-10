import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text, TextInput, TouchableOpacity } from 'react-native';

const mockLogin = jest.fn();
const mockRegister = jest.fn();
const mockGoogle = jest.fn();
const mockSave = jest.fn();
jest.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ login: mockLogin, register: mockRegister, loginGoogle: mockGoogle, saveUsername: mockSave, isConfigured: true, userProfile: null }) }));
require('../test-utils/expoIcons');
const LoginScreen = require('../src/navigation/LoginScreen').default;
const RegisterScreen = require('../src/navigation/RegisterScreen').default;
const SetUsernameScreen = require('../src/navigation/SetUsernameScreen').default;

describe('native primary auth actions', () => {
  let renderer;
  const render = async (Screen, navigation = {}) => ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<Screen navigation={navigation} />); });
  const button = (label) => renderer.root.findAllByType('ExpoUiButton').find(node => node.props.label === label);
  const input = (placeholder) => renderer.root.findAllByType(TextInput).find(node => node.props.placeholder === placeholder);
  const type = async (placeholder, value) => ReactTestRenderer.act(() => input(placeholder).props.onChangeText(value));
  const hasText = (label) => renderer.root.findAllByType(Text).some(node => node.props.children === label);
  beforeEach(() => { jest.clearAllMocks(); });
  afterEach(async () => { if (renderer) await ReactTestRenderer.act(() => renderer.unmount()); });

  it('keeps login validation, payload and mutual pending state', async () => {
    let finish; mockLogin.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    await render(LoginScreen);
    expect(button('Log In').props.style.paddingHorizontal).toBeUndefined();
    await ReactTestRenderer.act(async () => button('Log In').props.onPress());
    expect(hasText('Please enter both email and password.')).toBe(true);
    expect(mockLogin).not.toHaveBeenCalled();
    await type('Email address', 'listener@example.com'); await type('Password', 'secret');
    let task; await ReactTestRenderer.act(() => { task = button('Log In').props.onPress(); });
    expect(mockLogin).toHaveBeenCalledWith('listener@example.com', 'secret');
    expect(button('Log In…').props.disabled).toBe(true);
    const google = renderer.root.findAllByType(TouchableOpacity).find(n => n.findAllByType(Text).some(t => t.props.children === 'Continue with Google'));
    expect(google.props.disabled).toBe(true);
    await ReactTestRenderer.act(async () => { finish(); await task; });
    expect(button('Log In').props.disabled).toBe(false);
  });

  it('keeps registration validation and submitted payload', async () => {
    mockRegister.mockResolvedValue(undefined); await render(RegisterScreen);
    await ReactTestRenderer.act(async () => button('Create Account').props.onPress());
    expect(hasText('Please enter both email and password.')).toBe(true);
    await type('Enter your email', 'listener@example.com'); await type('Create a password', 'secret'); await type('Confirm password', 'secret');
    await ReactTestRenderer.act(async () => button('Create Account').props.onPress());
    expect(mockRegister).toHaveBeenCalledWith('listener@example.com', 'secret');
  });

  it('keeps username validation, pending state and navigation', async () => {
    let finish; mockSave.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const replace = jest.fn(); await render(SetUsernameScreen, { replace });
    expect(button('Finish Setup').props.disabled).toBe(true);
    await type('username', 'listener');
    let task; await ReactTestRenderer.act(() => { task = button('Finish Setup').props.onPress(); });
    expect(button('Finish Setup…').props.disabled).toBe(true);
    expect(mockSave).toHaveBeenCalledWith('listener');
    expect(input('username').props.onSubmitEditing).toBeUndefined();
    await ReactTestRenderer.act(async () => { finish(); await task; });
    expect(replace).toHaveBeenCalledWith('Home');
  });

  it('prevents simultaneous keyboard and button username submissions', async () => {
    let finish; mockSave.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    await render(SetUsernameScreen);
    await type('username', 'listener');
    const keyboardSubmit = input('username').props.onSubmitEditing;
    const press = button('Finish Setup').props.onPress;
    let first, second;
    await ReactTestRenderer.act(() => { first = keyboardSubmit(); second = press(); });
    expect(mockSave).toHaveBeenCalledTimes(1);
    await ReactTestRenderer.act(async () => { finish(); await Promise.all([first, second]); });
  });

  it('prevents simultaneous login and provider submission before render', async () => {
    let finish; mockLogin.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    await render(LoginScreen);
    await type('Email address', 'listener@example.com'); await type('Password', 'secret');
    const login = button('Log In').props.onPress;
    const google = renderer.root.findAllByType(TouchableOpacity).find(n => n.findAllByType(Text).some(t => t.props.children === 'Continue with Google')).props.onPress;
    let first, second;
    await ReactTestRenderer.act(() => { first = login(); second = google(); });
    expect(mockLogin).toHaveBeenCalledTimes(1);
    expect(mockGoogle).not.toHaveBeenCalled();
    await ReactTestRenderer.act(async () => { finish(); await Promise.all([first, second]); });
  });

  it.each([[LoginScreen, 'Log In'], [RegisterScreen, 'Create Account']])('disables primary during Google sign-in and permits retry after failure', async (Screen, label) => {
    let fail; mockGoogle.mockImplementationOnce(() => new Promise((resolve, reject) => { fail = reject; }));
    await render(Screen);
    const google = renderer.root.findAllByType(TouchableOpacity).find(n => n.findAllByType(Text).some(t => t.props.children === 'Continue with Google'));
    let task; await ReactTestRenderer.act(() => { task = google.props.onPress(); });
    expect(button(label).props.disabled).toBe(true);
    expect(button(label).props.onPress).toBeUndefined();
    await ReactTestRenderer.act(async () => { fail(new Error('Offline')); await task; });
    expect(hasText('Offline')).toBe(true);
    expect(button(label).props.disabled).toBe(false);
  });

  it('disables Google while registration is pending and keeps error and retry', async () => {
    let fail; mockRegister.mockImplementationOnce(() => new Promise((resolve, reject) => { fail = reject; })).mockResolvedValueOnce(undefined);
    await render(RegisterScreen);
    await type('Enter your email', 'listener@example.com'); await type('Create a password', 'secret'); await type('Confirm password', 'secret');
    let task; await ReactTestRenderer.act(() => { task = button('Create Account').props.onPress(); });
    const google = renderer.root.findAllByType(TouchableOpacity).find(n => n.findAllByType(Text).some(t => t.props.children === 'Continue with Google'));
    expect(google.props.disabled).toBe(true);
    await ReactTestRenderer.act(async () => { fail(new Error('Offline')); await task; });
    expect(hasText('Offline')).toBe(true);
    await ReactTestRenderer.act(async () => button('Create Account').props.onPress());
    expect(mockRegister).toHaveBeenCalledTimes(2);
  });
});
