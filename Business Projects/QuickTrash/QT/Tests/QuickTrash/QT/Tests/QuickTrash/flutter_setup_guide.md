# Complete Flutter Development Environment Setup Guide for macOS

**IMPORTANT NOTE:** Building and simulating iOS applications requires a Mac with Xcode installed. Since you're on macOS, you'll be able to set up the environment for both iOS and Android development.

## Prerequisites Check ✅

Based on your system scan, you already have:
- ✅ **Git** (version 2.49.0) - Already installed
- ✅ **Visual Studio Code** - Already installed with command line tools
- ✅ **Homebrew** - Already installed

## 1. Install Prerequisites

Since you already have the basic prerequisites, we can proceed to the next steps. If you need to verify these are working:

```bash
# Verify Git
git --version

# Verify VS Code
code --version

# Verify Homebrew
brew --version
```

## 2. Set Up Visual Studio Code for Complete Flutter Development

### Launch VS Code and Install Essential Extensions

1. **Launch Visual Studio Code:**
   ```bash
   code
   ```

2. **Install Flutter and Dart Extensions (Core):**
   ```bash
   # Install essential Flutter/Dart extensions
   code --install-extension Dart-Code.flutter
   code --install-extension Dart-Code.dart-code
   ```

3. **Install Additional VS Code Extensions for Enhanced Development:**
   ```bash
   # Android development support
   code --install-extension vscjava.vscode-java-pack
   code --install-extension redhat.java
   code --install-extension vscjava.vscode-gradle
   
   # Flutter development enhancements
   code --install-extension alexisvt.flutter-snippets
   code --install-extension Nash.awesome-flutter-snippets
   code --install-extension robert-brunhage.flutter-riverpod-snippets
   
   # Git and project management
   code --install-extension eamodio.gitlens
   code --install-extension ms-vscode.vscode-json
   
   # Theme and UI (optional but recommended)
   code --install-extension PKief.material-icon-theme
   code --install-extension zhuangtongfa.Material-theme
   ```

4. **Configure VS Code Settings for Flutter Development:**
   
   Open VS Code settings (`Cmd+,`) and configure these settings, or create/update your `settings.json`:
   
   ```json
   {
     "dart.flutterSdkPath": "/Users/mabele/development/flutter",
     "dart.checkForSdkUpdates": true,
     "dart.openDevTools": "flutter",
     "flutter.checkForSdkUpdates": true,
     "flutter.generateLocalizationOnSave": true,
     "dart.debugExternalPackageLibraries": true,
     "dart.debugSdkLibraries": false,
     "editor.formatOnSave": true,
     "editor.codeActionsOnSave": {
       "source.fixAll": "explicit"
     },
     "files.associations": {
       "*.dart": "dart"
     },
     "emmet.includeLanguages": {
       "dart": "html"
     }
   }
   ```

   **To add these settings:**
   - Press `Cmd+Shift+P`
   - Type "Preferences: Open Settings (JSON)"
   - Add the above settings to your configuration

## 3. Install the Flutter SDK

### Clone Flutter SDK

1. **Create a development directory and clone Flutter:**
   ```bash
   # Create development directory
   mkdir -p $HOME/development
   cd $HOME/development
   
   # Clone Flutter SDK
   git clone https://github.com/flutter/flutter.git -b stable
   ```

### Add Flutter to PATH

2. **Add Flutter to your PATH permanently:**
   
   Since you're using zsh (default on macOS), add Flutter to your `.zshrc`:
   
   ```bash
   # Add Flutter to PATH in .zshrc
   echo 'export PATH="$HOME/development/flutter/bin:$PATH"' >> ~/.zshrc
   
   # Reload your shell configuration
   source ~/.zshrc
   ```
   
   **Verify Flutter is in PATH:**
   ```bash
   which flutter
   flutter --version
   ```

## 4. Platform-Specific Setup (macOS - iOS & Android)

### A. iOS Development Setup

#### Install Xcode

1. **Install Xcode from the Mac App Store:**
   - Open the Mac App Store
   - Search for "Xcode"
   - Click "Install" (this may take a while as Xcode is large)

2. **Install Xcode Command Line Tools:**
   ```bash
   xcode-select --install
   ```

3. **Configure Xcode:**
   - Open Xcode once installed
   - Accept the license agreement
   - Allow Xcode to install additional components
   - Run the license command:
   ```bash
   sudo xcodebuild -license accept
   ```

#### Install CocoaPods

4. **Install CocoaPods using Homebrew:**
   ```bash
   brew install cocoapods
   ```

### B. Android Development Setup (VS Code Integrated)

#### Install Android Command Line Tools

1. **Install Android SDK Command Line Tools via Homebrew:**
   ```bash
   # Install Android command line tools
   brew install --cask android-commandlinetools
   
   # Alternative: Install Android Studio for SDK Manager only (we'll use VS Code for development)
   brew install --cask android-studio
   ```

2. **Set up Android SDK Directory:**
   ```bash
   # Create Android SDK directory
   mkdir -p $HOME/Library/Android/sdk
   
   # Set ANDROID_HOME environment variable
   export ANDROID_HOME=$HOME/Library/Android/sdk
   ```

#### Configure Android SDK via Command Line

3. **Install Android SDK Components using sdkmanager:**
   ```bash
   # Add Android SDK to PATH temporarily for setup
   export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
   
   # Accept all licenses
   yes | sdkmanager --licenses
   
   # Install essential Android SDK components
   sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
   sdkmanager "system-images;android-34;google_apis;arm64-v8a"
   sdkmanager "emulator" "cmdline-tools;latest"
   
   # Install additional useful API levels
   sdkmanager "platforms;android-33" "build-tools;33.0.1"
   ```

#### Create and Manage Android Virtual Device (AVD) from Command Line

4. **Create Android Emulator via Command Line:**
   ```bash
   # Create an AVD (Android Virtual Device)
   avdmanager create avd -n "Pixel_7_API_34" -k "system-images;android-34;google_apis;arm64-v8a" -d "pixel_7"
   
   # List available AVDs
   avdmanager list avd
   
   # Create additional AVDs for different screen sizes (optional)
   avdmanager create avd -n "Pixel_4_API_34" -k "system-images;android-34;google_apis;arm64-v8a" -d "pixel_4"
   ```

5. **VS Code Android Emulator Integration:**
   
   Add these tasks to your VS Code workspace. Create `.vscode/tasks.json` in your project:
   ```json
   {
     "version": "2.0.0",
     "tasks": [
       {
         "label": "Start Android Emulator",
         "type": "shell",
         "command": "emulator",
         "args": ["-avd", "Pixel_7_API_34"],
         "group": "build",
         "presentation": {
           "echo": true,
           "reveal": "silent",
           "focus": false,
           "panel": "shared"
         },
         "runOptions": {
           "runOn": "folderOpen"
         }
       },
       {
         "label": "List Android Devices",
         "type": "shell",
         "command": "adb",
         "args": ["devices"],
         "group": "build"
       }
     ]
   }
   ```

#### Set Android Environment Variables

5. **Add Android SDK to your environment:**
   ```bash
   # Add Android SDK environment variables to .zshrc
   echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc
   echo 'export PATH=$PATH:$ANDROID_HOME/emulator' >> ~/.zshrc
   echo 'export PATH=$PATH:$ANDROID_HOME/tools' >> ~/.zshrc
   echo 'export PATH=$PATH:$ANDROID_HOME/tools/bin' >> ~/.zshrc
   echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.zshrc
   
   # Reload shell configuration
   source ~/.zshrc
   ```

## 5. Verify the Installation with flutter doctor

### Run Flutter Doctor

1. **Open a new terminal and run:**
   ```bash
   flutter doctor -v
   ```

2. **Understanding the Output:**
   - ✅ Green checkmarks mean everything is configured correctly
   - ⚠️  Yellow warnings may indicate optional components
   - ❌ Red X's indicate required fixes

3. **Common Issues and Solutions:**
   
   **Accept Android Licenses:**
   ```bash
   flutter doctor --android-licenses
   ```
   (Type 'y' to accept all licenses)
   
   **iOS Deployment Issues:**
   ```bash
   # If you see iOS deployment issues
   sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
   sudo xcodebuild -runFirstLaunch
   ```

### Expected flutter doctor Output

You should see something like:
```
[✓] Flutter (Channel stable, 3.x.x, on macOS 14.x.x 23x.x.x darwin-arm64, locale en-US)
[✓] Android toolchain - develop for Android devices (Android SDK version 34.x.x)
[✓] Xcode - develop for iOS and macOS (Xcode 15.x.x)
[✓] Chrome - develop for the web
[✓] Android Studio (version 2023.x.x)
[✓] VS Code (version 1.x.x)
[✓] Connected device (1 available)
[✓] Network resources
```

## 6. Create and Run Your First App

### Create a New Flutter Project

1. **Create your first Flutter app:**
   ```bash
   # Navigate to where you want to create your project
   cd $HOME/development
   
   # Create a new Flutter project
   flutter create my_first_app
   
   # Navigate into the project directory
   cd my_first_app
   ```

### Open Project in VS Code

2. **Open the project in VS Code:**
   ```bash
   # Open the current directory in VS Code
   code .
   ```

### VS Code Flutter Development Workflow

3. **VS Code Flutter Command Palette Commands:**
   
   Press `Cmd+Shift+P` and use these essential Flutter commands:
   ```
   Flutter: New Project                    # Create new Flutter project
   Flutter: Get Packages                   # Run flutter pub get
   Flutter: Clean                          # Run flutter clean
   Flutter: Launch Emulator                # Start Android/iOS emulator
   Flutter: Select Device                  # Choose target device
   Flutter: Hot Reload                     # Hot reload (also Cmd+S)
   Flutter: Hot Restart                    # Hot restart
   Flutter: Open DevTools                  # Open Flutter DevTools
   Flutter: Run Flutter Doctor             # Check Flutter installation
   Dart: Open DevTools                     # Open Dart DevTools
   ```

4. **Select Target Device in VS Code:**
   - Look at the bottom-right corner of VS Code status bar
   - Click on the device selector (it might show "No Device Selected")
   - Choose from available options:
     - iOS Simulator (iPhone models)
     - Android Emulator (your created AVDs)
     - Chrome (for web development)
     - macOS (for desktop development)

5. **Start Emulators from VS Code:**
   ```bash
   # Use Command Palette (Cmd+Shift+P) then:
   # "Flutter: Launch Emulator" - shows list of available emulators
   
   # Or use VS Code tasks (Ctrl+Shift+P -> "Tasks: Run Task"):
   # "Start Android Emulator" - starts your configured Android emulator
   ```

6. **Run Your App in VS Code:**
   - **Method 1 (Recommended):** Press `F5` to start debugging
   - **Method 2:** Press `Cmd+Shift+P`, type "Flutter: Launch Emulator", select your emulator, then press `F5`
   - **Method 3:** Use the Run and Debug view (`Cmd+Shift+D`) and click the play button
   - **Method 4:** Use integrated terminal (`Ctrl+``):
     ```bash
     # Start iOS Simulator
     flutter run -d ios
     
     # Start Android Emulator (make sure it's running first)
     flutter run -d android
     
     # Start in Chrome
     flutter run -d chrome
     ```

7. **VS Code Flutter Development Features:**
   - **Hot Reload:** Save file (`Cmd+S`) for instant code changes
   - **Hot Restart:** `Cmd+Shift+P` -> "Flutter: Hot Restart"
   - **Widget Inspector:** Click the "Widget Inspector" in the debug panel
   - **DevTools:** Access via status bar or Command Palette
   - **Code Completion:** IntelliSense for Flutter widgets and Dart
   - **Quick Fixes:** Lightbulb icon for automated fixes
   - **Refactoring:** Right-click -> "Refactor" for widget extraction

### Configure VS Code Launch Configurations

8. **Create Launch Configuration for Advanced Debugging:**
   
   Create `.vscode/launch.json` in your Flutter project:
   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "name": "Flutter (Debug)",
         "type": "dart",
         "request": "launch",
         "program": "lib/main.dart",
         "flutterMode": "debug"
       },
       {
         "name": "Flutter (Profile)",
         "type": "dart",
         "request": "launch",
         "program": "lib/main.dart",
         "flutterMode": "profile"
       },
       {
         "name": "Flutter (Release)",
         "type": "dart",
         "request": "launch",
         "program": "lib/main.dart",
         "flutterMode": "release"
       }
     ]
   }
   ```

### Verify Everything Works

9. **Test the VS Code Flutter Setup:**
   - The default Flutter counter app should appear on your selected device
   - Try hot reload by making a small change to the code and saving (`Cmd+S`)
   - You should see the change reflect immediately in the app
   - Test debugging by setting breakpoints (click in the gutter next to line numbers)
   - Use the Debug Console in VS Code to inspect variables
   - Try the Flutter Inspector in the Debug sidebar

## Troubleshooting Common Issues

### iOS Simulator Issues
```bash
# Open iOS Simulator manually
open -a Simulator

# List available iOS simulators
xcrun simctl list devices
```

### Android Emulator Issues
```bash
# List Android Virtual Devices
emulator -list-avds

# Start a specific AVD
emulator -avd <AVD_NAME>
```

### Flutter Issues
```bash
# Clean Flutter cache
flutter clean

# Get Flutter packages
flutter pub get

# Upgrade Flutter
flutter upgrade
```

## VS Code Flutter Productivity Tips

### Essential VS Code Shortcuts for Flutter Development

```bash
# Navigation and Editing
Cmd+Shift+P          # Command Palette (access all Flutter commands)
Cmd+P                # Quick Open files
Cmd+Shift+O          # Go to Symbol in File
Cmd+T                # Go to Symbol in Workspace
F12                  # Go to Definition
Shift+F12           # Find All References
Cmd+.               # Quick Fix (code actions)

# Flutter-Specific
F5                   # Start Debugging
Shift+F5            # Stop Debugging  
Cmd+Shift+F5        # Restart Debugging
Cmd+S               # Save (triggers hot reload)
Cmd+Shift+\         # Jump to matching bracket

# Code Formatting and Organization
Shift+Alt+F         # Format Document
Cmd+Shift+P -> "Organize Imports"  # Organize imports
```

### VS Code Workspace Configuration

Create a `.vscode/settings.json` in your Flutter project for project-specific settings:

```json
{
  "dart.lineLength": 100,
  "editor.rulers": [100],
  "editor.tabSize": 2,
  "files.insertFinalNewline": true,
  "files.trimTrailingWhitespace": true,
  "dart.automaticCommentSlashes": "tripleSlash",
  "dart.enableSnippets": true,
  "dart.insertArgumentPlaceholders": true,
  "dart.updateImportsOnRename": true,
  "flutter.hot-reload-on-save": "always"
}
```

### Debugging in VS Code

- **Set Breakpoints:** Click in the gutter next to line numbers
- **Conditional Breakpoints:** Right-click on breakpoint, add condition
- **Debug Console:** Access variables and execute Dart expressions
- **Call Stack:** View function call hierarchy
- **Variables Panel:** Inspect all variables in scope
- **Watch Panel:** Monitor specific expressions

## Next Steps

1. **Explore Flutter Documentation:** https://docs.flutter.dev/
2. **Try Flutter Codelabs:** https://docs.flutter.dev/codelabs
3. **Join Flutter Community:** https://flutter.dev/community
4. **Master VS Code for Flutter:** You now have a complete IDE setup without needing Android Studio's GUI!

## Useful Commands Reference

```bash
# Flutter commands
flutter doctor -v          # Check installation
flutter create <app_name>  # Create new project
flutter run                # Run app
flutter build apk          # Build Android APK
flutter build ios          # Build iOS app
flutter clean              # Clean project
flutter pub get            # Get dependencies

# Development
flutter hot-reload         # Reload code changes
flutter hot-restart        # Restart app
flutter logs               # View logs
```

---

**Congratulations!** You now have a complete Flutter development environment set up on your macOS system. You can develop, test, and build applications for both iOS and Android platforms.
