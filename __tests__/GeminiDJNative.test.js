import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'test' } }) }));
jest.mock('../src/services/geminiService', () => ({
  getGeminiStatus: jest.fn().mockResolvedValue({ configured: false, message: 'Server unavailable' }),
  createGeminiDjSet: jest.fn(),
}));
require('../test-utils/expoIcons');
jest.doMock('../src/components/search/DJPanel', () => jest.requireActual('../src/components/search/DJPanel.android'));
const GeminiDJ = require('../src/components/search/GeminiDJ').default;
const { getGeminiStatus } = require('../src/services/geminiService');

test('AI DJ panel uses an Expo card and retains the unavailable-server retry', async () => {
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<GeminiDJ tracks={[]} onStartSet={jest.fn()} />);
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(renderer.root.findAllByType('ExpoHomeCard')).toHaveLength(1);
  expect(renderer.root.findAllByProps({ accessibilityLabel: 'Retry AI DJ connection' }).length).toBeGreaterThan(0);
  getGeminiStatus.mockResolvedValueOnce({ configured: true, message: '' });
  const retry = renderer.root.findAllByType('ExpoUiButton').find((button) => button.props.label === 'Retry');
  await ReactTestRenderer.act(async () => { retry.props.onPress(); await Promise.resolve(); await Promise.resolve(); });
  expect(getGeminiStatus).toHaveBeenCalledTimes(2);
  expect(renderer.root.findAllByProps({ accessibilityLabel: 'Describe the music you want your AI DJ to pick' }).length).toBeGreaterThan(0);
  await ReactTestRenderer.act(() => renderer.unmount());
});
