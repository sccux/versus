module.exports = function (api) {
  api.cache(true);
  const isTest = process.env.NODE_ENV === 'test';
  return {
    presets: ['expo/internal/babel-preset'],
    plugins: [
      // @tamagui/babel-plugin calls process.exit(0) in test env when config is null; skip it
      ...(isTest ? [] : [['@tamagui/babel-plugin', { components: ['tamagui'] }]]),
      // react-native-reanimated/plugin can crash jest workers; skip in test env
      ...(isTest ? [] : ['react-native-reanimated/plugin']),
    ],
    env: {
      test: {
        plugins: ['babel-plugin-dynamic-import-node'],
      },
    },
  };
};
