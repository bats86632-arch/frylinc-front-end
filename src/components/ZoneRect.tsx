import { useRef, useCallback } from "react";
import { Trash2 } from "lucide-react";
import { ZoneLayout } from "../types";

interface ZoneRectProps {
  zone: ZoneLayout;
  /** Whether this zone is currently in fire alarm state */
  isAlarm: boolean;
  /** Whether this zone is isolated */
  isIsolated?: boolean;
  /** Whether this zone is selected for editing */
  isSelected: boolean;
  /** If true, drag/resize interactions are disabled */
  isReadOnly: boolean;
  /** Whether this zone has no corresponding panel zone (orphaned) */
  isOrphan?: boolean;
  /** The container element that defines the coordinate system */
  containerRef: React.RefObject<HTMLDivElement>;
  onSelect: () => void;
  onChange: (updated: Partial<ZoneLayout>) => void;
  /** Called when the user removes this zone box */
  onRemove?: () => void;
}

type ResizeHandle =
  | "n" | "s" | "e" | "w"
  | "ne" | "nw" | "se" | "sw";

/**
 * Draggable, resizable zone rectangle rendered on the map canvas.
 * Positions are stored and manipulated as percentages (0-100) of the
 * container dimensions so they are resolution-independent.
 */
export function ZoneRect({
  zone,
  isAlarm,
  isIsolated,
  isSelected,
  isReadOnly,
  isOrphan = false,
  containerRef,
  onSelect,
  onChange,
  onRemove,
}: ZoneRectProps) {
  // We track pointer state in a ref to avoid stale closures without re-renders
  const dragState = useRef<{
    startPx: number; startPy: number;
    startX: number; startY: number;
    startW: number; startH: number;
    handle: ResizeHandle | "move";
  } | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Convert a pixel offset into a percentage of the container */
  const pxToPercent = useCallback(
    (dx: number, dy: number): { dpx: number; dpy: number } => {
      const el = containerRef.current;
      if (!el) return { dpx: 0, dpy: 0 };
      const { width, height } = el.getBoundingClientRect();
      return { dpx: (dx / width) * 100, dpy: (dy / height) * 100 };
    },
    [containerRef]
  );

  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, val));

  // ── Pointer handlers ─────────────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, handle: ResizeHandle | "move") => {
      if (isReadOnly) return;
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      onSelect();
      dragState.current = {
        startPx: e.clientX,
        startPy: e.clientY,
        startX: zone.x,
        startY: zone.y,
        startW: zone.width,
        startH: zone.height,
        handle,
      };
    },
    [isReadOnly, zone, onSelect]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const ds = dragState.current;
      if (!ds) return;

      const dx = e.clientX - ds.startPx;
      const dy = e.clientY - ds.startPy;
      const { dpx, dpy } = pxToPercent(dx, dy);

      let { startX: x, startY: y, startW: w, startH: h } = ds;
      const { handle } = ds;

      const MIN_SIZE = 4; // minimum % size

      if (handle === "move") {
        x = clamp(x + dpx, 0, 100 - w);
        y = clamp(y + dpy, 0, 100 - h);
      } else {
        // Resize: adjust relevant edges
        if (handle.includes("e")) {
          w = clamp(w + dpx, MIN_SIZE, 100 - x);
        }
        if (handle.includes("w")) {
          const newW = clamp(w - dpx, MIN_SIZE, x + w);
          x = clamp(x + dpx, 0, x + w - MIN_SIZE);
          w = newW;
        }
        if (handle.includes("s")) {
          h = clamp(h + dpy, MIN_SIZE, 100 - y);
        }
        if (handle.includes("n")) {
          const newH = clamp(h - dpy, MIN_SIZE, y + h);
          y = clamp(y + dpy, 0, y + h - MIN_SIZE);
          h = newH;
        }
      }

      onChange({ x, y, width: w, height: h });
    },
    [pxToPercent, onChange]
  );

  const handlePointerUp = useCallback(() => {
    dragState.current = null;
  }, []);

  // ── Appearance ────────────────────────────────────────────────────────────

  const rectStyle: React.CSSProperties = {
    position: "absolute",
    left: `${zone.x}%`,
    top: `${zone.y}%`,
    width: `${zone.width}%`,
    height: `${zone.height}%`,
    boxSizing: "border-box",
    userSelect: "none",
    touchAction: "none",
    cursor: isReadOnly ? "default" : "move",
    // All visual state driven by classes below, but we need z-index for selection
    zIndex: isSelected ? 20 : 10,
    transition: isAlarm ? "none" : "border-color 200ms ease, background 200ms ease",
  };

  let rectClass =
    "rounded-[4px] flex items-center justify-center overflow-hidden select-none ";

  if (isAlarm) {
    // Solid red fill, white label, aggressive pulse glow
    rectClass +=
      "bg-[var(--color-error)] border-2 border-[rgba(209,52,56,0.9)] zone-alarm-pulse ";
  } else if (isIsolated) {
    // Yellow pulse
    rectClass +=
      "bg-[var(--color-warning)] border-2 border-[var(--color-warning)] zone-isolated-pulse ";
  } else if (isOrphan) {
    // Dashed red border, reduced opacity — orphaned zone warning
    rectClass +=
      "bg-[rgba(209,52,56,0.08)] border-2 border-dashed border-[rgba(209,52,56,0.6)] opacity-60 ";
  } else if (isSelected) {
    // Teal accent outline for editing state
    rectClass +=
      "bg-[var(--accent-muted)] border-2 border-[var(--accent)] shadow-[0_0_0_1px_var(--accent)] ";
  } else {
    // Normal: semi-transparent teal
    rectClass +=
      "bg-[rgba(30,107,138,0.18)] border-2 border-[rgba(30,107,138,0.55)] hover:border-[rgba(30,107,138,0.85)] hover:bg-[rgba(30,107,138,0.25)] ";
  }

  // Resize handle positions: [inset-x%, inset-y%, cursor]
  const handles: { pos: string; cursor: string; handle: ResizeHandle }[] = [
    { pos: "top-[-8px] left-[-8px]", cursor: "cursor-nw-resize", handle: "nw" },
    { pos: "top-[-8px] left-[calc(50%-8px)]", cursor: "cursor-n-resize", handle: "n" },
    { pos: "top-[-8px] right-[-8px]", cursor: "cursor-ne-resize", handle: "ne" },
    { pos: "top-[calc(50%-8px)] right-[-8px]", cursor: "cursor-e-resize", handle: "e" },
    { pos: "bottom-[-8px] right-[-8px]", cursor: "cursor-se-resize", handle: "se" },
    { pos: "bottom-[-8px] left-[calc(50%-8px)]", cursor: "cursor-s-resize", handle: "s" },
    { pos: "bottom-[-8px] left-[-8px]", cursor: "cursor-sw-resize", handle: "sw" },
    { pos: "top-[calc(50%-8px)] left-[-8px]", cursor: "cursor-w-resize", handle: "w" },
  ];

  return (
    <>
      <div
        style={rectStyle}
        className={rectClass}
        onPointerDown={(e) => handlePointerDown(e, "move")}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={(e) => { e.stopPropagation(); if (!isReadOnly) onSelect(); }}
      >
        {/* ── Resize Handles (only when selected and not read-only) ─────── */}
        {isSelected && !isReadOnly && (
          <>
            {handles.map(({ pos, cursor, handle }) => (
              <div
                key={handle}
                className={`absolute w-[16px] h-[16px] rounded-[4px] bg-white border-2 border-[var(--accent)] shadow-md ${pos} ${cursor} z-30`}
                style={{ pointerEvents: "all" }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  handlePointerDown(e, handle);
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              />
            ))}
            {/* Remove button — hovering above the top-center of the zone */}
            {onRemove && (
              <button
                className="absolute -top-8 left-1/2 -translate-x-1/2 z-40 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-error)] text-white shadow-md hover:bg-red-700 hover:scale-110 transition-all cursor-pointer"
                style={{ pointerEvents: "all" }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                title="Remove zone box"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Label (Rendered as sibling to break out of Box stacking context) ── */}
      <div
        className="absolute flex items-start justify-end pt-1 pr-1.5 mix-blend-difference"
        style={{
          left: `${zone.x}%`,
          top: `${zone.y}%`,
          width: `${zone.width}%`,
          height: `${zone.height}%`,
          zIndex: 30, // Keep above all boxes
          pointerEvents: "none",
        }}
      >
        <span
          className={`text-right font-semibold leading-none ${
            isAlarm
              ? "text-white"
              : isOrphan
              ? "text-white opacity-90"
              : "text-white"
          }`}
          style={{
            fontSize: `clamp(9px, ${Math.min(zone.width, zone.height) * 0.15}vw, 12px)`,
          }}
        >
          {isOrphan ? (
            <span className="flex flex-col items-end">
              <span className="text-[7px] uppercase tracking-wider opacity-70">
                Orphaned
              </span>
              <span>{zone.zoneId.split('-Z')[1] || zone.label}</span>
            </span>
          ) : (
            zone.zoneId.split('-Z')[1] || zone.label
          )}
        </span>
      </div>
    </>
  );
}
