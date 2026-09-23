/**
 * File save and share service.
 *
 * On native: writes files to the device filesystem via @capacitor/filesystem,
 * then opens the share sheet via @capacitor/share.
 *
 * On web: triggers standard browser download via `<a download>`.
 */
import { isNative } from './runtime';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SaveFileOptions {
  /** The file contents as a Blob. */
  blob: Blob;
  /** Suggested filename (e.g. "report.xlsx"). */
  filename: string;
  /** MIME type (e.g. "application/pdf"). */
  mimeType: string;
}

export type SaveResult =
  | { success: true }
  | { success: false; error: 'cancelled' | 'permission-denied' | 'unknown'; message?: string };

// ── Implementation ───────────────────────────────────────────────────────────

/**
 * Save or share a file.
 *
 * On native: saves to a temporary cache directory and opens the OS share sheet
 * so the user can choose to save, email, AirDrop, etc.
 *
 * On web: triggers a standard browser download dialog.
 */
export async function saveFile(options: SaveFileOptions): Promise<SaveResult> {
  if (isNative) {
    return saveFileNative(options);
  }
  return saveFileWeb(options);
}

// ── Web implementation ───────────────────────────────────────────────────────

function saveFileWeb(options: SaveFileOptions): SaveResult {
  try {
    const url = URL.createObjectURL(options.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = options.filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    // Clean up after a short delay
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 100);

    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: 'unknown',
      message: e instanceof Error ? e.message : 'Failed to download file',
    };
  }
}

// ── Native implementation ────────────────────────────────────────────────────

async function saveFileNative(options: SaveFileOptions): Promise<SaveResult> {
  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');

    // Convert blob to base64
    const base64 = await blobToBase64(options.blob);

    // Write to cache directory (temporary; the share sheet lets the user save permanently)
    const result = await Filesystem.writeFile({
      path: options.filename,
      data: base64,
      directory: Directory.Cache,
    });

    // Open share sheet so user can save/send the file
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({
        title: options.filename,
        url: result.uri,
      });
    } catch (shareErr) {
      // User cancelled the share sheet — that's OK, file is still saved in cache
      if (
        shareErr instanceof Error &&
        (shareErr.message.includes('cancel') || shareErr.message.includes('dismissed'))
      ) {
        return { success: true }; // File was written, user just didn't share it
      }
    }

    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    if (message.includes('permission')) {
      return { success: false, error: 'permission-denied', message };
    }
    return { success: false, error: 'unknown', message };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip the data URL prefix (e.g. "data:application/pdf;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
