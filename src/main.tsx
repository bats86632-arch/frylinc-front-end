import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { isNative, isAndroid } from './platform/runtime';
import { configureKeyboard } from './platform/keyboard';
import { configureStatusBar } from './platform/status-bar';
import { initLiveUpdates } from './platform/updater';

// ── Service Worker ───────────────────────────────────────────────────────────
// Only register the PWA service worker on web. Inside a Capacitor native
// container, assets are already bundled locally and a service worker is
// unnecessary (and can cause stale-cache issues when the app is updated).
if (!isNative) {
  // @ts-expect-error virtual module provided by vite-plugin-pwa
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onRegistered(r: any) {
        if (r) {
          setInterval(() => {
            r.update();
          }, 5 * 60 * 1000);

          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              r.update();
            }
          });

          window.addEventListener('focus', () => {
            r.update();
          });
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onRegisterError(error: any) {
        console.error('SW registration error', error);
      },
    });
  });
}

// ── Platform-specific root class ─────────────────────────────────────────────
if (isAndroid) {
  document.documentElement.classList.add('platform-android');
}

// ── Native platform setup ────────────────────────────────────────────────────
if (isNative) {
  // Configure keyboard resize behaviour
  configureKeyboard();
  // Set status bar style to match the dark theme (will update on theme toggle)
  configureStatusBar('dark');
  // Initialize Over-The-Air Live Updates (signals successful startup)
  initLiveUpdates();
}

// ── Render ───────────────────────────────────────────────────────────────────
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
