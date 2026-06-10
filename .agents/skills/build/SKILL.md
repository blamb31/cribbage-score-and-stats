---
name: build
description: Bumps version/versionCode, builds the Angular project, syncs Capacitor, and compiles the Android debug APK.
---
# Build Android App

Follow this exact step-by-step workflow to build the Android application:

1. Run the build script `node .agents/skills/build/scripts/build.js` in the workspace root directory. This script will:
   - Increment the patch version in `package.json`
   - Increment `versionCode` and update `versionName` in `android/app/build.gradle`
   - Run `npm run build` to compile the web assets
   - Run `npx cap sync android` to copy assets to the Android platform
   - Compile the debug APK using Gradle (`./gradlew assembleDebug`)
2. Present the output of the script to the user.
3. Print the absolute path to the generated APK file: `/Users/blakelamb/coding_projects/cribbage-score-and-stats/android/app/build/outputs/apk/debug/app-debug.apk`.
