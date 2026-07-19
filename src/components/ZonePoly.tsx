import { useRef, useCallback, useState } from "react";
import { Trash2 } from "lucide-react";
import { ZoneLayout, PolyPoint } from "../types";
import {
  toSvgPoints,
  polygonIsSelfIntersecting,
  polygonIsDegenerate,
  translatePolygon,
  splitEdge,
  clampPoint,
  polygonCentroid,
  distToSegment,
  projectPointOnSegment,
} from "../utils/polygonGeom";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Radius of vertex handles in SVG units (= % of container). */
const VERTEX_R = 1.2;
/** Edge ghost-handle radius — slightly smaller. */
const EDGE_R = 0.85;
/** Max distance (in % units) to the edge midpoint to show the ghost handle. */
const EDGE_HOVER_THRESHOLD = 3.5;
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
  /** Additional text to append to the zone label */
  additionalLabel?: string;
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
  | { type: "edge"; edgeIdx: number; vertexInserted: boolean; startX: number; startY: number; startPts: PolyPoint[] };

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
 *  - Hover edge → ghost handle appears; drag it → inserts vertex and moves it
 *  - Double-click vertex → delete vertex (min 3)
 *  - Trash button (selected) → remove zone
 */
export function ZonePoly({
  zone,
  isAlarm,
  isIsolated,
  isEvacuatePulse = false,
  additionalLabel,
  isSelected,
  isReadOnly,
  isOrphan = false,
  svgRef,
  onSelect,
  onChange,
  onRemove,
}: ZonePolyProps) {
  const pts = zone.points ?? [];

  // ── Drag state ─────────────────────────────────────────────────────────────
  const dragRef = useRef<DragMode | null>(null);
  /** Snapshot of points at drag start — used for revert on invalid shape. */
  const dragStartPts = useRef<PolyPoint[]>([]);

  // ── Edge hover ─────────────────────────────────────────────────────────────
  /** Index of the edge whose ghost handle is shown, or null. */
  const [hoverEdge, setHoverEdge] = useState<{ edgeIdx: number; pt: PolyPoint } | null>(null);

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
      // Move always stays valid (translatePolygon clamps to bounds)
      onChange({ points: candidate });
    } else if (ds.type === "vertex") {
      const clamped = clampPoint(cur);
      const candidate = ds.startPts.map((p, i) =>
        i === ds.vertexIdx ? clamped : p
      );
      tryCommit(candidate);
    } else if (ds.type === "edge") {
      // After vertex insertion, treat this like a vertex drag
      if (!ds.vertexInserted) {
        // Insert vertex on first move
        const t = projectPointOnSegment(cur, ds.startPts[ds.edgeIdx], ds.startPts[(ds.edgeIdx + 1) % ds.startPts.length]);
        const withNew = splitEdge(ds.startPts, ds.edgeIdx, t);
        // The new vertex is at edgeIdx+1
        const newVertexIdx = ds.edgeIdx + 1;
        dragRef.current = {
          type: "edge",
          edgeIdx: newVertexIdx,
          vertexInserted: true,
          startX: ds.startX,
          startY: ds.startY,
          startPts: withNew,
        };
        onChange({ points: withNew });
      } else {
        // Drag the inserted vertex
        const vertexIdx = ds.edgeIdx;
        const clamped = clampPoint(cur);
        const candidate = ds.startPts.map((p, i) =>
          i === vertexIdx ? clamped : p
        );
        tryCommit(candidate);
      }
    }
  }, [toSvgPct, tryCommit, onChange, svgRef]);

  const handleGlobalPointerUp = useCallback((e: PointerEvent) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    dragStartPts.current = [];
    // Release capture
    (e.target as Element)?.releasePointerCapture?.(e.pointerId);
  }, []);

  // ── Polygon body pointer handlers ─────────────────────────────────────────
  const handleBodyPointerDown = useCallback((e: React.PointerEvent) => {
    if (isReadOnly) return;
    e.stopPropagation();
    onSelect();
    const cur = toSvgPct(e);
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

  // ── Vertex handle pointer handlers ────────────────────────────────────────
  const handleVertexPointerDown = useCallback((e: React.PointerEvent, vertexIdx: number) => {
    if (isReadOnly) return;
    e.stopPropagation();
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
  }, [isReadOnly, pts, toSvgPct, svgRef, handleGlobalPointerMove, handleGlobalPointerUp]);

  const handleVertexDblClick = useCallback((e: React.MouseEvent, vertexIdx: number) => {
    if (isReadOnly) return;
    e.stopPropagation();
    if (pts.length <= MIN_VERTICES) return;
    const next = pts.filter((_, i) => i !== vertexIdx);
    onChange({ points: next });
  }, [isReadOnly, pts, onChange]);

  // ── Edge ghost handle pointer handlers ────────────────────────────────────
  const handleEdgePointerDown = useCallback((e: React.PointerEvent, edgeIdx: number) => {
    if (isReadOnly) return;
    e.stopPropagation();
    const cur = toSvgPct(e);
    dragRef.current = {
      type: "edge",
      edgeIdx,
      vertexInserted: false,
      startPts: [...pts],
      startX: cur.x,
      startY: cur.y,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
    svgRef.current?.addEventListener("pointermove", handleGlobalPointerMove);
    svgRef.current?.addEventListener("pointerup", handleGlobalPointerUp, { once: true });
    setHoverEdge(null);
  }, [isReadOnly, pts, toSvgPct, svgRef, handleGlobalPointerMove, handleGlobalPointerUp]);

  // ── SVG mouse move for edge hover detection ───────────────────────────────
  const handleSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (isReadOnly || !isSelected || dragRef.current) {
      setHoverEdge(null);
      return;
    }
    if (!svgRef.current) return;
    const cur = clientToSvgPct(svgRef.current, e.clientX, e.clientY);
    const n = pts.length;
    let closestEdge: number | null = null;
    let closestDist = EDGE_HOVER_THRESHOLD;
    let closestPt: PolyPoint = cur;

    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      const d = distToSegment(cur, a, b);
      if (d < closestDist) {
        closestDist = d;
        closestEdge = i;
        // Projection point on the edge
        const t = projectPointOnSegment(cur, a, b);
        closestPt = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      }
    }

    if (closestEdge !== null) {
      setHoverEdge({ edgeIdx: closestEdge, pt: closestPt });
    } else {
      setHoverEdge(null);
    }
  }, [isReadOnly, isSelected, pts, svgRef]);

  // ── Visual state ──────────────────────────────────────────────────────────
  const fill = getFill(isAlarm, isEvacuatePulse, isIsolated, isOrphan, isSelected);
  const stroke = getStroke(isAlarm, isEvacuatePulse, isIsolated, isOrphan, isSelected);
  const animClass = getAnimClass(isAlarm, isEvacuatePulse, isIsolated);
  const strokeWidth = isSelected ? 0.5 : 0.35;
  const strokeDasharray = isOrphan ? "1.2,0.8" : undefined;

  // Centroid for label positioning
  const centroid = pts.length >= 3 ? polygonCentroid(pts) : { x: 50, y: 50 };
  const zoneNumber = zone.zoneId.split("-Z")[1] || zone.label;
  const labelText = zoneNumber + (additionalLabel ?? "");

  // Trash button position — centroid, offset up slightly
  const trashX = centroid.x;
  const trashY = Math.max(centroid.y - 5, 2);

  if (pts.length < 3) return null; // Cannot render degenerate zone

  return (
    <g
      className={animClass}
      style={{ cursor: isReadOnly ? "default" : "move" }}
      onMouseMove={handleSvgMouseMove as unknown as React.MouseEventHandler<SVGGElement>}
    >
      {/* ── Polygon fill ── */}
      <polygon
        points={toSvgPoints(pts)}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        style={{
          pointerEvents: isReadOnly ? "none" : "all",
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
          fontSize: "1.8%",
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
          {/* Edge ghost handles */}
          {hoverEdge && (
            <circle
              key={`edge-ghost-${hoverEdge.edgeIdx}`}
              cx={hoverEdge.pt.x}
              cy={hoverEdge.pt.y}
              r={EDGE_R}
              fill="white"
              stroke="var(--accent, #1e6b8a)"
              strokeWidth={0.4}
              style={{ cursor: "crosshair", pointerEvents: "all" }}
              onPointerDown={(e) => {
                e.stopPropagation();
                handleEdgePointerDown(e, hoverEdge.edgeIdx);
              }}
            />
          )}

          {/* Vertex handles */}
          {pts.map((pt, i) => (
            <circle
              key={`vertex-${i}`}
              cx={pt.x}
              cy={pt.y}
              r={VERTEX_R}
              fill="white"
              stroke="var(--accent, #1e6b8a)"
              strokeWidth={0.45}
              style={{ cursor: "grab", pointerEvents: "all" }}
              onPointerDown={(e) => {
                e.stopPropagation();
                handleVertexPointerDown(e, i);
              }}
              onDoubleClick={(e) => handleVertexDblClick(e, i)}
              title={pts.length > MIN_VERTICES ? "Double-click to remove point" : "Minimum 3 points"}
            />
          ))}

          {/* Remove zone button — rendered as a foreignObject so we can use a real button */}
          {onRemove && (
            <foreignObject
              x={trashX - 2}
              y={trashY - 2}
              width={4}
              height={4}
              style={{ pointerEvents: "all", overflow: "visible" }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <button
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background: "var(--color-error, #d13438)",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
                    transform: "translate(-50%, -50%)",
                    transition: "transform 100ms ease, background 100ms ease",
                    padding: 0,
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); onRemove(); }}
                  title="Remove zone"
                >
                  <Trash2 style={{ width: 9, height: 9 }} />
                </button>
              </div>
            </foreignObject>
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
