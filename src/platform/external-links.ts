/**
 * External link handling.
 *
 * Classifies URLs and opens them appropriately:
 * - Internal routes → React router navigation
 * - External HTTPS → in-app browser on native, new tab on web
 * - mailto / tel / maps → platform handler
 * - Unknown schemes → rejected
 */
import { isNative } from './runtime';

// ── Types ────────────────────────────────────────────────────────────────────

export type LinkTarget =
  | 'internal'     // handled by React router
  | 'external'     // opens in in-app browser or new tab
  | 'system'       // mailto, tel, sms, maps — opened by OS
  | 'rejected';    // unknown or insecure scheme

// ── Helpers ──────────────────────────────────────────────────────────────────

const TRUSTED_HOSTS = ['fyrlinc.com', 'www.fyrlinc.com'];
const SYSTEM_SCHEMES = ['mailto:', 'tel:', 'sms:', 'geo:', 'maps:'];

/**
 * Classify a URL for routing decisions.
 */
export function classifyUrl(url: string): LinkTarget {
  // Relative URLs are always internal
  if (url.startsWith('/') || url.startsWith('#') || url.startsWith('?')) {
    return 'internal';
  }

  // System schemes
  if (SYSTEM_SCHEMES.some((scheme) => url.startsWith(scheme))) {
    return 'system';
  }

  try {
    const baseOrigin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://fyrlinc.com';
    const parsed = new URL(url, baseOrigin);

    // Non-HTTPS schemes (except http for local dev) are rejected
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return 'rejected';
    }

    // Our own host → internal
    const currentHost =
      typeof window !== 'undefined' && window.location?.hostname
        ? window.location.hostname
        : 'fyrlinc.com';
    if (TRUSTED_HOSTS.includes(parsed.hostname) || parsed.hostname === currentHost) {
      return 'internal';
    }

    // Everything else → external
    return 'external';
  } catch {
    return 'rejected';
  }
}

/**
 * Open a URL using the appropriate handler.
 *
 * @param url      The URL to open
 * @param navigate React Router's navigate function (for internal routes)
 */
export async function openUrl(
  url: string,
  navigate?: (path: string) => void,
): Promise<void> {
  const type = classifyUrl(url);

  switch (type) {
    case 'internal': {
      if (navigate) {
        // Extract pathname from full URL or use as-is for relative paths
        try {
          const parsed = new URL(url, window.location.origin);
          navigate(parsed.pathname + parsed.search + parsed.hash);
        } catch {
          navigate(url);
        }
      } else {
        window.location.href = url;
      }
      break;
    }

    case 'external': {
      if (isNative) {
        try {
          const { Browser } = await import('@capacitor/browser');
          await Browser.open({ url, presentationStyle: 'popover' });
        } catch {
          // Fallback if Browser plugin not available
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      break;
    }

    case 'system': {
      // mailto, tel, etc. — let the platform handle it
      window.open(url, '_system');
      break;
    }

    case 'rejected': {
      console.warn(`[external-links] Rejected URL: ${url}`);
      break;
    }
  }
}
