/**
 * Capacitor configuration — typed config for Fyrlinc.
 *
 * This file defines how Capacitor bridges the compiled React web app
 * to the native Android and iOS shell projects.
 *
 * IMPORTANT:
 * - `webDir` must match Vite's build output directory (`dist/`).
 * - Do NOT set `server.url` in production — assets must be bundled locally.
 * - `android/` and `ios/` directories are source artifacts; commit them.
 */
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fyrlinc.app',
  appName: 'Fyrlinc',
  webDir: 'dist',

  // ── Android ──────────────────────────────────────────────────────────────
  android: {
    // Use HTTPS scheme so Firebase Auth works correctly in the WebView
    // (avoids issues with cookies and same-origin policies).
    allowMixedContent: false,
  },

  // ── iOS ──────────────────────────────────────────────────────────────────
  ios: {
    // Content inset behaviour — let the web app handle safe areas via CSS.
    contentInset: 'automatic',
  },

  // ── Plugins ──────────────────────────────────────────────────────────────
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#111214',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    Keyboard: {
      // Resize the web content when the keyboard opens.
      resize: 'body',
      // Prevent keyboard from obscuring focused inputs.
      resizeOnFullScreen: true,
    },
    CapacitorUpdater: {
      // Automatic background updates
      autoUpdate: true,
      // Default reset timeout in milliseconds (self-healing guard)
      resetWhenUpdate: true,
    },
  },
};

export default config;
