module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['expo/internal/babel-preset'],
    plugins: [
      ['@tamagui/babel-plugin', { components: ['tamagui'] }],
      'react-native-reanimated/plugin', // must be last
    ],
    env: {
      test: {
        plugins: ['babel-plugin-dynamic-import-node'],
      },
    },
  };
};
