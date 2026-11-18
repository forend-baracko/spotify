import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
require('../test-utils/expoIcons');
let AuthEmailField;
try { AuthEmailField = require('../src/components/auth/AuthEmailField.android').default; } catch (error) { if (!String(error.message).includes('Cannot find module')) throw error; }
describe('Android Expo email field', () => {
  let renderer;
  afterEach(async () => { if (renderer) await ReactTestRenderer.act(() => renderer.unmount()); renderer = null; });
  it('uses the native Expo text input without transforming the email', async () => {
    expect(AuthEmailField).toBeDefined();
    const onChangeText = jest.fn();
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<AuthEmailField value="" onChangeText={onChangeText} placeholder="Email address" />); });
    const field = renderer.root.findByType('ExpoUiTextInput');
    expect(field.props.value.value).toBe('');
    expect(field.props.keyboardType).toBe('email-address');
    expect(field.props.autoCapitalize).toBe('none');
    expect(field.props.autoCorrect).toBe(false);
    expect(field.props.accessibilityLabel).toBe('Email address');
    await ReactTestRenderer.act(() => field.props.onChangeText('test@example.com'));
    expect(onChangeText).toHaveBeenCalledWith('test@example.com');
  });
});
