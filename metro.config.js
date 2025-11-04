const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Platform-specific resolver for web builds
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.platforms = ['native', 'ios', 'android', 'web'];

module.exports = config;

