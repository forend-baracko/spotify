import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Platform, Text, TouchableOpacity, StyleSheet } from 'react-native';
const mockComplete = jest.fn();
jest.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ completeOnboarding: mockComplete }) }));
require('../test-utils/expoIcons');
const OnBoardingScreen = require('../src/navigation/OnBoardingScreen').default;

describe('Android native onboarding action', () => {
  let renderer, oldPlatform;
  beforeEach(() => { oldPlatform = Platform.OS; Platform.OS = 'android'; mockComplete.mockReset(); });
  afterEach(async () => { if (renderer) await ReactTestRenderer.act(() => renderer.unmount()); renderer = null; Platform.OS = oldPlatform; });
  const native = (label) => renderer.root.findAllByType('ExpoUiButton').find((node) => node.props.label === label);
  const action = (label) => renderer.root.findAllByType(TouchableOpacity).find((node) => node.findAllByType(Text).some((text) => text.props.children === label));
  const has = (label) => renderer.root.findAllByType(Text).some((node) => node.props.children === label);
  it('uses the actual filled Expo button while preserving Next, Back and finish', async () => {
    const replace = jest.fn();
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<OnBoardingScreen navigation={{ replace }} />); });
    expect(has('Millions of Songs')).toBe(true);
    expect(native('Continue')).toBeDefined();
    expect(native('Continue').props.variant).toBe('filled');
    expect(StyleSheet.flatten(native('Continue').props.style).width).toBe('100%');
    await ReactTestRenderer.act(() => native('Continue').props.onPress());
    expect(has('Secure & Private')).toBe(true);
    await ReactTestRenderer.act(() => action('Back').props.onPress());
    expect(has('Millions of Songs')).toBe(true);
    await ReactTestRenderer.act(() => native('Continue').props.onPress());
    await ReactTestRenderer.act(() => native('Continue').props.onPress());
    expect(has('Listen Everywhere')).toBe(true);
    await ReactTestRenderer.act(() => native('Get Started').props.onPress());
    expect(mockComplete).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('Login');
  });
  it('keeps Skip and fallback navigation', async () => {
    const navigate = jest.fn();
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<OnBoardingScreen navigation={{ navigate }} />); });
    await ReactTestRenderer.act(() => action('Skip').props.onPress());
    expect(mockComplete).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('Login');
  });
  it('completes only once when Skip and Get Started are pressed together', async () => {
    const replace = jest.fn();
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<OnBoardingScreen navigation={{ replace }} />); });
    await ReactTestRenderer.act(() => native('Continue').props.onPress());
    await ReactTestRenderer.act(() => native('Continue').props.onPress());
    const skip = action('Skip').props.onPress;
    const finish = native('Get Started').props.onPress;
    await ReactTestRenderer.act(() => { skip(); finish(); });
    expect(mockComplete).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledTimes(1);
  });
});
