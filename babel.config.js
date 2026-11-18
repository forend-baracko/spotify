module.exports = (api) => {
  const isAndroid = api.caller((caller) => caller?.platform === 'android');
  const androidAsyncTransform = isAndroid
    ? [require.resolve('@babel/plugin-transform-async-to-generator', { paths: [require.resolve('babel-preset-expo')] })]
    : [];
  return {
    presets: ['babel-preset-expo'],
    plugins: [
    ...androidAsyncTransform,
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        blacklist: null,
        whitelist: null,
        safe: false,
        allowUndefined: true,
      },
    ],
    ],
  };
};
