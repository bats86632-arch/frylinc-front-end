import { useRef, useCallback } from "react";
import { ZoneLayout, PolyPoint } from "../types";
import {
  toSvgPoints,
  polygonIsSelfIntersecting,
  polygonIsDegenerate,
  translatePolygon,
  translateEdge,
  splitEdge,
  clampPoint,
} from "../utils/polygonGeom";

// ── Constants ─────────────────────────────────────────────────────────────────

const IS_TOUCH = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

/** Visible radius of vertex handles in SVG units (= % of container). */
const VERTEX_R = IS_TOUCH ? 2.2 : 1.2;
/** Touch hit radius of vertex handles (generous touch padding). */
const VERTEX_HIT_R = IS_TOUCH ? 5.5 : 3.0;

/** Midpoint (+) handle radius. */
const EDGE_MID_R = IS_TOUCH ? 1.8 : 1.0;
/** Touch hit radius of midpoint handle. */
const EDGE_MID_HIT_R = IS_TOUCH ? 5.0 : 2.5;

/** Minimum vertices before a vertex can be deleted. */
const MIN_VERTICES = 3;

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
  | { type: "insert_vertex"; newVertexIdx: number; startPts: PolyPoint[]; startX: number; startY: number };

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
export function ZonePoly({
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

  // ── Coordinate conversion ─────────────────────────────────────────────────
  const toSvgPct = useCallback((e: React.PointerEvent | PointerEvent): PolyPoint => {
    if (!svgRef.current) return { x: 0, y: 0 };
    return clientToSvgPct(svgRef.current, e.clientX, e.clientY);
  }, [svgRef]);

  // ── Validate and commit a candidate set of points ─────────────────────────
  const tryCommit = useCallback((candidate: PolyPoint[]) => {
    if (candidate.length < MIN_VERTICES) return false;
    if (polygonIsSelfIntersecting(candidate)) return false;
    if (polygonIsDegenerate(candidate)) return false;
    onChange({ points: candidate });
    return true;
  }, [onChange]);

  // ── Global pointer events (attached via SVG element capture) ──────────────
  const handleGlobalPointerMove = useCallback((e: PointerEvent) => {
    const ds = dragRef.current;
    if (!ds || !svgRef.current) return;
    const cur = toSvgPct(e);

    if (ds.type === "move") {
      const dx = cur.x - ds.startX;
      const dy = cur.y - ds.startY;
      const candidate = translatePolygon(ds.startPts, dx, dy);
      onChange({ points: candidate });
    } else if (ds.type === "vertex") {
      let clamped = clampPoint(cur);

      // Dynamic snapping for straight lines
      const SNAP_T = 1.5;
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
      // Translate the entire edge line (moves both endpoints by dx, dy)
      const dx = cur.x - ds.startX;
      const dy = cur.y - ds.startY;
      const candidate = translateEdge(ds.startPts, ds.edgeIdx, dx, dy);
      tryCommit(candidate);
    } else if (ds.type === "insert_vertex") {
      // Drag the newly inserted vertex
      let clamped = clampPoint(cur);
      const candidate = ds.startPts.map((p, i) =>
        i === ds.newVertexIdx ? clamped : p
      );
      tryCommit(candidate);
    }
  }, [toSvgPct, tryCommit, onChange, svgRef]);

  const handleGlobalPointerUp = useCallback((e: PointerEvent) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    dragStartPts.current = [];
    (e.target as Element)?.releasePointerCapture?.(e.pointerId);
  }, []);

  // ── Polygon body pointer handler ──────────────────────────────────────────
  const handleBodyPointerDown = useCallback((e: React.PointerEvent) => {
    if (isReadOnly) return;
    e.stopPropagation();
    e.preventDefault();
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
    (e.target as Element).setPointerCapture(e.pointerId);
    svgRef.current?.addEventListener("pointermove", handleGlobalPointerMove);
    svgRef.current?.addEventListener("pointerup", handleGlobalPointerUp, { once: true });
  }, [isReadOnly, pts, toSvgPct, onSelect, svgRef, handleGlobalPointerMove, handleGlobalPointerUp]);

  // ── Edge translation pointer handler ──────────────────────────────────────
  const handleEdgePointerDown = useCallback((e: React.PointerEvent, edgeIdx: number) => {
    if (isReadOnly) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    const cur = toSvgPct(e);

    // Translate the edge (shifts wall without adding vertices)
    dragStartPts.current = [...pts];
    dragRef.current = {
      type: "edge",
      edgeIdx,
      startPts: [...pts],
      startX: cur.x,
      startY: cur.y,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
    svgRef.current?.addEventListener("pointermove", handleGlobalPointerMove);
    svgRef.current?.addEventListener("pointerup", handleGlobalPointerUp, { once: true });
  }, [isReadOnly, pts, toSvgPct, onSelect, svgRef, handleGlobalPointerMove, handleGlobalPointerUp]);

  // ── Edge midpoint (+) handle pointer handler ──────────────────────────────
  const handleInsertVertexPointerDown = useCallback((e: React.PointerEvent, edgeIdx: number) => {
    if (isReadOnly) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    const cur = toSvgPct(e);

    // Explicitly split edge at midpoint and drag the new vertex
    const withNew = splitEdge(pts, edgeIdx, 0.5);
    const newVertexIdx = edgeIdx + 1;
    onChange({ points: withNew });

    dragStartPts.current = withNew;
    dragRef.current = {
      type: "insert_vertex",
      newVertexIdx,
      startPts: withNew,
      startX: cur.x,
      startY: cur.y,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
    svgRef.current?.addEventListener("pointermove", handleGlobalPointerMove);
    svgRef.current?.addEventListener("pointerup", handleGlobalPointerUp, { once: true });
  }, [isReadOnly, pts, toSvgPct, onSelect, onChange, svgRef, handleGlobalPointerMove, handleGlobalPointerUp]);

  // ── Vertex handle pointer handlers ────────────────────────────────────────
  const handleVertexPointerDown = useCallback((e: React.PointerEvent, vertexIdx: number) => {
    if (isReadOnly) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect();

    // Mobile double-tap detection for deleting vertex
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

    const cur = toSvgPct(e);
    dragStartPts.current = [...pts];
    dragRef.current = {
      type: "vertex",
      vertexIdx,
      startPts: [...pts],
      startX: cur.x,
      startY: cur.y,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
    svgRef.current?.addEventListener("pointermove", handleGlobalPointerMove);
    svgRef.current?.addEventListener("pointerup", handleGlobalPointerUp, { once: true });
  }, [isReadOnly, pts, toSvgPct, onSelect, onChange, svgRef, handleGlobalPointerMove, handleGlobalPointerUp]);

  const handleVertexDblClick = useCallback((e: React.MouseEvent, vertexIdx: number) => {
    if (isReadOnly) return;
    e.stopPropagation();
    if (pts.length <= MIN_VERTICES) return;
    const next = pts.filter((_, i) => i !== vertexIdx);
    onChange({ points: next });
  }, [isReadOnly, pts, onChange]);

  // ── Visual state ──────────────────────────────────────────────────────────
  const fill = getFill(isAlarm, isEvacuatePulse, isIsolated, isOrphan, isSelected);
  const stroke = getStroke(isAlarm, isEvacuatePulse, isIsolated, isOrphan, isSelected);
  const animClass = getAnimClass(isAlarm, isEvacuatePulse, isIsolated);
  const strokeWidth = isSelected ? 0.6 : 0.4;
  const strokeDasharray = isOrphan ? "1.2,0.8" : undefined;

  // Bounding box for label positioning
  const minX = pts.length > 0 ? Math.min(...pts.map(p => p.x)) : 50;
  const minY = pts.length > 0 ? Math.min(...pts.map(p => p.y)) : 50;
  const centroid = pts.length > 0
    ? {
        x: pts.reduce((sum, p) => sum + p.x, 0) / pts.length,
        y: pts.reduce((sum, p) => sum + p.y, 0) / pts.length
      }
    : { x: 50, y: 50 };
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
        x={minX + 1.5}
        y={minY + 2.5}
        textAnchor="start"
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
                strokeWidth={IS_TOUCH ? 4.5 : 2.6}
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
