/**
 * Splash screen service.
 *
 * Provides a clean helper to dismiss the native splash screen as soon as
 * the React application has mounted and rendered.
 */
import { isNative } from './runtime';

export async function hideSplashScreen(): Promise<void> {
  if (!isNative) return;
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch (error) {
    console.warn('Failed to hide splash screen:', error);
  }
}
