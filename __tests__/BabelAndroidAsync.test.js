const babel = require('@babel/core');
const path = require('path');

const source = 'export async function waitForValue(promise) { return await promise; }';
const transform = (platform) => babel.transformSync(source, {
  filename: path.join(__dirname, '..', 'src', 'android-async-probe.js'),
  caller: { name: 'metro', platform, engine: 'hermes', isDev: false },
  envName: 'production',
}).code;

describe('Android Hermes async compilation', () => {
  it('transforms native async functions for Android Hermes', () => {
    const output = transform('android');
    expect(output).not.toMatch(/\basync\s+function\s+waitForValue\b/);
    expect(output).toMatch(/asyncToGenerator/);
  });

  it('does not add the Android-specific transform for a different platform', () => {
    const output = transform('web');
    expect(output).toMatch(/\basync\s+function\s+waitForValue\b/);
  });
});
