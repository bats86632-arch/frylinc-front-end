import { formatPanelName } from '../utils/formatters';
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Map,
  Upload,
  Save,
  X,
  RefreshCw,
  Loader2,
  ImageOff,
  AlertTriangle,
  ChevronRight,
  RadioTower,
  List,
  Info,
  Trash2,
  PlusSquare,
  Minus,
  Plus,
  Maximize2,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { usePanels } from "../hooks/usePanels";
import { usePanelMap } from "../hooks/usePanelMap";
import { ZonePoly } from "../components/ZonePoly";
import { CopyButton } from "../components/CopyButton";


import { Panel, ZoneLayout } from "../types";
import { PanelService } from "../api/PanelService";
import { rectToPoints } from "../utils/polygonGeom";

// Roles that can edit (upload, drag, resize, save)
const EDIT_ROLES = ["super_admin", "secret_super_admin", "head_office", "system_integrator"] as const;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/svg+xml", "image/webp"];
const MAX_FILE_MB = 20;

// ── Helpers ───────────────────────────────────────────────────────────────────


/** Build the working zone array reconciling ONLY the zones already saved (ignore panel zoneCount for initialization) */
function buildZonesFromSaved(
  panelSerial: string,
  savedZones: ZoneLayout[]
): ZoneLayout[] {
  return savedZones.map((z, i) => ({
    ...z,
    label: `${panelSerial} \u2014 Zone ${z.zoneId.split('-Z')[1] || (i + 1)}`,
  }));
}

/** Create a single new zone box at a sensible default position, returned as a polygon. */
function newZonePos(existingCount: number): Pick<ZoneLayout, "points"> {
  // Stagger new zones diagonally so they don't all pile up
  const offset = (existingCount % 8) * 5;
  const x = 5 + offset, y = 5 + offset, w = 20, h = 15;
  return { points: rectToPoints(x, y, w, h) };
}

// ── Panel Selector item ───────────────────────────────────────────────────────
function PanelListItem({
  panel,
  isSelected,
  onClick,
}: {
  panel: Panel;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-[6px] border px-3 py-2.5 transition-all duration-150 ${
        isSelected
          ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--text-primary)]"
          : "border-[var(--border-subtle)] bg-[var(--surface-overlay)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`flex-shrink-0 w-[6px] h-[6px] rounded-full ${
              panel.alarm ? "bg-[var(--color-error)]" : "bg-[var(--color-success)]"
            }`}
          />
          <span className="text-[12px] font-semibold truncate text-[var(--text-primary)]">
            {formatPanelName(panel.name || "", panel.panelType)}
          </span>
        </div>
        <ChevronRight
          className={`flex-shrink-0 h-3.5 w-3.5 transition-colors ${
            isSelected ? "text-[var(--accent)]" : "text-[var(--text-quaternary)]"
          }`}
        />
      </div>
      <p className="mt-0.5 text-[10px] font-mono text-[var(--text-tertiary)] truncate">
        {panel.serial}
      </p>
      <p className="mt-0.5 text-[10px] text-[var(--text-quaternary)]">
        {panel.zoneCount} zone{panel.zoneCount !== 1 ? "s" : ""}
      </p>
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function MapZones() {
  const { role } = useAuth();
  const { panels, loading: panelsLoading } = usePanels();

  const canEdit = EDIT_ROLES.includes(role as (typeof EDIT_ROLES)[number]);

  const [searchParams] = useSearchParams();
  
  // Panel selection
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(searchParams.get("panelId"));
  const selectedPanel = useMemo(
    () => panels.find((p) => p.serial === selectedPanelId) ?? null,
    [panels, selectedPanelId]
  );

  // Panel search filter
  const [panelSearch, setPanelSearch] = useState("");
  const filteredPanels = useMemo(() => {
    const q = panelSearch.toLowerCase().trim();
    if (!q) return panels;
    return panels.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.serial.toLowerCase().includes(q) ||
        p.branchId?.toLowerCase().includes(q)
    );
  }, [panels, panelSearch]);

  // Map data hook
  const { panelMap, mapLoading, saving, uploading, uploadMap, replaceMap, removeMap, saveLayout } =
    usePanelMap(selectedPanelId);

  // Local editing state
  const [localZones, setLocalZones] = useState<ZoneLayout[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [selectedZoneIdx, setSelectedZoneIdx] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [deletePanelConfirm, setDeletePanelConfirm] = useState(false);
  const [isDeletingPanel, setIsDeletingPanel] = useState(false);

  // Container ref for coordinate system
  const containerRef = useRef<HTMLDivElement>(null);
  // SVG overlay ref — shared by all ZonePoly instances
  const svgRef = useRef<SVGSVGElement>(null);

  // Canvas outer scroll container ref
  const canvasScrollRef = useRef<HTMLDivElement>(null);

  // Image ref for natural size
  const mapImageRef = useRef<HTMLImageElement>(null);

  // Zoom state: null = not yet calculated (image not loaded), number = zoom factor
  const [zoom, setZoom] = useState<number | null>(null);
  const [fitZoom, setFitZoom] = useState<number>(1);
  const [isAnimating, setIsAnimating] = useState(false);

  /** Calculate and apply fit-to-screen zoom once the image dimensions are known */
  const applyFitZoom = useCallback(() => {
    const canvas = canvasScrollRef.current;
    const img = mapImageRef.current;
    if (!canvas || !img || !img.naturalWidth || !img.naturalHeight) return;
    
    const availW = canvas.clientWidth - 4;  // subtract border
    const availH = canvas.clientHeight - 4;
    if (availW <= 0 || availH <= 0) return;

    const scaleW = availW / img.naturalWidth;
    const scaleH = availH / img.naturalHeight;
    const isMobile = window.innerWidth < 768;

    let fit: number;
    if (isMobile) {
      const containZoom = Math.min(scaleW, scaleH);
      const coverZoom = Math.max(scaleW, scaleH);
      const renderedHeightRatio = (img.naturalHeight * containZoom) / availH;
      
      if (renderedHeightRatio < 0.4) {
        // If it's a wide image taking < 40% of phone height, boost zoom to fill ~65% of screen height
        // This ensures it's readable and doesn't look like a tiny strip at the top
        const boostZoom = (availH * 0.65) / img.naturalHeight;
        fit = Math.min(boostZoom, coverZoom, 1.5);
      } else {
        fit = containZoom;
      }
    } else {
      fit = Math.min(scaleW, scaleH, 1); // never upscale beyond 100% on desktop
    }
    
    // Clamp zoom to reasonable bounds
    fit = Math.min(3, Math.max(0.1, fit));
    fit = Math.round(fit * 100) / 100;
    
    setFitZoom(fit);
    setZoom(fit);
    setTimeout(() => setIsAnimating(true), 50);

    // If the image overflows horizontally due to the smart zoom boost, auto-center it
    if (isMobile && fit > scaleW) {
      setTimeout(() => {
        if (canvasScrollRef.current) {
          const cvs = canvasScrollRef.current;
          cvs.scrollLeft = (cvs.scrollWidth - cvs.clientWidth) / 2;
          cvs.scrollTop = (cvs.scrollHeight - cvs.clientHeight) / 2;
        }
      }, 50);
    }
  }, []);

  // Re-fit whenever a new panel map loads
  useEffect(() => {
    setZoom(null); // reset while loading
    setIsAnimating(false);
  }, [selectedPanelId, panelMap?.imagePath]);

  // Keyboard Delete to remove selected zone
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedZoneIdx !== null && canEdit) {
        // Only if not focused on an input/textarea
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        handleRemoveZone(selectedZoneIdx);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedZoneIdx, canEdit]);

  // Scroll-wheel zoom on the canvas
  const handleCanvasWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey) return; // only zoom on Ctrl+scroll
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => prev === null ? null : Math.min(3, Math.max(0.2, +(prev + delta).toFixed(2))));
  }, []);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Sidebar open state (mobile)
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ── Load only the saved zones (not all panel zones automatically) ───────
  useEffect(() => {
    if (!selectedPanel) {
      setLocalZones([]);
      setIsDirty(false);
      setSelectedZoneIdx(null);
      return;
    }
    const saved = panelMap?.zones ?? [];
    // Only load zones that were explicitly saved — don't auto-populate all panel zones
    setLocalZones(buildZonesFromSaved(selectedPanel.serial, saved));
    setIsDirty(false);
    setSelectedZoneIdx(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPanel?.serial, selectedPanel?.zoneCount, panelMap]);

  // ── Zone alarm state (live from PanelsContext) ───────────────────────────
  const getZoneIndexFromId = (zoneId: string) => {
    const parts = zoneId.split('-Z');
    if (parts.length > 1) {
      const zNum = parseInt(parts[1], 10);
      if (!isNaN(zNum)) return zNum - 1;
    }
    return -1;
  };

  const zoneIsAlarm = useCallback(
    (zoneId: string): boolean => {
      const idx = getZoneIndexFromId(zoneId);
      if (idx === -1) return false;
      return selectedPanel?.zones?.[idx] === 2 || selectedPanel?.zones?.[idx] === true;
    },
    [selectedPanel]
  );
  
  const zoneIsIsolated = useCallback(
    (zoneId: string): boolean => {
      const idx = getZoneIndexFromId(zoneId);
      if (idx === -1) return false;
      return selectedPanel?.zones?.[idx] === 5;
    },
    [selectedPanel]
  );
  const anyAlarm = Boolean(selectedPanel?.alarm);

  // ── Zone change handler ──────────────────────────────────────────────────
  const handleZoneChange = useCallback(
    (idx: number, updated: Pick<ZoneLayout, "points">) => {
      setLocalZones((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], ...updated };
        return next;
      });
      setIsDirty(true);
    },
    []
  );

  // ── Save layout ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedPanelId) return;
    await saveLayout(selectedPanelId, localZones);
    setIsDirty(false);
    setSelectedZoneIdx(null);
  };

  // ── Discard changes ─────────────────────────────────────────
  const handleDiscard = () => {
    if (!selectedPanel) return;
    const saved = panelMap?.zones ?? [];
    setLocalZones(buildZonesFromSaved(selectedPanel.serial, saved));
    setIsDirty(false);
    setSelectedZoneIdx(null);
  };

  // ── Add a single zone box ───────────────────────────────────────
  const handleAddZone = () => {
    if (!selectedPanel) return;
    const maxZones = selectedPanel.zoneCount ?? 8;
    if (localZones.length >= maxZones) return;
    const nextNum = localZones.length + 1;
    const zoneId = `${selectedPanel.serial}-Z${nextNum}`;
    const label = `${selectedPanel.serial} \u2014 Zone ${nextNum}`;
    const newZone: ZoneLayout = { zoneId, label, ...newZonePos(localZones.length) };
    setLocalZones((prev) => [...prev, newZone]);
    setIsDirty(true);
    setSelectedZoneIdx(localZones.length);
  };

  // ── Remove a single zone box ────────────────────────────────────
  const handleRemoveZone = (idx: number) => {
    setLocalZones((prev) => prev.filter((_, i) => i !== idx));
    setSelectedZoneIdx(null);
    setIsDirty(true);
  };

  // ── File validation ──────────────────────────────────────────────────────
  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Unsupported format. Please upload JPG, PNG, WebP, or SVG.";
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      return `File too large. Maximum size is ${MAX_FILE_MB} MB.`;
    }
    return null;
  };

  // ── Upload handlers ──────────────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPanelId) return;
    setUploadError(null);
    const err = validateFile(file);
    if (err) { setUploadError(err); return; }
    try {
      await uploadMap(file, selectedPanelId);
    } catch (ex) {
      setUploadError("Upload failed. Please try again.");
      console.error(ex);
    }
    e.target.value = "";
  };

  const handleReplaceSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPanelId || !panelMap) return;
    setUploadError(null);
    const err = validateFile(file);
    if (err) { setUploadError(err); return; }
    try {
      await replaceMap(file, selectedPanelId, panelMap.imagePath);
    } catch (ex) {
      setUploadError("Replace failed. Please try again.");
      console.error(ex);
    }
    e.target.value = "";
  };

  // Deselect zone when clicking the canvas background
  const handleCanvasClick = () => setSelectedZoneIdx(null);

  // ── Render: No panel selected ────────────────────────────────────────────
  const renderEmptyCanvas = () => (
    <div className="flex flex-1 items-center justify-center h-full min-h-[400px]">
      <div className="text-center space-y-4 max-w-[260px]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[12px] bg-[var(--surface-raised)] border border-[var(--border-subtle)]">
          <Map className="h-8 w-8 text-[var(--text-quaternary)]" />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-[var(--text-primary)]">
            Select a Panel
          </p>
          <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
            Choose a panel from the list to view or configure its zone map.
          </p>
        </div>
      </div>
    </div>
  );

  // ── Render: Loading ──────────────────────────────────────────────────────
  const renderLoading = () => (
    <div className="flex flex-1 items-center justify-center h-full min-h-[400px]">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--text-tertiary)]" />
    </div>
  );

  // ── Render: Upload prompt ────────────────────────────────────────────────
  const renderUploadPrompt = () => (
    <div className="flex flex-1 items-center justify-center h-full min-h-[400px] p-6">
      <div className="text-center space-y-5 w-full max-w-sm">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[16px] bg-[var(--surface-raised)] border-2 border-dashed border-[var(--border-default)]">
          <Upload className="h-9 w-9 text-[var(--text-tertiary)]" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-[var(--text-primary)]">
            No map configured
          </p>
          <p className="mt-1.5 text-[12px] text-[var(--text-secondary)]">
            Upload a floor plan or site layout image. Supported: JPG, PNG, SVG, WebP &mdash; max {MAX_FILE_MB} MB.
          </p>
        </div>

        {uploadError && (
          <div className="flex items-center gap-2 rounded-[6px] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-3 py-2 text-[12px] text-[var(--color-error)]">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {uploadError}
          </div>
        )}

        {/* Hidden file input — no <form> tag, controlled via ref */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-[13px] rounded-[6px]"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? "Uploading…" : "Upload Floor Plan"}
        </button>
      </div>
    </div>
  );

  // ── Render: Read-only no-map ─────────────────────────────────────────────
  const renderReadOnlyNoMap = () => (
    <div className="flex flex-1 items-center justify-center h-full min-h-[400px]">
      <div className="text-center space-y-3 max-w-[260px]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[12px] bg-[var(--surface-raised)] border border-[var(--border-subtle)]">
          <ImageOff className="h-8 w-8 text-[var(--text-quaternary)]" />
        </div>
        <p className="text-[14px] font-semibold text-[var(--text-primary)]">
          No map configured
        </p>
        <p className="text-[12px] text-[var(--text-secondary)]">
          No floor plan has been uploaded for this panel yet.
        </p>
      </div>
    </div>
  );

  // ── Render: Map canvas with zones ────────────────────────────────────────
  const renderMapCanvas = () => (
    <div className="flex flex-col flex-1 min-h-0 p-4 gap-3">
      {/* Controls bar */}
      {canEdit && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Replace Map button */}
            <input
              ref={replaceInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleReplaceSelect}
            />
            <button
              onClick={() => replaceInputRef.current?.click()}
              disabled={uploading || saving}
              className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-[6px]"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {uploading ? "Replacing…" : "Replace Map"}
            </button>

            {/* Remove Map button */}
            {!removeConfirm ? (
              <button
                onClick={() => setRemoveConfirm(true)}
                disabled={uploading || saving}
                className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-[6px] border-[var(--status-danger-border)] text-[var(--color-error)] hover:bg-[var(--status-danger-bg)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove Map
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[var(--color-error)] font-semibold">Remove map? This cannot be undone.</span>
                <button
                  onClick={async () => {
                    if (selectedPanelId && panelMap?.imagePath) {
                      await removeMap(selectedPanelId, panelMap.imagePath);
                    }
                    setRemoveConfirm(false);
                  }}
                  disabled={uploading}
                  className="btn-secondary inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-[6px] border-[var(--status-danger-border)] text-[var(--color-error)] hover:bg-[var(--status-danger-bg)]"
                >
                  {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Yes, remove
                </button>
                <button
                  onClick={() => setRemoveConfirm(false)}
                  className="btn-secondary inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-[6px]"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Add Zone button */}
            {localZones.length < (selectedPanel?.zoneCount ?? 0) && (
              <button
                onClick={handleAddZone}
                disabled={saving}
                className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-[6px] border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-muted)]"
              >
                <PlusSquare className="h-3.5 w-3.5" />
                Add Zone ({localZones.length}/{selectedPanel?.zoneCount ?? 0})
              </button>
            )}

            {/* Delete Selected Zone button */}
            {selectedZoneIdx !== null && (
              <button
                onClick={() => handleRemoveZone(selectedZoneIdx)}
                disabled={saving}
                className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-[6px] text-[var(--color-error)] hover:bg-[var(--status-danger-bg)] border-[var(--status-danger-border)]"
                title="Delete Selected Zone (Del)"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Selected
              </button>
            )}

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-[var(--surface-overlay)] border border-[var(--border-default)] rounded-[6px] p-0.5 ml-2">
              <button
                onClick={() => setZoom((z) => Math.max(0.2, +(z - 0.1).toFixed(2)))}
                className="p-1 hover:bg-[var(--surface-hover)] rounded-[4px] text-[var(--text-secondary)]"
                title="Zoom Out"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setZoom(fitZoom)}
                className="p-1 hover:bg-[var(--surface-hover)] rounded-[4px] text-[var(--text-secondary)]"
                title="Fit to Screen"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
                className="p-1 hover:bg-[var(--surface-hover)] rounded-[4px] text-[var(--text-secondary)]"
                title="Zoom In"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <span className="text-[10px] text-[var(--text-quaternary)] px-1 font-medium w-8 text-center">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Dirty state controls */}
            {isDirty && (
              <>
                <button
                  onClick={handleDiscard}
                  disabled={saving}
                  className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-[6px]"
                >
                  <X className="h-3.5 w-3.5" />
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-[6px]"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {saving ? "Saving…" : "Save Layout"}
                </button>
              </>
            )}
          </div>

          {uploadError && (
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-error)]">
              <AlertTriangle className="h-3.5 w-3.5" />
              {uploadError}
            </div>
          )}

          {/* Info tip */}
          <div className="flex items-center gap-1 text-[10px] text-[var(--text-quaternary)]">
            <Info className="h-3 w-3" />
            <span>Drag to move &middot; Drag vertices to reshape &middot; Hover edge + drag to add a bend &middot; Double-click vertex to remove it &middot; Select a zone and press Delete to remove</span>
          </div>
        </div>
      )}

      {/* Alarm upload error display for non-edit roles */}
      {!canEdit && uploadError && (
        <div className="flex items-center gap-2 rounded-[6px] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-3 py-2 text-[12px] text-[var(--color-error)]">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {uploadError}
        </div>
      )}

      {/* Map image + zone overlay */}
      <div
        ref={canvasScrollRef}
        className={`relative flex-1 min-h-[300px] rounded-[8px] border-2 overflow-auto ${
          anyAlarm
            ? "map-border-alarm"
            : "border-[var(--border-default)]"
        }`}
        style={{ background: "var(--surface-overlay)" }}
        onClick={handleCanvasClick}
        onWheel={handleCanvasWheel}
      >
        {zoom === null && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--surface-overlay)] rounded-[8px]">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--text-tertiary)]" />
          </div>
        )}
        {/* Inner wrapper: explicitly sized so scrollbars work correctly and zones scale natively */}
        <div
          className={`relative origin-top-left mx-auto ${isAnimating ? "transition-all duration-100 ease-out" : ""}`}
          style={{ 
            width: mapImageRef.current?.naturalWidth && zoom !== null ? mapImageRef.current.naturalWidth * zoom : 0,
            height: mapImageRef.current?.naturalHeight && zoom !== null ? mapImageRef.current.naturalHeight * zoom : 0,
            opacity: zoom === null ? 0 : 1,
            overflow: zoom === null ? "hidden" : "visible",
          }}
        >
          {/* Floor plan image */}
          <img
            ref={mapImageRef}
            src={panelMap!.imageUrl}
            alt="Floor plan"
            draggable={false}
            onLoad={applyFitZoom}
            className="block select-none"
            style={{ width: "100%", height: "100%", display: "block", userSelect: "none" }}
          />

          {/* Zone SVG overlay — absolute-positioned, spans the full image */}
          <div
            ref={containerRef}
            className="absolute inset-0"
            style={{ pointerEvents: "none" }}
          >
          <svg
            ref={svgRef}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
            style={{ pointerEvents: canEdit ? "all" : "none", overflow: "visible", touchAction: canEdit ? "none" : "auto" }}
            onClick={handleCanvasClick}
          >
            {localZones.map((zone, idx) => {
              const isOrphan =
                selectedPanel !== null && idx >= (selectedPanel.zoneCount ?? 0);
              const zoneIdx = zone.zoneId ? parseInt(zone.zoneId.split('-Z')[1] || '0', 10) - 1 : idx;

              return (
                <ZonePoly
                  key={zone.zoneId}
                  zone={zone}
                  isAlarm={zoneIsAlarm(zone.zoneId)}
                  isIsolated={zoneIsIsolated(zone.zoneId)}
                  isEvacuatePulse={selectedPanel?.zones?.[5] === 2 || selectedPanel?.zones?.[5] === true}
                  additionalLabel={(zoneIsAlarm(zone.zoneId) && zoneIdx === 4) ? " (Earth Fault)" : (zoneIsAlarm(zone.zoneId) && zoneIdx === 5) ? " (Evacuate)" : (zoneIsAlarm(zone.zoneId) && zoneIdx === 6) ? " (Low Battery)" : ""}
                  isSelected={selectedZoneIdx === idx}
                  isReadOnly={!canEdit}
                  isOrphan={isOrphan}
                  svgRef={svgRef}
                  onSelect={() => setSelectedZoneIdx(idx)}
                  onChange={(updated) => handleZoneChange(idx, updated)}
                  onRemove={canEdit ? () => handleRemoveZone(idx) : undefined}
                />
              );
            })}
          </svg>
          </div>
      </div>
    </div>

      {/* Zone legend strip */}
      <div className="flex items-center gap-3 flex-wrap text-[10px] text-[var(--text-quaternary)]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-[2px] bg-[rgba(30,107,138,0.25)] border border-[rgba(30,107,138,0.55)]" />
          <span>Normal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-[2px] bg-[var(--color-error)] border border-[rgba(209,52,56,0.8)]" />
          <span>Alarm</span>
        </div>
        {canEdit && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-[2px] bg-[var(--accent-muted)] border-2 border-[var(--accent)]" />
            <span>Selected</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-[2px] bg-[rgba(209,52,56,0.08)] border border-dashed border-[rgba(209,52,56,0.6)] opacity-60" />
          <span>Orphaned</span>
        </div>
      </div>
    </div>
  );

  // ── Decide what the canvas area shows ────────────────────────────────────
  const renderCanvas = () => {
    if (!selectedPanelId) return renderEmptyCanvas();
    if (mapLoading) return renderLoading();
    if (!panelMap || !panelMap.imageUrl) {
      return canEdit ? renderUploadPrompt() : renderReadOnlyNoMap();
    }
    return renderMapCanvas();
  };

  // ── Alarm strip banner (when in alarm, always visible) ───────────────────
  const renderAlarmBanner = () => {
    if (!anyAlarm || !selectedPanel) return null;
    const alarmZones = selectedPanel.zones
      ?.map((on, i) => (on ? i + 1 : null))
      .filter(Boolean) as number[];
    return (
      <div className="flex items-center gap-3 rounded-[6px] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-4 py-2.5 mx-4 mt-3">
        <AlertTriangle className="h-4 w-4 text-[var(--color-error)] flex-shrink-0 animate-pulse" />
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-[var(--color-error)]">
            FIRE ALARM — {formatPanelName(selectedPanel.name || "", selectedPanel.panelType)}
          </p>
          <p className="text-[11px] text-[var(--status-danger-text)] mt-0.5">
            Active zones:{" "}
            {alarmZones.length > 0
              ? alarmZones.map((z) => `Zone ${z}`).join(", ")
              : "—"}
          </p>
        </div>
      </div>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="flex relative h-[calc(100vh-72px)] overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8 -my-8">
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden absolute inset-0 bg-black/40 z-30 transition-opacity" 
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Left: Panel Selector ──────────────────────────────────────────── */}
      <aside
        className={`absolute z-40 inset-y-0 left-0 lg:static flex flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-overlay)] transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0 w-[260px]" : "-translate-x-full w-[260px] lg:w-0 lg:min-w-0"
        } lg:translate-x-0 lg:min-w-[260px] h-full shadow-2xl lg:shadow-none`}
      >
        {/* Sidebar header */}
        <div className="border-b border-[var(--border-subtle)] px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <List className="h-4 w-4 text-[var(--text-tertiary)]" />
              <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">
                Panels
              </h2>
            </div>
            <span className="text-[10px] font-medium text-[var(--text-quaternary)] bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-full px-2 py-0.5">
              {panels.length}
            </span>
          </div>
          {/* Search */}
          <input
            type="search"
            placeholder="Search panels…"
            value={panelSearch}
            onChange={(e) => setPanelSearch(e.target.value)}
            className="control-field w-full rounded-[6px] px-3 py-1.5 text-[12px] h-8"
          />
        </div>

        {/* Panel list */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {panelsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--text-quaternary)]" />
            </div>
          ) : filteredPanels.length === 0 ? (
            <div className="py-8 text-center">
              <RadioTower className="mx-auto h-6 w-6 text-[var(--text-quaternary)] mb-2" />
              <p className="text-[11px] text-[var(--text-secondary)]">
                {panelSearch ? "No panels match your search" : "No panels available"}
              </p>
            </div>
          ) : (
            filteredPanels.map((panel) => (
              <PanelListItem
                key={panel.serial}
                panel={panel}
                isSelected={selectedPanelId === panel.serial}
                onClick={() => {
                  setSelectedPanelId(panel.serial);
                  setSidebarOpen(false); // auto-collapse on mobile
                }}
              />
            ))
          )}
        </div>
      </aside>

      {/* ── Right: Map Canvas ─────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-[var(--surface-base)]">
        {/* Canvas header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile toggle */}
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="lg:hidden flex h-8 w-8 items-center justify-center rounded-[6px] border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] flex-shrink-0"
              aria-label="Toggle panel list"
            >
              <List className="h-4 w-4" />
            </button>

            {selectedPanel ? (
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-semibold text-[var(--text-primary)] truncate">
                    {formatPanelName(selectedPanel.name || "", selectedPanel.panelType)}
                  </p>
                </div>
                <div className="mt-1">
                  <p className="text-[11px] text-[var(--text-secondary)] font-mono">
                    {selectedPanel.serial} &middot; {selectedPanel.zoneCount}{" "}
                    zone{selectedPanel.zoneCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-[13px] font-medium text-[var(--text-secondary)]">
                Select a panel to view its map
              </p>
            )}
          </div>

          {/* Status chips */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {selectedPanel && (
              <Link
                to={`/panel/${selectedPanel.serial}`}
                className="inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-1 text-[11px] font-semibold text-[var(--text-primary)] transition-all hover:bg-[var(--surface-hover)] mr-2"
              >
                <RadioTower className="h-3 w-3" />
                View Panel
              </Link>
            )}
            {selectedPanel && canEdit && (
              !deletePanelConfirm ? (
                <button
                  onClick={() => setDeletePanelConfirm(true)}
                  disabled={isDeletingPanel}
                  className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1 text-[11px] rounded-[6px] border-[var(--status-danger-border)] text-[var(--color-error)] hover:bg-[var(--status-danger-bg)]"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete Panel
                </button>
              ) : (
                <div className="flex items-center gap-1.5 bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] rounded-[6px] p-1">
                  <span className="text-[10px] text-[var(--color-error)] font-semibold px-1">Delete fully?</span>
                  <button
                    onClick={async () => {
                      if (!selectedPanel) return;
                      try {
                        setIsDeletingPanel(true);
                        await PanelService.deletePanel(selectedPanel.serial);
                        setSelectedPanelId(null);
                        setDeletePanelConfirm(false);
                      } catch (err) {
                        console.error("Failed to delete panel", err);
                      } finally {
                        setIsDeletingPanel(false);
                      }
                    }}
                    disabled={isDeletingPanel}
                    className="btn-primary inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-[4px] bg-[var(--color-error)] border-none text-white hover:bg-[var(--color-error)]/90"
                  >
                    {isDeletingPanel ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm"}
                  </button>
                  <button
                    onClick={() => setDeletePanelConfirm(false)}
                    disabled={isDeletingPanel}
                    className="btn-secondary inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-[4px]"
                  >
                    Cancel
                  </button>
                </div>
              )
            )}
            
            {selectedPanel && anyAlarm && (
              <span className="badge-alarm animate-pulse">
                <AlertTriangle className="h-3 w-3" />
                Alarm
              </span>
            )}
            {selectedPanel && !anyAlarm && (
              <span className="badge-online">All Clear</span>
            )}
            {isDirty && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-warning)] uppercase tracking-wide">
                Unsaved
              </span>
            )}
          </div>
        </div>

        {/* Alarm banner */}
        {renderAlarmBanner()}

        {/* Canvas content */}
        <div className="flex flex-col flex-1 min-h-0 overflow-auto">
          {renderCanvas()}
        </div>
      </div>
    </div>
  );
}
