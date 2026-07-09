# Building Clank for Android

Everything here runs on your own machine — no Expo account, no cloud builds. The native
`android/` project is generated from `app.json` and is gitignored; regenerate it any time with
prebuild.

## One-time machine setup

1. **JDK 17** — `sdkman install java 17-tem`, or Temurin from adoptium.net, or the JDK bundled
   with Android Studio.
2. **Android SDK** — easiest via [Android Studio](https://developer.android.com/studio) (SDK
   Manager → install "Android SDK Platform 36" and "Android SDK Build-Tools"). Then:

   ```bash
   export ANDROID_HOME="$HOME/Android/Sdk"        # Linux (macOS: $HOME/Library/Android/sdk)
   export PATH="$PATH:$ANDROID_HOME/platform-tools"
   ```

   Put those in your shell profile.
3. **Enable USB debugging on your phone** — Settings → About phone → tap "Build number" 7 times,
   then Developer options → USB debugging. Verify with `adb devices`.

## Development build (replaces Expo Go)

```bash
cd mobile
npm install
npx expo run:android        # generates android/, builds a debug APK, installs it on your device
```

After the first install, day-to-day development is just `npx expo start` — the installed dev app
connects to Metro the way Expo Go did, but with our exact native modules baked in. Re-run
`npx expo run:android` only when native config changes (new native dependency, app.json plugin
changes).

## Release APK (sideloading / sharing directly)

```bash
npx expo prebuild -p android          # regenerate android/ if you don't have it
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

Unsigned-for-Play but signed with a debug-style key; fine for installing on your own devices.

## Play Store release (AAB + your own signing key)

1. **Generate your upload keystore once** and keep it safe (losing it means losing the ability
   to update the app; it's gitignored — never commit it):

   ```bash
   keytool -genkeypair -v -keystore clank-upload.keystore -alias clank-upload \
     -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Point Gradle at it** without committing anything: add to `~/.gradle/gradle.properties`
   (your home directory, not the repo):

   ```properties
   CLANK_UPLOAD_STORE_FILE=/absolute/path/to/clank-upload.keystore
   CLANK_UPLOAD_KEY_ALIAS=clank-upload
   CLANK_UPLOAD_STORE_PASSWORD=...
   CLANK_UPLOAD_KEY_PASSWORD=...
   ```

3. **Wire the signing config** into the generated `android/app/build.gradle` (prebuild
   regenerates this file, so re-apply after a fresh prebuild):

   ```groovy
   android {
     signingConfigs {
       release {
         if (project.hasProperty('CLANK_UPLOAD_STORE_FILE')) {
           storeFile file(CLANK_UPLOAD_STORE_FILE)
           storePassword CLANK_UPLOAD_STORE_PASSWORD
           keyAlias CLANK_UPLOAD_KEY_ALIAS
           keyPassword CLANK_UPLOAD_KEY_PASSWORD
         }
       }
     }
     buildTypes {
       release {
         signingConfig signingConfigs.release   // change from signingConfigs.debug
         ...
       }
     }
   }
   ```

4. **Build the bundle**:

   ```bash
   cd android && ./gradlew bundleRelease
   # → android/app/build/outputs/bundle/release/app-release.aab
   ```

5. Upload the `.aab` in [Play Console](https://play.google.com/console). First release also
   needs store listing assets (screenshots, 512px icon, privacy policy URL — easy for Clank:
   everything stays on-device, no data collected).

## Every subsequent Play release

- Bump `expo.android.versionCode` in `app.json` (Play rejects reused codes) and `expo.version`
  for the user-facing version.
- Rebuild the AAB and upload.

## Identity (already configured in app.json)

- Application ID: `com.tychoflorent.clank`
- `versionCode`: 1 — bump per Play upload
- Permissions: camera only (QR scan + repair photos). Microphone/RECORD_AUDIO is explicitly
  stripped; photo library access uses the Android photo picker (no storage permission on
  Android 13+).

## Once you're off Expo Go: video compression

Attached videos are currently stored as picked because Expo Go has no transcoder. On a dev
build, `react-native-compressor` can be added and dropped into `persistPickedMedia()` in
`src/lib/media.ts` to transcode videos (hardware H.264, ~720p) the same way images are already
resized. Do this only after switching your testing to `expo run:android`, since the native
module will not exist inside Expo Go.
