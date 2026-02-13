# OTA (Over-the-Air) Updates – QuickTrash iOS

Production iOS builds are configured to receive OTA updates via **EAS Update** so you can ship JS/assets changes without a new App Store build.

## Build iOS production (with OTA)

```bash
npm run build:ios:production
# or
eas build -p ios --profile production
```

- Uses **channel**: `production` (so devices on this build listen for updates on that channel).
- **distribution**: `store` (App Store). Build will auto-increment build number.
- When users have this build installed, they will receive OTA updates you publish to `production`.

## Publish an OTA update (future updates)

After changing JS/React/assets (no native or Expo SDK upgrade):

```bash
npm run update:production
# or
eas update --branch production
```

- Publish only when the update is compatible with the **runtimeVersion** in `app.json` (currently `1.0.0`).
- When you change native code, Expo SDK, or add/change native modules, bump **runtimeVersion** in `app.json` and ship a new App Store build; then use OTA again for that new version.

## Summary

| Action | Command |
|--------|--------|
| Build iOS for App Store (OTA-enabled) | `npm run build:ios:production` |
| Publish OTA to production users | `npm run update:production` |

OTA is enabled in `ios/QuickTrash/Supporting/Expo.plist` and configured in `app.json` (`updates`, `runtimeVersion`).

### If the EAS build fails with "Compatible versions of some pods could not be resolved"

1. Regenerate the iOS project and lockfile:
   ```bash
   npx expo prebuild --platform ios --clean
   ```
2. Then build with a clean EAS cache:
   ```bash
   npm run build:ios:production:clean
   ```
   Or on the EAS build page, use "Clear cache and retry build".
