/**
 * Status bar configuration for native platforms.
 *
 * Sets the status bar colour and style to match the Fyrlinc theme.
 * No-op on web.
 */
import { isNative } from './runtime';

/**
 * Configure the native status bar once at app startup.
 * Should be called from `main.tsx` after the app renders.
 */
export async function configureStatusBar(theme: 'dark' | 'light'): Promise<void> {
  if (!isNative) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');

    await StatusBar.setStyle({
      style: theme === 'dark' ? Style.Dark : Style.Light,
    });

    // Set background colour to match the app surface
    await StatusBar.setBackgroundColor({
      color: theme === 'dark' ? '#111214' : '#f4f5f7',
    });

    // Overlay the status bar so the app renders behind it (for safe-area CSS).
    await StatusBar.setOverlaysWebView({ overlay: true });
  } catch {
    // Plugin not available on this platform or setBackgroundColor not supported (iOS)
  }
}
