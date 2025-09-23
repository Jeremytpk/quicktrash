// Metro configuration to prevent bundler from picking up nested example projects
// that contain their own package.json with conflicting "main" fields.

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  // Exclude nested example/template projects
  new RegExp(
    `${path.sep}depencies${path.sep}.*`
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ),
  new RegExp(
    `${path.sep}test_android_app${path.sep}.*`
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ),
  // Exclude native build output folders
  new RegExp(
    `${path.sep}android${path.sep}build${path.sep}.*`
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ),
  new RegExp(
    `${path.sep}android${path.sep}\.gradle${path.sep}.*`
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ),
  new RegExp(
    `${path.sep}ios${path.sep}build${path.sep}.*`
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ),
];

// Ensure proper asset handling
config.resolver.assetExts.push(
  // Add any additional asset extensions if needed
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'
);

module.exports = config;


