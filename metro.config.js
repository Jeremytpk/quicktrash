const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Platform-specific resolver for web builds
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.platforms = ['native', 'ios', 'android', 'web'];

// Platform-specific aliases
if (process.env.EXPO_PLATFORM === 'web') {
  config.resolver.alias = {
    ...config.resolver.alias,
    '@stripe/stripe-react-native': path.resolve(__dirname, 'web-stubs/stripe-stub.js'),
  };
}

module.exports = config;
