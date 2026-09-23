# Fyrlinc — Cross-Platform Build & Architecture Guide

This document outlines how Fyrlinc operates across **Web**, **Android**, and **iOS** using a unified TypeScript/React source codebase and Capacitor native runtimes.

---

## 1. Architecture Overview

```
                        ┌───────────────────────────────┐
                        │   Fyrlinc React / TS Source   │
                        │        (src/ directory)       │
                        └───────────────┬───────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         │  Platform Abstraction Layer │
                         │       (src/platform/)       │
                         └──────────────┬──────────────┘
                                        │
                ┌───────────────────────┼───────────────────────┐
                ▼                       ▼                       ▼
      ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
      │   Desktop Web    │    │  Android Native  │    │    iOS Native    │
      │   & Mobile PWA   │    │  (Capacitor APK) │    │  (Capacitor IPA) │
      │  (Netlify / Web) │    │ (Android Studio) │    │     (Xcode)      │
      └──────────────────┘    └──────────────────┘    └──────────────────┘
```

- **One Source Codebase**: The React DOM UI runs identically across standard desktop/mobile browsers and inside the native WKWebView (iOS) and Android System WebView containers.
- **Firebase Backend**: Real-time Firestore synchronization, Storage downloads, and Cloud Functions APIs work cross-platform via the modular Firebase Web SDK.
- **Platform Layer (`src/platform/`)**: Provides normalized runtime detection, network monitoring, lifecycle/hardware back-button management, keyboard avoidance, and filesystem/sharing abstractions.

---

## 2. Directory Structure

```
front-end/
├── android/                   # Native Android Studio project (tracked in git)
│   ├── app/
│   │   ├── src/main/assets/   # Compiled web assets synced by Capacitor
│   │   └── build.gradle
│   └── build.gradle
├── ios/                       # Native Xcode project (tracked in git)
│   └── App/
│       ├── App/public/        # Compiled web assets synced by Capacitor
│       └── App.xcodeproj
├── src/
│   ├── platform/              # Platform abstraction adapters
│   │   ├── runtime.ts         # isNative, isWeb, isIOS, isAndroid
│   │   ├── capabilities.ts    # Plugin capability detection
│   │   ├── lifecycle.ts       # AppState & Android hardware back button
│   │   ├── network.ts         # Network status hook (@capacitor/network)
│   │   ├── keyboard.ts        # Keyboard resize & height tracking
│   │   ├── status-bar.ts      # Native status bar theme sync
│   │   ├── external-links.ts  # Link classification & in-app browser
│   │   ├── filesystem.ts      # Native filesystem + share / Web download
│   │   └── index.ts           # Barrel export
│   └── ...
├── capacitor.config.ts        # Capacitor configuration
├── dist/                      # Compiled production web assets
├── package.json
└── vite.config.ts
```

---

## 3. Installed Plugins & Rationale

All Capacitor plugins use matching **v8.x** major versions for total ecosystem compatibility:

| Plugin | Version | Platform | Purpose |
|---|---|---|---|
| `@capacitor/core` | `^8.5.0` | All | Core bridge & runtime detection |
| `@capacitor/cli` | `^8.5.0` | Dev | Platform management and asset syncing |
| `@capacitor/android` | `^8.5.0` | Android | Android native container shell |
| `@capacitor/ios` | `^8.5.0` | iOS | iOS native container shell |
| `@capacitor/app` | `^8.1.1` | Native | Lifecycle events & Android hardware back button |
| `@capacitor/network` | `^8.0.1` | Native | Reactive connectivity status across cellular/WiFi |
| `@capacitor/keyboard` | `^8.0.5` | Native | Virtual keyboard resize mode & layout avoidance |
| `@capacitor/status-bar` | `^8.0.3` | Native | Dynamic dark/light status bar theming |
| `@capacitor/splash-screen` | `^8.0.2` | Native | App launch screen matching brand background `#111214` |
| `@capacitor/filesystem` | `^8.1.3` | Native | Writing export files (Excel/PDF) on device |
| `@capacitor/share` | `^8.0.1` | Native | Native OS share sheet for exported documents |
| `@capacitor/browser` | `^8.0.4` | Native | Safe in-app browser for external documentation links |
| `@capacitor/preferences` | `^8.0.1` | Native | Non-sensitive key-value preferences |
| `@capacitor/haptics` | `^8.0.2` | Native | Haptic feedback for tactile alert interactions |

---

## 4. Development & Build Commands

### Web Development
```bash
npm run dev           # Starts local Vite development server (localhost:5173)
npm run build         # Compiles production assets into dist/
npm run preview       # Previews production dist/ locally
npm run test          # Runs Vitest unit tests for platform services
```

### Native Preparation Pipeline
```bash
npm run build:native  # Executes tests -> builds web -> syncs Android & iOS projects
```

### Android Development Workflow
```bash
# 1. Prepare and sync native assets
npm run build:native

# 2. Open project in Android Studio
npm run cap:open:android
# or: npx cap open android

# 3. Direct CLI build/run (requires Android SDK & emulator or device)
npm run cap:run:android
```

### iOS Development Workflow (Requires macOS + Xcode)
```bash
# 1. Prepare and sync native assets
npm run build:native

# 2. Open project in Xcode
npm run cap:open:ios
# or: npx cap open ios

# 3. Direct CLI build/run (requires macOS + Xcode)
npm run cap:run:ios
```

---

### One-Command CLI Build (D: Drive Configured)
```bash
# Build All (Debug APK, Release APK, Play Store AAB) -> automatically placed in release-builds/
npm run build:all

# Or build individual targets:
npm run build:apk   # Debug & Release APKs
npm run build:aab   # Google Play Store Bundle
```

### Dedicated Release Artifacts Folder (`front-end/release-builds/`)
All latest builds are automatically copied into `front-end/release-builds/`:
| File Name | Path | Size | Purpose |
|---|---|---|---|
| **Fyrlinc-Debug.apk** | `release-builds/Fyrlinc-Debug.apk` | **14.97 MB** | Direct installation & testing on Android phone / emulator |
| **Fyrlinc-Release.apk** | `release-builds/Fyrlinc-Release.apk` | **11.88 MB** | Standalone production-optimized APK |
| **Fyrlinc-PlayStore.aab** | `release-builds/Fyrlinc-PlayStore.aab` | **11.68 MB** | Google Play Console upload format (Android App Bundle) |

---

## 6. Over-The-Air (OTA) Live Updates (Without Store Re-review)

The app is now integrated with **Capgo Live Updates** (`@capgo/capacitor-updater`).

### How It Works:
1. **Self-Healing Protection**: On app launch, `initLiveUpdates()` calls `notifyAppReady()`. If an update bundle has a crash, the app automatically reverts to the previous working bundle.
2. **Instant Sync**: When you update UI/React code, you can package the `dist/` directory into a `.zip` and serve it (via Capgo cloud or your own Firebase Storage URL).
3. **Triggering Live Update via Code**:
```typescript
import { applyLiveUpdate } from './platform';

// Updates the app instantly without going through Google Play or Apple App Store
await applyLiveUpdate('https://your-server.com/bundles/dist-v1.0.1.zip', '1.0.1');
```

---

## 6. iOS Build & Release Guide (macOS)

### Simulator / Device Run
1. Open in Xcode: `npm run cap:open:ios`
2. Select your target simulator (e.g. iPhone 16) or connected iPhone.
3. Press **Cmd + R** to build and run.

### TestFlight & App Store Archive
1. In Xcode, select **Signing & Capabilities** on the `App` target.
2. Select your **Apple Developer Team**.
3. Choose **Any iOS Device (arm64)** as the target.
4. Select **Product → Archive**.
5. Once the Organizer window appears, select **Distribute App → App Store Connect → TestFlight / App Store**.

---

## 7. Firebase Configuration Checklist for Native Stores

### Android Firebase Setup
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Select your project (`fyrlinc-project`).
3. Click **Add App → Android**.
4. Enter Package Name: `com.fyrlinc.app`.
5. Enter App Name: `Fyrlinc`.
6. Download `google-services.json`.
7. Place `google-services.json` inside:
   `front-end/android/app/google-services.json`
8. Add your SHA-1 / SHA-256 release fingerprints in Project Settings if needed.

### iOS Firebase Setup
1. In Firebase Console, click **Add App → iOS**.
2. Enter Bundle ID: `com.fyrlinc.app`.
3. Download `GoogleService-Info.plist`.
4. Open Xcode via `npm run cap:open:ios`.
5. Drag `GoogleService-Info.plist` into the `App/App` folder in Xcode (ensure "Copy items if needed" is checked).

---

## 8. Acceptance & Verification Status

| Component | Status | Details |
|---|---|---|
| **Platform Abstraction Layer** | **VERIFIED** | 10/10 automated tests passing (`vitest`) |
| **Web Production Build** | **VERIFIED** | `vite build` completed cleanly into `dist/` with PWA support |
| **Android Project Shell** | **VERIFIED** | `android/` project generated, 10 plugins linked, synced |
| **iOS Project Shell** | **VERIFIED** | `ios/` project generated, 10 plugins linked via Swift Package Manager |
| **Full Native Pipeline (`build:native`)** | **VERIFIED** | `test` → `build` → `cap sync` executed and passed |
| **Android Native Compilation** | **VERIFIED** | Debug APK (10.83 MB), Release APK (9.76 MB), and Play Store AAB (9.57 MB) generated |
| **iOS Native Compilation** | **GENERATED BUT UNVERIFIED** | `ios/` created; native compilation requires macOS + Xcode |
| **Firebase Native Credentials** | **REQUIRES OWNER ACTION** | `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) must be placed by project owner |
| **App Store / Play Store Signing** | **REQUIRES OWNER ACTION** | Store credentials and signing keystores belong to account owner |
