/**
 * Network status service.
 *
 * On native: uses @capacitor/network for reliable connectivity detection.
 * On web: uses navigator.onLine + online/offline events.
 *
 * Provides a React hook that returns reactive network status.
 */
import { useState, useEffect } from 'react';
import { isNative } from './runtime';

export interface NetworkStatus {
  connected: boolean;
  connectionType: 'wifi' | 'cellular' | 'none' | 'unknown';
}

/**
 * React hook that provides reactive network status.
 *
 * Usage:
 * ```tsx
 * const { connected } = useNetworkStatus();
 * ```
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    connected: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connectionType: 'unknown',
  });

  useEffect(() => {
    const cleanups: Array<() => void> = [];

    if (isNative) {
      import('@capacitor/network').then(({ Network }) => {
        // Get initial status
        Network.getStatus().then((s) => {
          setStatus({
            connected: s.connected,
            connectionType: s.connectionType as NetworkStatus['connectionType'],
          });
        });

        // Listen for changes
        Network.addListener('networkStatusChange', (s) => {
          setStatus({
            connected: s.connected,
            connectionType: s.connectionType as NetworkStatus['connectionType'],
          });
        }).then((handle) => cleanups.push(() => handle.remove()));
      });
    } else {
      // Web fallback
      const handleOnline = () =>
        setStatus((prev) => ({ ...prev, connected: true }));
      const handleOffline = () =>
        setStatus((prev) => ({ ...prev, connected: false }));

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      cleanups.push(() => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return status;
}
