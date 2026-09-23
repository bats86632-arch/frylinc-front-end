/**
 * App lifecycle service.
 *
 * Provides a React hook that wraps Capacitor's App plugin for:
 * - foreground / background transitions
 * - Android hardware back button
 * - app launch URL
 *
 * On web, falls back to `visibilitychange` and `popstate`.
 */
import { useEffect, useRef } from 'react';
import { isNative } from './runtime';

// ── Types ────────────────────────────────────────────────────────────────────

export type AppState = 'active' | 'inactive';

export interface LifecycleCallbacks {
  /** Called when the app transitions between foreground and background. */
  onStateChange?: (state: AppState) => void;
  /**
   * Android hardware back button handler.
   * Return `true` to prevent default behaviour (exit/back navigation).
   * Only fires on Android native.
   */
  onBackButton?: () => boolean;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Attach lifecycle listeners that are cleaned up when the component unmounts.
 *
 * Usage:
 * ```tsx
 * useAppLifecycle({
 *   onStateChange: (s) => console.log('App state:', s),
 *   onBackButton: () => { closeModal(); return true; },
 * });
 * ```
 */
export function useAppLifecycle(callbacks: LifecycleCallbacks): void {
  // Use a ref so we always call the latest callback without re-subscribing.
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  useEffect(() => {
    const cleanups: Array<() => void> = [];

    if (isNative) {
      // Dynamic import so the web bundle never ships native plugin code
      // that would fail to resolve.
      import('@capacitor/app').then(({ App }) => {
        // ── State change ──
        App.addListener('appStateChange', ({ isActive }) => {
          cbRef.current.onStateChange?.(isActive ? 'active' : 'inactive');
        }).then((handle) => cleanups.push(() => handle.remove()));

        // ── Back button (Android only) ──
        App.addListener('backButton', ({ canGoBack }) => {
          const handled = cbRef.current.onBackButton?.();
          if (!handled && canGoBack) {
            window.history.back();
          } else if (!handled) {
            App.minimizeApp();
          }
        }).then((handle) => cleanups.push(() => handle.remove()));
      });
    } else {
      // Web fallback — visibility change acts as the foreground/background signal.
      const handler = () => {
        cbRef.current.onStateChange?.(
          document.visibilityState === 'visible' ? 'active' : 'inactive',
        );
      };
      document.addEventListener('visibilitychange', handler);
      cleanups.push(() =>
        document.removeEventListener('visibilitychange', handler),
      );
    }

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, []); // Subscribe once; cbRef keeps callbacks current.
}
