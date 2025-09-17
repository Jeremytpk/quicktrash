# Expo Network Troubleshooting Guide

## Common Solutions for "Request Timed Out" Error

### Issue: `exp://192.168.1.153:8082` timeout error

This error typically occurs due to network connectivity issues between your device and development machine.

## Solution 1: Use Localhost (Recommended for development)
```bash
npx expo start --localhost --clear
```
- Uses localhost instead of LAN IP
- More reliable for local development
- Works with iOS Simulator and Android Emulator

## Solution 2: Use Tunnel Mode
```bash
npx expo start --tunnel --clear
```
- Creates secure tunnel through Expo servers
- Bypasses local network restrictions
- Works across different networks
- Requires internet connection

## Solution 3: Check Network Configuration

### Check if ports are available:
```bash
lsof -i :8082
lsof -i :19000
lsof -i :19001
```

### Kill existing processes:
```bash
pkill -f expo
pkill -f metro
```

### Check firewall settings:
- macOS: System Preferences > Security & Privacy > Firewall
- Ensure Metro bundler ports (8082, 19000, 19001) are allowed

## Solution 4: Reset Metro Cache
```bash
npx expo start --clear --reset-cache
```

## Solution 5: Alternative Development Methods

### Using iOS Simulator:
1. Install Xcode
2. Start iOS Simulator
3. Run: `npx expo start --ios`

### Using Android Emulator:
1. Install Android Studio
2. Start Android Emulator
3. Run: `npx expo start --android`

### Using Physical Device (USB):
1. Enable USB debugging (Android) or trust computer (iOS)
2. Connect via USB
3. Use Expo Go app with localhost URL

## Solution 6: Network Diagnostics

### Check your IP address:
```bash
ifconfig | grep "inet "
```

### Test network connectivity:
```bash
ping 192.168.1.153
```

### Check if device can reach development machine:
From your mobile device, try accessing: `http://192.168.1.153:8082` in a web browser

## Solution 7: Alternative Start Commands

### For specific platforms:
```bash
# iOS only
npx expo start --ios

# Android only  
npx expo start --android

# Web only
npx expo start --web
```

### With different hosts:
```bash
# Use specific IP
npx expo start --host 192.168.1.153

# Use LAN
npx expo start --lan

# Use localhost
npx expo start --localhost
```

## Solution 8: Check Expo CLI Version
```bash
# Update Expo CLI
npm install -g @expo/cli@latest

# Check version
npx expo --version
```

## Solution 9: Development Environment Reset

### Complete reset:
```bash
# Stop all processes
pkill -f expo
pkill -f metro
pkill -f node

# Clear caches
npx expo start --clear --reset-cache

# Restart with fresh config
npx expo start --tunnel
```

## Quick Troubleshooting Checklist

1. ✅ Kill existing Expo processes
2. ✅ Try `--localhost` flag
3. ✅ Try `--tunnel` flag  
4. ✅ Check firewall settings
5. ✅ Update Expo CLI
6. ✅ Clear Metro cache
7. ✅ Use simulator/emulator instead
8. ✅ Check network connectivity

## Most Reliable Setup

For development, use:
```bash
npx expo start --localhost --clear
```

Then test with:
- iOS Simulator (if on Mac)
- Android Emulator  
- Physical device via USB

This avoids most network-related timeout issues.
