const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Tamagui: allow .web.js extensions for web compat
config.resolver.sourceExts.push('mjs');

module.exports = config;
