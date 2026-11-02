import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import LoginScreen from '../src/navigation/LoginScreen';

const mockLogin = jest.fn();
const mockLoginGoogle = jest.fn();

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    loginGoogle: mockLoginGoogle,
    isConfigured: true,
  }),
}));

describe('LoginScreen', () => {
  it('keeps the sign-up action available and opens registration', async () => {
    const navigate = jest.fn();
    let renderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<LoginScreen navigation={{ navigate }} />);
    });

    const signUpButton = renderer.root.findByProps({ accessibilityRole: 'button' });

    await ReactTestRenderer.act(() => signUpButton.props.onPress());

    expect(navigate).toHaveBeenCalledWith('Register');
  });
});
