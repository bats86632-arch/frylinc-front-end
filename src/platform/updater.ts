/**
 * Over-The-Air (OTA) Live Updates Service.
 *
 * Powered by @capgo/capacitor-updater & Firebase Storage.
 *
 * Allows updating the HTML, JS, CSS, and assets inside installed mobile apps
 * automatically from Firebase Storage without requiring users to download a new APK
 * from Google Play or Apple App Store.
 *
 * Self-healing: if an updated bundle crashes on launch, the plugin automatically
 * rolls back to the previous working bundle within the reset timeout.
 */
import { isNative } from './runtime';

export interface LiveUpdateStatus {
  currentVersion: string | null;
  bundleAvailable: boolean;
}

export interface LiveUpdateManifest {
  version: string;
  bundleUrl: string;
  updatedAt?: string;
  releaseNotes?: string;
}

const FIREBASE_STORAGE_MANIFEST_URL =
  'https://firebasestorage.googleapis.com/v0/b/fyrlinc-project.appspot.com/o/app-updates%2Fversion.json?alt=media';

/**
 * Notify the native updater that the current bundle booted successfully,
 * and schedule a background check for new updates on Firebase Storage.
 */
export async function initLiveUpdates(): Promise<void> {
  if (!isNative) return;

  try {
    const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
    // Confirms that the JS environment loaded cleanly without crashing
    await CapacitorUpdater.notifyAppReady();

    // Check for updates in the background after 3 seconds (non-blocking)
    setTimeout(() => {
      checkForLiveUpdates().catch((err) => {
        console.warn('[LiveUpdates] Background update check failed:', err);
      });
    }, 3000);
  } catch (err) {
    console.warn('[LiveUpdates] notifyAppReady warning:', err);
  }
}

/**
 * Get information about the currently active web bundle.
 */
export async function getLiveUpdateInfo(): Promise<LiveUpdateStatus> {
  if (!isNative) {
    return { currentVersion: 'web', bundleAvailable: false };
  }

  try {
    const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
    const current = await CapacitorUpdater.current();
    return {
      currentVersion: current.bundle?.version || 'builtin',
      bundleAvailable: true,
    };
  } catch {
    return { currentVersion: 'builtin', bundleAvailable: false };
  }
}

/**
 * Check Firebase Storage for a new live update bundle.
 * If a newer version is found, downloads and stages it for the next launch.
 */
export async function checkForLiveUpdates(manifestUrl?: string): Promise<{
  updateAvailable: boolean;
  version?: string;
  applied?: boolean;
}> {
  if (!isNative) {
    return { updateAvailable: false };
  }

  const targetUrl = `${manifestUrl || FIREBASE_STORAGE_MANIFEST_URL}&_cb=${Date.now()}`;

  try {
    const res = await fetch(targetUrl, { cache: 'no-cache' });
    if (!res.ok) {
      return { updateAvailable: false };
    }

    const manifest: LiveUpdateManifest = await res.json();
    if (!manifest || !manifest.version || !manifest.bundleUrl) {
      return { updateAvailable: false };
    }

    const info = await getLiveUpdateInfo();
    if (info.currentVersion === manifest.version) {
      console.log(`[LiveUpdates] App is already on the latest bundle (v${manifest.version})`);
      return { updateAvailable: false, version: manifest.version };
    }

    console.log(`[LiveUpdates] New bundle available: v${manifest.version}. Downloading...`);
    const updateResult = await applyLiveUpdate(manifest.bundleUrl, manifest.version);

    if (updateResult.success) {
      console.log(`[LiveUpdates] Update v${manifest.version} staged. Active on next launch.`);
      return { updateAvailable: true, version: manifest.version, applied: true };
    }

    return { updateAvailable: true, version: manifest.version, applied: false };
  } catch (err) {
    console.warn('[LiveUpdates] Check failed (device may be offline or manifest not uploaded):', err);
    return { updateAvailable: false };
  }
}

/**
 * Download and apply a new web bundle zip over the air.
 *
 * @param bundleUrl Direct URL to the zip archive containing dist/ assets
 * @param version   Semantic version string (e.g. '1.0.1')
 */
export async function applyLiveUpdate(
  bundleUrl: string,
  version: string
): Promise<{ success: boolean; error?: string }> {
  if (!isNative) {
    return { success: false, error: 'Live updates only apply to native platforms' };
  }

  try {
    const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
    const bundle = await CapacitorUpdater.download({
      url: bundleUrl,
      version,
    });

    if (bundle && bundle.id) {
      await CapacitorUpdater.set({ id: bundle.id });
      return { success: true };
    }
    return { success: false, error: 'Failed to set downloaded bundle' };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[LiveUpdates] applyLiveUpdate failed:', errorMsg);
    return { success: false, error: errorMsg };
  }
}
