/**
 * Keyboard management for native platforms.
 *
 * Configures Capacitor Keyboard plugin behaviour and provides a React hook
 * for keyboard visibility and height tracking.
 *
 * On web, the keyboard is handled by the browser natively — this module
 * provides a no-op hook for API consistency.
 */
import { useState, useEffect } from 'react';
import { isNative } from './runtime';

export interface KeyboardInfo {
  visible: boolean;
  height: number; // in pixels
}

/**
 * Configure the native keyboard behaviour once at app startup.
 * Call this from `main.tsx` after the app renders.
 */
export async function configureKeyboard(): Promise<void> {
  if (!isNative) return;

  try {
    const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard');
    // Let the WebView resize when the keyboard opens — this is the most
    // predictable behaviour for scroll-based forms.
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
    // Don't auto-scroll the view — let the layout handle it.
    await Keyboard.setScroll({ isDisabled: false });
  } catch {
    // Plugin not available on this platform (web)
  }
}

/**
 * React hook that tracks virtual keyboard visibility and height.
 *
 * On native: uses Capacitor Keyboard events.
 * On web: returns `{ visible: false, height: 0 }` (browser handles this).
 */
export function useKeyboard(): KeyboardInfo {
  const [info, setInfo] = useState<KeyboardInfo>({ visible: false, height: 0 });

  useEffect(() => {
    if (!isNative) return;

    const cleanups: Array<() => void> = [];

    import('@capacitor/keyboard').then(({ Keyboard }) => {
      Keyboard.addListener('keyboardWillShow', (ev) => {
        setInfo({ visible: true, height: ev.keyboardHeight });
        // Also set as CSS custom property for direct CSS consumption
        document.documentElement.style.setProperty(
          '--keyboard-height',
          `${ev.keyboardHeight}px`,
        );
      }).then((h) => cleanups.push(() => h.remove()));

      Keyboard.addListener('keyboardWillHide', () => {
        setInfo({ visible: false, height: 0 });
        document.documentElement.style.setProperty('--keyboard-height', '0px');
      }).then((h) => cleanups.push(() => h.remove()));
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return info;
}
