// Metro configuration to prevent bundler from picking up nested example projects
// that contain their own package.json with conflicting "main" fields.

const { exclusionList } = require('metro-config/src/defaults/exclusionList');
const path = require('path');

module.exports = {
  resolver: {
    blockList: exclusionList([
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
    ]),
  },
};
