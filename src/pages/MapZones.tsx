import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { usePanels } from "../hooks/usePanels";
import { usePanelMap } from "../hooks/usePanelMap";
import { ZoneRect } from "../components/ZoneRect";
import { Panel, ZoneLayout } from "../types";

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

/** Create a single new zone box at a sensible default position */
function newZonePos(existingCount: number): Pick<ZoneLayout, "x" | "y" | "width" | "height"> {
  // Stagger new zones diagonally so they don't all pile up
  const offset = (existingCount % 8) * 5;
  return { x: 5 + offset, y: 5 + offset, width: 20, height: 15 };
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
            {panel.name}
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

  // Container ref for coordinate system
  const containerRef = useRef<HTMLDivElement>(null);

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
  const zoneIsAlarm = useCallback(
    (index: number): boolean => Boolean(selectedPanel?.zones?.[index]),
    [selectedPanel]
  );
  const anyAlarm = Boolean(selectedPanel?.alarm);

  // ── Zone change handler ──────────────────────────────────────────────────
  const handleZoneChange = useCallback(
    (idx: number, updated: Partial<ZoneLayout>) => {
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
            <span>Drag to move · Drag corners to resize · Select a zone and press Delete to remove</span>
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
        className={`relative flex-1 min-h-[300px] rounded-[8px] border-2 overflow-auto ${
          anyAlarm
            ? "map-border-alarm"
            : "border-[var(--border-default)]"
        }`}
        style={{ background: "var(--surface-overlay)" }}
        onClick={handleCanvasClick}
      >
        {/* Inner wrapper: let image render at natural size so zones can cover the full image */}
        <div className="relative inline-block min-w-full">
          {/* Floor plan image — natural dimensions, no max-height clipping */}
          <img
            src={panelMap!.imageUrl}
            alt="Floor plan"
            draggable={false}
            className="block w-full select-none"
            style={{ display: "block", userSelect: "none" }}
          />

          {/* Zone rectangle overlay — absolute-positioned container matching the image */}
          <div
            ref={containerRef}
            className="absolute inset-0"
            style={{ pointerEvents: "none" }}
          >
          <div className="relative w-full h-full" style={{ pointerEvents: "none" }}>
            {localZones.map((zone, idx) => {
              // Determine if this zone index exists in the panel's actual zones
              const isOrphan =
                selectedPanel !== null && idx >= (selectedPanel.zoneCount ?? 0);

              return (
                <div
                  key={zone.zoneId}
                  style={{ pointerEvents: canEdit ? "all" : "none", position: "absolute", inset: 0 }}
                >
                  <ZoneRect
                    zone={zone}
                    isAlarm={zoneIsAlarm(idx)}
                    isSelected={selectedZoneIdx === idx}
                    isReadOnly={!canEdit}
                    isOrphan={isOrphan}
                    containerRef={containerRef as React.RefObject<HTMLDivElement>}
                    onSelect={() => setSelectedZoneIdx(idx)}
                    onChange={(updated) => handleZoneChange(idx, updated)}
                    onRemove={canEdit ? () => handleRemoveZone(idx) : undefined}
                  />
                </div>
              );
            })}
          </div>
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
    if (!panelMap) {
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
            FIRE ALARM — {selectedPanel.name}
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
                <p className="text-[14px] font-semibold text-[var(--text-primary)] truncate">
                  {selectedPanel.name}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] font-mono">
                  {selectedPanel.serial} &middot; {selectedPanel.zoneCount}{" "}
                  zone{selectedPanel.zoneCount !== 1 ? "s" : ""}
                </p>
              </div>
            ) : (
              <p className="text-[13px] font-medium text-[var(--text-secondary)]">
                Select a panel to view its map
              </p>
            )}
          </div>

          {/* Status chips */}
          <div className="flex items-center gap-2 flex-shrink-0">
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
