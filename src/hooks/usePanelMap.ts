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
  const { currentUser } = useAuth();

  // ── Real-time listener on panelMaps/{panelId} ──────────────────────────────
  useEffect(() => {
    if (!panelId) {
      setPanelMap(null);
      setMapLoading(false);
      return;
    }

    setMapLoading(true);
    const mapDocRef = doc(db, "panelMaps", panelId);

    const unsub = onSnapshot(
      mapDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setPanelMap(snapshot.data() as PanelMap);
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

  // ── Save zone layout positions ─────────────────────────────────────────────
  const saveLayout = async (
    panelId: string,
    zones: ZoneLayout[]
  ): Promise<void> => {
    if (!currentUser) throw new Error("Not authenticated");
    setSaving(true);
    try {
      const mapDocRef = doc(db, "panelMaps", panelId);
      // Merge so imageUrl/imagePath are not accidentally overwritten
      await setDoc(
        mapDocRef,
        {
          zones,
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
