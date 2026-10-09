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
  distToSegment,
  projectPointOnSegment,
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

/** Orthogonal vertex snap threshold in SVG units (subtle alignment hint without sticky drag lock). */
const SNAP_T = 0.35;

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
  /**
   * When true, clicking an edge midpoint inserts a vertex there and calls
   * onVertexInserted(). When false (default), midpoint (+) buttons are hidden
   * entirely so they cannot intercept vertex or body drags.
   */
  addVertexMode?: boolean;
  /** Called immediately after a vertex is successfully inserted in addVertexMode. */
  onVertexInserted?: () => void;
}

type DragMode =
  | { type: "move"; startPts: PolyPoint[]; startX: number; startY: number }
  | { type: "vertex"; vertexIdx: number; startPts: PolyPoint[]; startX: number; startY: number }
  | { type: "edge"; edgeIdx: number; startPts: PolyPoint[]; startX: number; startY: number };

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
  addVertexMode = false,
  onVertexInserted,
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

      // Subtle dynamic snapping for straight lines (only when near orthogonal alignment)
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

  const handleGlobalPointerUp = useCallback(() => {
    window.removeEventListener("pointermove", handleGlobalPointerMove);
    window.removeEventListener("pointerup", handleGlobalPointerUp);
    window.removeEventListener("pointercancel", handleGlobalPointerUp);

    dragRef.current = null;
    dragStartPts.current = [];
  }, [handleGlobalPointerMove]);

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
    if (isReadOnly || addVertexMode) return;
    e.stopPropagation();
    e.preventDefault();
    lastPointerTypeRef.current = e.pointerType;
    onSelect();
    const cur = toSvgPct(e);

    // Reliable whole-body move drag (clean swipe on desktop & mobile)
    dragStartPts.current = [...pts];
    dragRef.current = {
      type: "move",
      startPts: [...pts],
      startX: cur.x,
      startY: cur.y,
    };
    window.addEventListener("pointermove", handleGlobalPointerMove);
    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerUp);
  }, [isReadOnly, addVertexMode, pts, toSvgPct, onSelect, handleGlobalPointerMove, handleGlobalPointerUp]);

  // ── Edge translation pointer handler (normal edit mode) ────────────────────
  const handleEdgePointerDown = useCallback((e: React.PointerEvent, edgeIdx: number) => {
    if (isReadOnly || addVertexMode) return;
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
    window.addEventListener("pointermove", handleGlobalPointerMove);
    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerUp);
  }, [isReadOnly, addVertexMode, pts, toSvgPct, onSelect, handleBodyPointerDown, handleGlobalPointerMove, handleGlobalPointerUp]);

  // ── Explicit Add-Vertex click handlers (active only when addVertexMode is true) ──
  const handleInsertVertexAtEdge = useCallback((e: React.PointerEvent, edgeIdx: number) => {
    if (isReadOnly || !addVertexMode) return;
    e.stopPropagation();
    e.preventDefault();
    const cur = toSvgPct(e);
    const n = pts.length;
    const a = pts[edgeIdx];
    const b = pts[(edgeIdx + 1) % n];

    // Project click position onto this edge segment
    let t = projectPointOnSegment(cur, a, b);
    // Clamp t to [0.08, 0.92] so vertex is not co-located with existing corners
    t = Math.max(0.08, Math.min(0.92, t));

    const newPts = splitEdge(pts, edgeIdx, t);
    if (tryCommit(newPts)) {
      onVertexInserted?.();
    }
  }, [isReadOnly, addVertexMode, pts, toSvgPct, tryCommit, onVertexInserted]);

  const handleBodyClickInAddVertexMode = useCallback((e: React.PointerEvent) => {
    if (!addVertexMode || isReadOnly) return;
    e.stopPropagation();
    e.preventDefault();
    const cur = toSvgPct(e);

    // Find closest edge to the click
    let closestEdge = 0;
    let minDist = Infinity;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      const d = distToSegment(cur, a, b);
      if (d < minDist) {
        minDist = d;
        closestEdge = i;
      }
    }
    const a = pts[closestEdge];
    const b = pts[(closestEdge + 1) % n];
    let t = projectPointOnSegment(cur, a, b);
    t = Math.max(0.08, Math.min(0.92, t));
    const newPts = splitEdge(pts, closestEdge, t);
    if (tryCommit(newPts)) {
      onVertexInserted?.();
    }
  }, [addVertexMode, isReadOnly, pts, toSvgPct, tryCommit, onVertexInserted]);

  // ── Vertex handle pointer handlers ────────────────────────────────────────
  const handleVertexPointerDown = useCallback((e: React.PointerEvent, vertexIdx: number) => {
    if (isReadOnly || addVertexMode) return;
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
    window.addEventListener("pointermove", handleGlobalPointerMove);
    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerUp);
  }, [isReadOnly, addVertexMode, pts, toSvgPct, onSelect, onChange, handleGlobalPointerMove, handleGlobalPointerUp]);

  const handleVertexDblClick = useCallback((e: React.MouseEvent, vertexIdx: number) => {
    if (isReadOnly || addVertexMode) return;
    e.stopPropagation();
    // Only handle double-click for mouse/pen — touch uses software double-tap above
    if (lastPointerTypeRef.current === "touch") return;
    if (pts.length <= MIN_VERTICES) return;
    const next = pts.filter((_, i) => i !== vertexIdx);
    onChange({ points: next });
  }, [isReadOnly, addVertexMode, pts, onChange]);

  // ── Visual state ──────────────────────────────────────────────────────────
  const baseFill = getFill(isAlarm, isEvacuatePulse, isIsolated, isOrphan, isSelected);
  const baseStroke = getStroke(isAlarm, isEvacuatePulse, isIsolated, isOrphan, isSelected);
  const fill = invalidFlash ? "rgba(239, 68, 68, 0.25)" : baseFill;
  const stroke = addVertexMode
    ? "var(--accent, #0284c7)"
    : invalidFlash
    ? "rgba(239, 68, 68, 0.9)"
    : baseStroke;
  const animClass = getAnimClass(isAlarm, isEvacuatePulse, isIsolated);
  const strokeWidth = addVertexMode ? 0.9 : invalidFlash ? 0.8 : isSelected ? 0.6 : 0.4;
  const strokeDasharray = addVertexMode ? "2,1" : isOrphan ? "1.2,0.8" : undefined;

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
      style={{ cursor: isReadOnly ? "default" : addVertexMode ? "crosshair" : "move" }}
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
        onPointerDown={addVertexMode ? handleBodyClickInAddVertexMode : handleBodyPointerDown}
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
          {addVertexMode ? (
            <>
              {/* Highlighted clickable edges + midpoint (+) badges in Add Vertex mode */}
              {pts.map((pt, i) => {
                const nextPt = pts[(i + 1) % pts.length];
                const midX = (pt.x + nextPt.x) / 2;
                const midY = (pt.y + nextPt.y) / 2;
                const plusSize = EDGE_MID_R * 0.55;

                return (
                  <g key={`add-v-edge-${i}`}>
                    {/* Generous edge tap target */}
                    <line
                      x1={pt.x}
                      y1={pt.y}
                      x2={nextPt.x}
                      y2={nextPt.y}
                      stroke="var(--accent, #0284c7)"
                      strokeWidth={2.4}
                      strokeDasharray="1.5,1"
                      strokeOpacity={0.85}
                      style={{ cursor: "crosshair", pointerEvents: "all", touchAction: "none" }}
                      onPointerDown={(e) => handleInsertVertexAtEdge(e, i)}
                    />
                    {/* Prominent (+) badge at edge midpoint */}
                    <g
                      style={{ cursor: "crosshair", pointerEvents: "all", touchAction: "none" }}
                      onPointerDown={(e) => handleInsertVertexAtEdge(e, i)}
                    >
                      <circle cx={midX} cy={midY} r={EDGE_MID_HIT_R * 1.4} fill="transparent" />
                      <circle
                        cx={midX}
                        cy={midY}
                        r={EDGE_MID_R * 1.25}
                        fill="var(--accent, #0284c7)"
                        stroke="white"
                        strokeWidth={0.4}
                      />
                      <line
                        x1={midX - plusSize}
                        y1={midY}
                        x2={midX + plusSize}
                        y2={midY}
                        stroke="white"
                        strokeWidth={0.42}
                        strokeLinecap="round"
                      />
                      <line
                        x1={midX}
                        y1={midY - plusSize}
                        x2={midX}
                        y2={midY + plusSize}
                        stroke="white"
                        strokeWidth={0.42}
                        strokeLinecap="round"
                      />
                    </g>
                  </g>
                );
              })}
            </>
          ) : (
            <>
              {/* Normal mode: Interactive Edge Hit-lines (Drag to translate edge) */}
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

              {/* Normal mode: Vertex Handles (Drag to reshape, double-tap/click to delete) */}
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
  if (prev.addVertexMode !== next.addVertexMode) return false;
  if (prev.isAlarm !== next.isAlarm) return false;
  if (prev.isIsolated !== next.isIsolated) return false;
  if (prev.isEvacuatePulse !== next.isEvacuatePulse) return false;
  if (prev.isOrphan !== next.isOrphan) return false;
  if (prev.isReadOnly !== next.isReadOnly) return false;
  if (prev.additionalLabel !== next.additionalLabel) return false;
  if (prev.customName !== next.customName) return false;
  return true; // All visual props unchanged — skip re-render
});
