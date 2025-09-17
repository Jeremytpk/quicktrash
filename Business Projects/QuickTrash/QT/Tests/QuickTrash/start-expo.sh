#!/bin/bash

# QuickTrash Expo Startup Script
# This script helps resolve common network timeout issues

echo "🚛 Starting QuickTrash Development Server..."

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f expo 2>/dev/null
pkill -f metro 2>/dev/null
sleep 2

# Clear any cached data
echo "🗑️ Clearing Metro cache..."
rm -rf node_modules/.cache 2>/dev/null
rm -rf .expo 2>/dev/null

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the QuickTrash project directory."
    exit 1
fi

echo "📱 Choose your preferred development mode:"
echo "1) Localhost (Recommended - works with simulators)"
echo "2) Tunnel (Works across networks)"
echo "3) LAN (Local network)"
echo "4) iOS Simulator"
echo "5) Android Emulator"

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo "🏠 Starting with localhost..."
        npx expo start --localhost --clear
        ;;
    2)
        echo "🌐 Starting with tunnel..."
        npx expo start --tunnel --clear
        ;;
    3)
        echo "📡 Starting with LAN..."
        npx expo start --lan --clear
        ;;
    4)
        echo "📱 Starting iOS Simulator..."
        npx expo start --ios --clear
        ;;
    5)
        echo "🤖 Starting Android Emulator..."
        npx expo start --android --clear
        ;;
    *)
        echo "⚠️ Invalid choice. Starting with localhost (default)..."
        npx expo start --localhost --clear
        ;;
esac

echo "✅ Expo server should be running now!"
echo "📝 If you still get timeout errors, try:"
echo "   - Using a simulator/emulator instead of physical device"
echo "   - Checking your firewall settings"
echo "   - Making sure your device and computer are on the same network"
