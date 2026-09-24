import { useRef, useCallback, useEffect, useState, useMemo, memo } from "react";
import { ZoneLayout, PolyPoint } from "../types";
import {
  toSvgPoints,
  polygonIsSelfIntersecting,
  polygonIsDegenerate,
  translatePolygon,
  translateEdge,
  splitEdge,
  clampPoint,
  pointInPolygon,
  distToPolygonBoundary,
  polygonCentroid,
} from "../utils/polygonGeom";

// ── Constants ─────────────────────────────────────────────────────────────────

const IS_TOUCH = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

/** Visible radius of vertex handles in SVG units (= % of container). */
const VERTEX_R = IS_TOUCH ? 1.6 : 1.1;
/** Touch hit radius of vertex handles (comfortable touch target without engulfing edges). */
const VERTEX_HIT_R = IS_TOUCH ? 2.8 : 1.8;

/** Midpoint (+) handle radius. */
const EDGE_MID_R = IS_TOUCH ? 1.3 : 0.9;
/** Touch hit radius of midpoint handle (tightly scoped so it never drowns out interior taps). */
const EDGE_MID_HIT_R = IS_TOUCH ? 1.8 : 1.3;

/** Edge translation hit line stroke width. */
const EDGE_HIT_STROKE = IS_TOUCH ? 1.6 : 1.2;

/** Minimum vertices before a vertex can be deleted. */
const MIN_VERTICES = 3;

/** Orthogonal vertex snap threshold in SVG units. */
const SNAP_T = 1.5;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ZonePolyProps {
  zone: ZoneLayout;
  /** Whether this zone is currently in fire alarm state */
  isAlarm: boolean;
  /** Whether this zone is isolated */
  isIsolated?: boolean;
  /** Whether the evacuate pulse should be applied (from Zone 6 alarm) */
  isEvacuatePulse?: boolean;
  additionalLabel?: string;
  /** Custom name for the zone from panel.zoneNames */
  customName?: string;
  /** Whether this zone is selected for editing */
  isSelected: boolean;
  /** If true, drag/resize interactions are disabled */
  isReadOnly: boolean;
  /** Whether this zone has no corresponding panel zone (orphaned) */
  isOrphan?: boolean;
  /**
   * The SVG element that this zone renders into.
   * Must be the same SVG whose viewBox is "0 0 100 100".
   */
  svgRef: React.RefObject<SVGSVGElement>;
  onSelect: () => void;
  /** Called with new points whenever the shape changes. */
  onChange: (updated: Pick<ZoneLayout, "points">) => void;
  /** Called when the user removes this zone entirely. */
  onRemove?: () => void;
}

type DragMode =
  | { type: "move"; startPts: PolyPoint[]; startX: number; startY: number }
  | { type: "vertex"; vertexIdx: number; startPts: PolyPoint[]; startX: number; startY: number }
  | { type: "edge"; edgeIdx: number; startPts: PolyPoint[]; startX: number; startY: number }
  | {
      type: "midpoint_press";
      edgeIdx: number;
      startPts: PolyPoint[];
      startX: number;
      startY: number;
      hasSplit: boolean;
      newVertexIdx?: number;
    };

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert a DOM pointer event position to SVG % coords (0–100). */
function clientToSvgPct(svg: SVGSVGElement, clientX: number, clientY: number): PolyPoint {
  const rect = svg.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * 100,
    y: ((clientY - rect.top) / rect.height) * 100,
  };
}

// ── Colour helpers ────────────────────────────────────────────────────────────

function getFill(isAlarm: boolean, isEvacuatePulse: boolean, isIsolated: boolean | undefined, isOrphan: boolean, isSelected: boolean) {
  if (isAlarm || isEvacuatePulse) return "rgba(209,52,56,0.72)";
  if (isIsolated) return "rgba(212,148,14,0.62)";
  if (isOrphan) return "rgba(209,52,56,0.08)";
  if (isSelected) return "rgba(30,107,138,0.22)";
  return "rgba(30,107,138,0.18)";
}

function getStroke(isAlarm: boolean, isEvacuatePulse: boolean, isIsolated: boolean | undefined, isOrphan: boolean, isSelected: boolean) {
  if (isAlarm || isEvacuatePulse) return "rgba(209,52,56,0.92)";
  if (isIsolated) return "rgba(212,148,14,0.85)";
  if (isOrphan) return "rgba(209,52,56,0.55)";
  if (isSelected) return "var(--accent, #1e6b8a)";
  return "rgba(30,107,138,0.55)";
}

function getAnimClass(isAlarm: boolean, isEvacuatePulse: boolean, isIsolated: boolean | undefined) {
  if (isAlarm || isEvacuatePulse) return "zone-alarm-pulse";
  if (isIsolated) return "zone-isolated-pulse";
  return "";
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * A draggable, reshapeable polygon zone rendered as an SVG shape.
 *
 * Interactions (edit mode only):
 *  - Drag body → move whole zone
 *  - Drag vertex handle → move that vertex
 *  - Drag edge line → translate the entire edge (moves both endpoints, shifts the wall)
 *  - Tap / drag midpoint (+) handle → inserts a new vertex and moves it
 *  - Double-click or double-tap vertex → delete vertex (min 3)
 */
function ZonePolyInner({
  zone,
  isAlarm,
  isIsolated,
  isEvacuatePulse = false,
  additionalLabel,
  customName,
  isSelected,
  isReadOnly,
  isOrphan = false,
  svgRef,
  onSelect,
  onChange,
}: ZonePolyProps) {
  const pts = zone.points ?? [];

  // ── Drag state ─────────────────────────────────────────────────────────────
  const dragRef = useRef<DragMode | null>(null);
  /** Snapshot of points at drag start — used for revert on invalid shape. */
  const dragStartPts = useRef<PolyPoint[]>([]);
  /** Track last tap on a vertex for mobile double-tap deletion. */
  const lastVertexTapRef = useRef<{ index: number; time: number } | null>(null);
  /** Red flash feedback when drag produces an invalid shape. */
  const [invalidFlash, setInvalidFlash] = useState(false);
  const invalidTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** rAF guard for throttled pointer move processing. */
  const rafRef = useRef<number | null>(null);
  const pendingMoveRef = useRef<PointerEvent | null>(null);
  /** Track the last pointer type for hybrid device handling. */
  const lastPointerTypeRef = useRef<string>("mouse");

  // ── Coordinate conversion ─────────────────────────────────────────────────
  const toSvgPct = useCallback((e: React.PointerEvent | PointerEvent): PolyPoint => {
    if (!svgRef.current) return { x: 0, y: 0 };
    return clientToSvgPct(svgRef.current, e.clientX, e.clientY);
  }, [svgRef]);

  /** Flash red border briefly on invalid polygon state. */
  const flashInvalid = useCallback(() => {
    setInvalidFlash(true);
    if (invalidTimerRef.current) clearTimeout(invalidTimerRef.current);
    invalidTimerRef.current = setTimeout(() => setInvalidFlash(false), 300);
  }, []);

  // ── Validate and commit a candidate set of points ─────────────────────────
  const tryCommit = useCallback((candidate: PolyPoint[]) => {
    if (candidate.length < MIN_VERTICES) { flashInvalid(); return false; }
    if (polygonIsSelfIntersecting(candidate)) { flashInvalid(); return false; }
    if (polygonIsDegenerate(candidate)) { flashInvalid(); return false; }
    onChange({ points: candidate });
    return true;
  }, [onChange, flashInvalid]);

  // ── Global pointer events ─────────────────────────────────────────────────
  /** Process the actual pointer move logic (called inside rAF). */
  const processPointerMove = useCallback((e: PointerEvent) => {
    const ds = dragRef.current;
    if (!ds || !svgRef.current) return;
    const cur = clientToSvgPct(svgRef.current, e.clientX, e.clientY);

    if (ds.type === "move") {
      const dx = cur.x - ds.startX;
      const dy = cur.y - ds.startY;
      const candidate = translatePolygon(ds.startPts, dx, dy);
      onChange({ points: candidate });
    } else if (ds.type === "vertex") {
      let clamped = clampPoint(cur);

      // Dynamic snapping for straight lines
      const prev = ds.startPts[(ds.vertexIdx - 1 + ds.startPts.length) % ds.startPts.length];
      const next = ds.startPts[(ds.vertexIdx + 1) % ds.startPts.length];
      if (Math.abs(clamped.x - prev.x) < SNAP_T) clamped.x = prev.x;
      if (Math.abs(clamped.y - prev.y) < SNAP_T) clamped.y = prev.y;
      if (Math.abs(clamped.x - next.x) < SNAP_T) clamped.x = next.x;
      if (Math.abs(clamped.y - next.y) < SNAP_T) clamped.y = next.y;

      const candidate = ds.startPts.map((p, i) =>
        i === ds.vertexIdx ? clamped : p
      );
      tryCommit(candidate);
    } else if (ds.type === "edge") {
      const dx = cur.x - ds.startX;
      const dy = cur.y - ds.startY;
      const candidate = translateEdge(ds.startPts, ds.edgeIdx, dx, dy);
      tryCommit(candidate);
    } else if (ds.type === "midpoint_press") {
      const dist = Math.hypot(cur.x - ds.startX, cur.y - ds.startY);
      if (!ds.hasSplit && dist > 1.2) {
        const withNew = splitEdge(ds.startPts, ds.edgeIdx, 0.5);
        const newIdx = ds.edgeIdx + 1;
        ds.hasSplit = true;
        ds.newVertexIdx = newIdx;
        ds.startPts = withNew;
        dragStartPts.current = withNew;
        onChange({ points: withNew });
      }
      if (ds.hasSplit && ds.newVertexIdx !== undefined) {
        let clamped = clampPoint(cur);
        const candidate = ds.startPts.map((p, i) =>
          i === ds.newVertexIdx ? clamped : p
        );
        tryCommit(candidate);
      }
    }
  }, [svgRef, tryCommit, onChange]);

  /** rAF-throttled pointer move — processes only the latest event per frame. */
  const handleGlobalPointerMove = useCallback((e: PointerEvent) => {
    pendingMoveRef.current = e;
    if (rafRef.current !== null) return; // already scheduled
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const pending = pendingMoveRef.current;
      if (!pending) return;
      pendingMoveRef.current = null;
      processPointerMove(pending);
    });
  }, [processPointerMove]);

  const handleGlobalPointerUp = useCallback((e: PointerEvent) => {
    window.removeEventListener("pointermove", handleGlobalPointerMove);
    window.removeEventListener("pointerup", handleGlobalPointerUp);
    window.removeEventListener("pointercancel", handleGlobalPointerUp);

    const ds = dragRef.current;
    if (ds && ds.type === "midpoint_press" && !ds.hasSplit) {
      // Deliberate tap/click on (+) button without dragging -> cleanly insert vertex at midpoint
      const withNew = splitEdge(ds.startPts, ds.edgeIdx, 0.5);
      tryCommit(withNew);
    }

    dragRef.current = null;
    dragStartPts.current = [];
    try {
      (e.target as Element)?.releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignore if already released
    }
  }, [handleGlobalPointerMove, tryCommit]);

  // Clean up global listeners and animation frames on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handleGlobalPointerMove);
      window.removeEventListener("pointerup", handleGlobalPointerUp);
      window.removeEventListener("pointercancel", handleGlobalPointerUp);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (invalidTimerRef.current) clearTimeout(invalidTimerRef.current);
    };
  }, [handleGlobalPointerMove, handleGlobalPointerUp]);

  // ── Polygon body pointer handler ──────────────────────────────────────────
  const handleBodyPointerDown = useCallback((e: React.PointerEvent) => {
    if (isReadOnly) return;
    e.stopPropagation();
    e.preventDefault();
    lastPointerTypeRef.current = e.pointerType;
    onSelect();
    const cur = toSvgPct(e);

    // Reliable whole-body move drag (no accidental vertex splits)
    dragStartPts.current = [...pts];
    dragRef.current = {
      type: "move",
      startPts: [...pts],
      startX: cur.x,
      startY: cur.y,
    };
    try {
      (e.target as Element)?.setPointerCapture?.(e.pointerId);
    } catch {
      // Ignore
    }
    window.addEventListener("pointermove", handleGlobalPointerMove);
    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerUp);
  }, [isReadOnly, pts, toSvgPct, onSelect, handleGlobalPointerMove, handleGlobalPointerUp]);

  // ── Edge translation pointer handler ──────────────────────────────────────
  const handleEdgePointerDown = useCallback((e: React.PointerEvent, edgeIdx: number) => {
    if (isReadOnly) return;
    e.stopPropagation();
    e.preventDefault();
    lastPointerTypeRef.current = e.pointerType;
    onSelect();
    const cur = toSvgPct(e);

    // If the touch is inside the polygon (away from the boundary line), prioritize body movement
    if (pointInPolygon(cur, pts) && distToPolygonBoundary(cur, pts) > 1.0) {
      handleBodyPointerDown(e);
      return;
    }

    // Translate the edge (shifts wall without adding vertices)
    dragStartPts.current = [...pts];
    dragRef.current = {
      type: "edge",
      edgeIdx,
      startPts: [...pts],
      startX: cur.x,
      startY: cur.y,
    };
    try {
      (e.target as Element)?.setPointerCapture?.(e.pointerId);
    } catch {
      // Ignore
    }
    window.addEventListener("pointermove", handleGlobalPointerMove);
    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerUp);
  }, [isReadOnly, pts, toSvgPct, onSelect, handleBodyPointerDown, handleGlobalPointerMove, handleGlobalPointerUp]);

  // ── Edge midpoint (+) handle pointer handler ──────────────────────────────
  const handleInsertVertexPointerDown = useCallback((e: React.PointerEvent, edgeIdx: number) => {
    if (isReadOnly) return;
    e.stopPropagation();
    e.preventDefault();
    lastPointerTypeRef.current = e.pointerType;
    onSelect();
    const cur = toSvgPct(e);

    // If the touch is inside the polygon (away from boundary), prioritize body movement
    if (pointInPolygon(cur, pts) && distToPolygonBoundary(cur, pts) > 1.0) {
      handleBodyPointerDown(e);
      return;
    }

    // Midpoint touch armed:
    // - Tap without drag -> inserts vertex at midpoint on pointerup
    // - Outward drag (> 1.2 units) -> splits edge and pulls new vertex
    // Never splits immediately on pointerdown!
    dragStartPts.current = [...pts];
    dragRef.current = {
      type: "midpoint_press",
      edgeIdx,
      startPts: [...pts],
      startX: cur.x,
      startY: cur.y,
      hasSplit: false,
    };
    try {
      (e.target as Element)?.setPointerCapture?.(e.pointerId);
    } catch {
      // Ignore
    }
    window.addEventListener("pointermove", handleGlobalPointerMove);
    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerUp);
  }, [isReadOnly, pts, toSvgPct, onSelect, handleBodyPointerDown, handleGlobalPointerMove, handleGlobalPointerUp]);

  // ── Vertex handle pointer handlers ────────────────────────────────────────
  const handleVertexPointerDown = useCallback((e: React.PointerEvent, vertexIdx: number) => {
    if (isReadOnly) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    lastPointerTypeRef.current = e.pointerType;

    // Software double-tap detection ONLY for touch (prevents double-delete on hybrid devices)
    if (e.pointerType === "touch") {
      const now = Date.now();
      if (
        lastVertexTapRef.current &&
        lastVertexTapRef.current.index === vertexIdx &&
        now - lastVertexTapRef.current.time < 350
      ) {
        lastVertexTapRef.current = null;
        if (pts.length > MIN_VERTICES) {
          const next = pts.filter((_, idx) => idx !== vertexIdx);
          onChange({ points: next });
          return;
        }
      }
      lastVertexTapRef.current = { index: vertexIdx, time: now };
    }

    const cur = toSvgPct(e);
    dragStartPts.current = [...pts];
    dragRef.current = {
      type: "vertex",
      vertexIdx,
      startPts: [...pts],
      startX: cur.x,
      startY: cur.y,
    };
    try {
      (e.target as Element)?.setPointerCapture?.(e.pointerId);
    } catch {
      // Ignore
    }
    window.addEventListener("pointermove", handleGlobalPointerMove);
    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerUp);
  }, [isReadOnly, pts, toSvgPct, onSelect, onChange, handleGlobalPointerMove, handleGlobalPointerUp]);

  const handleVertexDblClick = useCallback((e: React.MouseEvent, vertexIdx: number) => {
    if (isReadOnly) return;
    e.stopPropagation();
    // Only handle double-click for mouse/pen — touch uses software double-tap above
    if (lastPointerTypeRef.current === "touch") return;
    if (pts.length <= MIN_VERTICES) return;
    const next = pts.filter((_, i) => i !== vertexIdx);
    onChange({ points: next });
  }, [isReadOnly, pts, onChange]);

  // ── Visual state ──────────────────────────────────────────────────────────
  const baseFill = getFill(isAlarm, isEvacuatePulse, isIsolated, isOrphan, isSelected);
  const baseStroke = getStroke(isAlarm, isEvacuatePulse, isIsolated, isOrphan, isSelected);
  const fill = invalidFlash ? "rgba(239, 68, 68, 0.25)" : baseFill;
  const stroke = invalidFlash ? "rgba(239, 68, 68, 0.9)" : baseStroke;
  const animClass = getAnimClass(isAlarm, isEvacuatePulse, isIsolated);
  const strokeWidth = invalidFlash ? 0.8 : isSelected ? 0.6 : 0.4;
  const strokeDasharray = isOrphan ? "1.2,0.8" : undefined;

  // Memoized geometry: centroid for label positioning, bbox for orphan badge
  const centroid = useMemo(() =>
    pts.length > 0 ? polygonCentroid(pts) : { x: 50, y: 50 },
    [pts]
  );
  const zoneNumber = zone.zoneId.split("-Z")[1] || zone.label;
  const labelText = customName ? `${customName} (Z${zoneNumber})${additionalLabel ?? ""}` : `Zone ${zoneNumber}${additionalLabel ?? ""}`;

  if (pts.length < 3) return null; // Cannot render degenerate zone

  return (
    <g
      className={animClass}
      style={{ cursor: isReadOnly ? "default" : "move" }}
    >
      {/* ── Polygon fill & body ── */}
      <polygon
        points={toSvgPoints(pts)}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        style={{
          pointerEvents: isReadOnly ? "none" : "all",
          touchAction: "none",
          transition: isAlarm ? "none" : "fill 200ms ease, stroke 200ms ease",
        }}
        onPointerDown={handleBodyPointerDown}
        onClick={(e) => { e.stopPropagation(); if (!isReadOnly) onSelect(); }}
      />

      {/* ── Zone label ── */}
      <text
        x={centroid.x}
        y={centroid.y}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        style={{
          fontSize: "2.4",
          fontWeight: 700,
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          pointerEvents: "none",
          userSelect: "none",
          mixBlendMode: "difference",
          letterSpacing: "-0.01em",
        }}
      >
        {labelText}
      </text>

      {/* ── Editing handles (only when selected) ── */}
      {isSelected && !isReadOnly && (
        <>
          {/* 1. Interactive Edge Hit-lines (Drag to translate edge) */}
          {pts.map((pt, i) => {
            const nextPt = pts[(i + 1) % pts.length];
            return (
              <line
                key={`edge-hit-${i}`}
                x1={pt.x}
                y1={pt.y}
                x2={nextPt.x}
                y2={nextPt.y}
                stroke="transparent"
                strokeWidth={EDGE_HIT_STROKE}
                strokeLinecap="round"
                style={{ cursor: "move", pointerEvents: "all", touchAction: "none" }}
                onPointerDown={(e) => handleEdgePointerDown(e, i)}
              />
            );
          })}

          {/* 2. Edge Midpoint (+) Handles (Tap/drag to add a bend/vertex) */}
          {pts.map((pt, i) => {
            const nextPt = pts[(i + 1) % pts.length];
            const midX = (pt.x + nextPt.x) / 2;
            const midY = (pt.y + nextPt.y) / 2;
            const plusSize = EDGE_MID_R * 0.45;

            return (
              <g
                key={`edge-midpoint-${i}`}
                style={{ cursor: "crosshair", pointerEvents: "all", touchAction: "none" }}
                onPointerDown={(e) => handleInsertVertexPointerDown(e, i)}
              >
                {/* Generous touch target */}
                <circle cx={midX} cy={midY} r={EDGE_MID_HIT_R} fill="transparent" />
                {/* Midpoint circle indicator */}
                <circle
                  cx={midX}
                  cy={midY}
                  r={EDGE_MID_R}
                  fill="white"
                  stroke="var(--accent, #0284c7)"
                  strokeWidth={0.35}
                />
                {/* Plus (+) icon */}
                <line
                  x1={midX - plusSize}
                  y1={midY}
                  x2={midX + plusSize}
                  y2={midY}
                  stroke="var(--accent, #0284c7)"
                  strokeWidth={0.32}
                  strokeLinecap="round"
                />
                <line
                  x1={midX}
                  y1={midY - plusSize}
                  x2={midX}
                  y2={midY + plusSize}
                  stroke="var(--accent, #0284c7)"
                  strokeWidth={0.32}
                  strokeLinecap="round"
                />
              </g>
            );
          })}

          {/* 3. Vertex Handles (Drag to reshape, double-tap/click to delete) */}
          {pts.map((pt, i) => (
            <g
              key={`vertex-${i}`}
              style={{ cursor: "grab", pointerEvents: "all", touchAction: "none" }}
              onPointerDown={(e) => handleVertexPointerDown(e, i)}
              onDoubleClick={(e) => handleVertexDblClick(e, i)}
            >
              {/* Invisible large touch hit area */}
              <circle cx={pt.x} cy={pt.y} r={VERTEX_HIT_R} fill="transparent" />
              {/* Visible vertex handle */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={VERTEX_R}
                fill="white"
                stroke="var(--accent, #0284c7)"
                strokeWidth={0.45}
              />
            </g>
          ))}
        </>
      )}

      {/* ── Orphan label badge ── */}
      {isOrphan && (
        <text
          x={centroid.x}
          y={centroid.y - 3}
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgba(209,52,56,0.85)"
          style={{
            fontSize: "1.1%",
            fontWeight: 700,
            fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
            pointerEvents: "none",
            userSelect: "none",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Orphaned
        </text>
      )}
    </g>
  );
}

/** Memoized ZonePoly — skips re-render unless visual props change. */
export const ZonePoly = memo(ZonePolyInner, (prev, next) => {
  // Return true if equal (should NOT re-render)
  if (prev.zone !== next.zone) return false;
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.isAlarm !== next.isAlarm) return false;
  if (prev.isIsolated !== next.isIsolated) return false;
  if (prev.isEvacuatePulse !== next.isEvacuatePulse) return false;
  if (prev.isOrphan !== next.isOrphan) return false;
  if (prev.isReadOnly !== next.isReadOnly) return false;
  if (prev.additionalLabel !== next.additionalLabel) return false;
  if (prev.customName !== next.customName) return false;
  return true; // All visual props unchanged — skip re-render
});
