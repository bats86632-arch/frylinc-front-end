import { useState, useEffect } from "react";
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import { PanelMap, ZoneLayout } from "../types";
import imageCompression from "browser-image-compression";
import { migrateZone } from "../utils/polygonGeom";
import { DEMO_PANEL_MAP } from "../mock/demoData";

const DEMO_STORAGE_KEY_PREFIX = "fyrlinc_demo_map_";

function getLocalDemoMap(panelId: string): PanelMap | null {
  try {
    const raw = localStorage.getItem(`${DEMO_STORAGE_KEY_PREFIX}${panelId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("[usePanelMap] Error reading local demo map:", e);
  }
  return null;
}

function saveLocalDemoMap(panelId: string, map: PanelMap | null): void {
  try {
    if (map) {
      localStorage.setItem(`${DEMO_STORAGE_KEY_PREFIX}${panelId}`, JSON.stringify(map));
    } else {
      localStorage.removeItem(`${DEMO_STORAGE_KEY_PREFIX}${panelId}`);
    }
  } catch (e) {
    console.warn("[usePanelMap] Error saving local demo map:", e);
  }
}

interface UsePanelMapReturn {
  panelMap: PanelMap | null;
  mapLoading: boolean;
  saving: boolean;
  uploading: boolean;
  uploadMap: (file: File, panelId: string) => Promise<void>;
  replaceMap: (file: File, panelId: string, oldImagePath: string) => Promise<void>;
  removeMap: (panelId: string, imagePath: string) => Promise<void>;
  saveLayout: (panelId: string, zones: ZoneLayout[]) => Promise<void>;
}

export function usePanelMap(panelId: string | null): UsePanelMapReturn {
  const [panelMap, setPanelMap] = useState<PanelMap | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { currentUser, isDemoMode } = useAuth();

  // ── Real-time listener on panelMaps/{panelId} ──────────────────────────────
  useEffect(() => {
    if (!panelId) {
      setPanelMap(null);
      setMapLoading(false);
      return;
    }

    if (panelId.startsWith("DEMO-") || isDemoMode) {
      const local = getLocalDemoMap(panelId);
      if (local) {
        setPanelMap(local);
      } else {
        setPanelMap({ ...DEMO_PANEL_MAP, panelId });
      }
      setMapLoading(false);
      return;
    }

    setMapLoading(true);
    const mapDocRef = doc(db, "panelMaps", panelId);

    const unsub = onSnapshot(
      mapDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const raw = snapshot.data() as PanelMap;
          // Migrate legacy rect zones → polygon points transparently
          const migratedZones = (raw.zones ?? []).map(migrateZone);
          setPanelMap({ ...raw, zones: migratedZones });
        } else {
          setPanelMap(null);
        }
        setMapLoading(false);
      },
      (err) => {
        console.error("[usePanelMap] Firestore listener error:", err);
        setPanelMap(null);
        setMapLoading(false);
      }
    );

    return () => unsub();
  }, [panelId]);

  // ── Upload a brand-new map image ───────────────────────────────────────────
  const uploadMap = async (file: File, panelId: string): Promise<void> => {
    if (panelId.startsWith("DEMO-") || isDemoMode) {
      setUploading(true);
      try {
        const options = {
          maxSizeMB: 0.8,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(compressedFile);
        });

        const newMap: PanelMap = {
          imageUrl: dataUrl,
          imagePath: `local://demo_${panelId}`,
          zones: [],
          updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
          updatedBy: "demo_local_user",
        };
        saveLocalDemoMap(panelId, newMap);
        setPanelMap(newMap);
      } finally {
        setUploading(false);
      }
      return;
    }

    if (!currentUser) throw new Error("Not authenticated");
    setUploading(true);
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      const ext = compressedFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const storagePath = `panelMaps/${panelId}/map.${ext}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, compressedFile, {
        contentType: compressedFile.type,
        customMetadata: { uploadedBy: currentUser.uid },
      });
      const imageUrl = await getDownloadURL(storageRef);

      const mapDocRef = doc(db, "panelMaps", panelId);
      await setDoc(mapDocRef, {
        imageUrl,
        imagePath: storagePath,
        zones: [],
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid,
      });
    } finally {
      setUploading(false);
    }
  };

  // ── Replace existing map image (delete old, upload new) ────────────────────
  const replaceMap = async (
    file: File,
    panelId: string,
    oldImagePath: string
  ): Promise<void> => {
    if (panelId.startsWith("DEMO-") || isDemoMode) {
      await uploadMap(file, panelId);
      return;
    }

    if (!currentUser) throw new Error("Not authenticated");
    setUploading(true);
    try {
      // Upload new file first
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      const ext = compressedFile.name.split(".").pop()?.toLowerCase() || "jpg";
      
      // Use a unique name to prevent overwriting if we keep the same extension,
      // or just rely on the fact that if we overwrite it, we don't need to delete the old one.
      // Actually, if we overwrite, the old one IS the new one, so deleting it would delete the new one!
      // Let's generate a unique timestamp for the file name.
      const timestamp = Date.now();
      const storagePath = `panelMaps/${panelId}/map_${timestamp}.${ext}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, compressedFile, {
        contentType: compressedFile.type,
        customMetadata: { uploadedBy: currentUser.uid },
      });
      const imageUrl = await getDownloadURL(storageRef);

      // Overwrite Firestore doc — reset zones since the floor plan changed
      const mapDocRef = doc(db, "panelMaps", panelId);
      await setDoc(mapDocRef, {
        imageUrl,
        imagePath: storagePath,
        zones: [],
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid,
      });

      // ONLY after successful upload and DB update, delete the old file (best-effort)
      if (oldImagePath && oldImagePath !== storagePath) {
        try {
          const oldRef = ref(storage, oldImagePath);
          await deleteObject(oldRef);
        } catch (e) {
          console.warn("[usePanelMap] Failed to delete old map image:", e);
        }
      }
    } finally {
      setUploading(false);
    }
  };

  // ── Remove entire map (delete image + Firestore doc) ───────────────────────
  const removeMap = async (panelId: string, imagePath: string): Promise<void> => {
    if (panelId.startsWith("DEMO-") || isDemoMode) {
      setUploading(true);
      try {
        saveLocalDemoMap(panelId, null);
        setPanelMap(null);
      } finally {
        setUploading(false);
      }
      return;
    }

    if (!currentUser) throw new Error("Not authenticated");
    setUploading(true);
    try {
      try {
        const oldRef = ref(storage, imagePath);
        await deleteObject(oldRef);
      } catch (e) {
        console.warn("[usePanelMap] Failed to delete map image during remove:", e);
      }
      const { updateDoc, deleteField, serverTimestamp } = await import("firebase/firestore");
      const mapDocRef = doc(db, "panelMaps", panelId);
      await updateDoc(mapDocRef, {
        imageUrl: deleteField(),
        imagePath: deleteField(),
        zones: deleteField(),
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid,
      });
    } finally {
      setUploading(false);
    }
  };

  const saveLayout = async (
    panelId: string,
    zones: ZoneLayout[]
  ): Promise<void> => {
    if (panelId.startsWith("DEMO-") || isDemoMode) {
      setSaving(true);
      const cleanZones = zones.map(({ zoneId, label, points }) => ({ zoneId, label, points }));
      setPanelMap((prev) => {
        const updated: PanelMap = prev
          ? { ...prev, zones: cleanZones }
          : {
              imageUrl: "",
              imagePath: "",
              zones: cleanZones,
              updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
              updatedBy: "demo_local_user",
            };
        saveLocalDemoMap(panelId, updated);
        return updated;
      });
      setSaving(false);
      return;
    }
    if (!currentUser) throw new Error("Not authenticated");
    setSaving(true);
    try {
      // Strip legacy rect fields — Firestore progressively migrates to polygon-only
      const cleanZones = zones.map(({ zoneId, label, points }) => ({ zoneId, label, points }));
      const mapDocRef = doc(db, "panelMaps", panelId);
      // Merge so imageUrl/imagePath are not accidentally overwritten
      await setDoc(
        mapDocRef,
        {
          zones: cleanZones,
          updatedAt: serverTimestamp(),
          updatedBy: currentUser.uid,
        },
        { merge: true }
      );
    } finally {
      setSaving(false);
    }
  };

  return { panelMap, mapLoading, saving, uploading, uploadMap, replaceMap, removeMap, saveLayout };
}
