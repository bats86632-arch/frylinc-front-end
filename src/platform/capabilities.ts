/**
 * Plugin capability detection.
 *
 * Provides a typed way to check whether a Capacitor plugin is available
 * on the current platform before calling it. This prevents crashes from
 * calling native-only APIs on web and vice versa.
 */
import { Capacitor } from '@capacitor/core';

export type PluginName =
  | 'App'
  | 'Browser'
  | 'Filesystem'
  | 'Haptics'
  | 'Keyboard'
  | 'Network'
  | 'Preferences'
  | 'Share'
  | 'SplashScreen'
  | 'StatusBar';

/**
 * Check if a named Capacitor plugin is available on the current platform.
 * Returns `false` on web unless the plugin provides a web implementation.
 */
export function isPluginAvailable(name: PluginName): boolean {
  try {
    return Capacitor.isPluginAvailable(name);
  } catch {
    return false;
  }
}

/**
 * Returns a record of all known plugin availability.
 * Useful for debugging and displaying platform capabilities.
 */
export function getCapabilities(): Record<PluginName, boolean> {
  const plugins: PluginName[] = [
    'App',
    'Browser',
    'Filesystem',
    'Haptics',
    'Keyboard',
    'Network',
    'Preferences',
    'Share',
    'SplashScreen',
    'StatusBar',
  ];

  return Object.fromEntries(
    plugins.map((name) => [name, isPluginAvailable(name)]),
  ) as Record<PluginName, boolean>;
}
