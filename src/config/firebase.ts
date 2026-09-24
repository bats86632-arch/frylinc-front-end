import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  persistentSingleTabManager,
  getFirestore,
  enableNetwork,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { isNative } from "../platform/runtime";

// Platform-aware persistence: multi-tab on web (supports multiple browser tabs),
// single-tab on native (Capacitor has only one WebView — multi-tab manager is
// unnecessary and can cause IndexedDB locking issues).
const isNativePlatform: boolean = (() => {
  if (isNative) return true;
  try {
    const cap = (globalThis as Record<string, unknown>).Capacitor as
      | { isNativePlatform?: () => boolean }
      | undefined;
    return cap?.isNativePlatform?.() ?? false;
  } catch {
    return false;
  }
})();

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDAWTyCPIzaIzSyk9zQL4zR2XtdLytwH-o",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "fyrlinc-project.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "fyrlinc-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "fyrlinc-project.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "205031509470",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:205031509470:web:adc196c8d658d7b3e2214f",
};

// Singleton guard — prevents duplicate initialization under React Strict Mode
// and Vite HMR. getApps() returns [] on first load, [app] on subsequent calls.
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Firestore must only be initialized once (initializeFirestore throws if called
// twice). After the first call we can safely use getFirestore().
let firestoreInitialised = false;
try {
  // Try getFirestore first — if it returns, Firestore was already initialised
  getFirestore(app);
  firestoreInitialised = true;
} catch {
  // Not initialised yet — expected on first load
}

export const db = firestoreInitialised
  ? getFirestore(app)
  : initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: isNativePlatform
          ? persistentSingleTabManager(undefined)
          : persistentMultipleTabManager(),
      }),
    });

export const storage = getStorage(app);
 
/**
 * Force Firestore to re-evaluate and reconnect its network channel.
 * Useful when resuming from background or upon network restoration.
 */
export async function reconnectFirestore(): Promise<void> {
  try {
    await enableNetwork(db);
  } catch (err) {
    // Safe to ignore if network is already enabled or offline
  }
}
