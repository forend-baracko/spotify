import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
require('../test-utils/expoIcons');
let AuthPasswordField;
try { AuthPasswordField = require('../src/components/auth/AuthPasswordField.android').default; } catch (error) { if (!String(error.message).includes('Cannot find module')) throw error; }
describe('Android Expo password field', () => {
  let renderer;
  afterEach(async () => { if (renderer) await ReactTestRenderer.act(() => renderer.unmount()); renderer = null; });
  it('keeps input unchanged and toggles secure entry', async () => {
    expect(AuthPasswordField).toBeDefined();
    const onChangeText = jest.fn();
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<AuthPasswordField value="" onChangeText={onChangeText} placeholder="Password" secure />); });
    let field = renderer.root.findByType('ExpoUiTextInput');
    expect(field.props.secureTextEntry).toBe(true);
    expect(field.props.autoCorrect).toBe(false);
    expect(field.props.accessibilityLabel).toBe('Password');
    await ReactTestRenderer.act(() => field.props.onChangeText('mock-secret'));
    expect(onChangeText).toHaveBeenCalledWith('mock-secret');
    await ReactTestRenderer.act(() => renderer.update(<AuthPasswordField value="mock-secret" onChangeText={onChangeText} placeholder="Password" secure={false} />));
    field = renderer.root.findByType('ExpoUiTextInput');
    expect(field.props.secureTextEntry).toBe(false);
    expect(field.props.autoCorrect).toBe(false);
  });
});
