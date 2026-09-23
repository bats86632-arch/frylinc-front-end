/**
 * Platform runtime detection — singleton values computed once at startup.
 *
 * Uses Capacitor's own detection where available, with sensible fallbacks
 * when Capacitor is not loaded (e.g. plain browser without native wrapper).
 */
import { Capacitor } from '@capacitor/core';

// ── Platform identity ────────────────────────────────────────────────────────

export type Platform = 'web' | 'ios' | 'android';

/** Current runtime platform. */
export const platform: Platform = (() => {
  try {
    const p = Capacitor.getPlatform();
    if (p === 'ios' || p === 'android') return p;
  } catch {
    /* Capacitor not available */
  }
  return 'web';
})();

/** Running inside a Capacitor native container (iOS or Android). */
export const isNative: boolean = (() => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
})();

/** Running in a standard web browser (not wrapped by Capacitor). */
export const isWeb = !isNative;

/** Running on iOS (Capacitor native). */
export const isIOS = platform === 'ios';

/** Running on Android (Capacitor native or query param in dev). */
export const isAndroid =
  platform === 'android' ||
  (typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('platform') === 'android');

// ── Viewport & input helpers ─────────────────────────────────────────────────
// These are NOT platform checks — they reflect the current display environment.
// Do not use them for capability decisions; use them for layout adaptation.

/** True when the primary pointing device supports hover (desktop mouse). */
export const supportsHover: boolean =
  typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

/** True when the primary input is coarse (touch). */
export const isTouchPrimary: boolean =
  typeof window !== 'undefined' &&
  window.matchMedia('(pointer: coarse)').matches;

/**
 * True when the viewport is at least 1024px wide.
 * Evaluated once at module load — for reactive layout, use CSS media queries
 * or a React hook wrapping `matchMedia`.
 */
export const isDesktopViewport: boolean =
  typeof window !== 'undefined' &&
  window.matchMedia('(min-width: 1024px)').matches;
