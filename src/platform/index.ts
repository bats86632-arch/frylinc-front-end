/**
 * Platform layer — barrel export.
 *
 * Import platform services from this module:
 * ```ts
 * import { isNative, platform, useNetworkStatus } from '../platform';
 * ```
 */

// Runtime detection
export {
  platform,
  isNative,
  isWeb,
  isIOS,
  isAndroid,
  supportsHover,
  isTouchPrimary,
  isDesktopViewport,
  type Platform,
} from './runtime';

// Plugin capability detection
export { isPluginAvailable, getCapabilities, type PluginName } from './capabilities';

// App lifecycle
export { useAppLifecycle, type AppState, type LifecycleCallbacks } from './lifecycle';

// Network status
export { useNetworkStatus, type NetworkStatus } from './network';

// Keyboard
export { configureKeyboard, useKeyboard, type KeyboardInfo } from './keyboard';

// Status bar
export { configureStatusBar } from './status-bar';

// External links
export { classifyUrl, openUrl, type LinkTarget } from './external-links';

// File save/share
export { saveFile, type SaveFileOptions, type SaveResult } from './filesystem';

// Over-The-Air (OTA) Live Updates
export { initLiveUpdates, getLiveUpdateInfo, applyLiveUpdate, type LiveUpdateStatus } from './updater';
