/**
 * polygonGeom.ts
 * Pure geometry helpers for the polygon zone editor.
 * All coordinates are percentages (0–100) of the container dimensions.
 */

import { PolyPoint, ZoneLayout } from "../types";

// ── Conversion ──────────────────────────────────────────────────────────────

/**
 * Convert a legacy axis-aligned rectangle to 4 clockwise corner points.
 *   TL → TR → BR → BL
 */
export function rectToPoints(x: number, y: number, w: number, h: number): PolyPoint[] {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}

/**
 * Idempotent migration: if a ZoneLayout has no `points` (old Firestore doc)
 * but has x/y/width/height, compute points from the rect.
 * Zones already carrying `points` are returned unchanged.
 */
export function migrateZone(z: ZoneLayout): ZoneLayout {
  if (z.points && z.points.length >= 3) return z;
  const x = z.x ?? 5;
  const y = z.y ?? 5;
  const w = z.width ?? 20;
  const h = z.height ?? 15;
  return { ...z, points: rectToPoints(x, y, w, h) };
}

// ── Area & centroid ─────────────────────────────────────────────────────────

/**
 * Shoelace formula. Returns signed area in %² units.
 * Positive = counter-clockwise, negative = clockwise.
 */
export function polygonSignedArea(pts: PolyPoint[]): number {
  const n = pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  return area / 2;
}

export function polygonArea(pts: PolyPoint[]): number {
  return Math.abs(polygonSignedArea(pts));
}

/** Area-weighted centroid. */
export function polygonCentroid(pts: PolyPoint[]): PolyPoint {
  const n = pts.length;
  if (n === 0) return { x: 0, y: 0 };
  let cx = 0, cy = 0;
  const signed = polygonSignedArea(pts);
  if (signed === 0) {
    // Degenerate — return average
    return {
      x: pts.reduce((s, p) => s + p.x, 0) / n,
      y: pts.reduce((s, p) => s + p.y, 0) / n,
    };
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const cross = pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    cx += (pts[i].x + pts[j].x) * cross;
    cy += (pts[i].y + pts[j].y) * cross;
  }
  const factor = 1 / (6 * signed);
  return { x: cx * factor, y: cy * factor };
}

// ── Bounding box ────────────────────────────────────────────────────────────

export interface BBox {
  minX: number; minY: number; maxX: number; maxY: number;
}

export function polygonBBox(pts: PolyPoint[]): BBox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

// ── Hit testing ─────────────────────────────────────────────────────────────

/**
 * Ray-casting point-in-polygon test.
 * Returns true if pt is strictly inside the polygon.
 */
export function pointInPolygon(pt: PolyPoint, pts: PolyPoint[]): boolean {
  const { x, y } = pt;
  const n = pts.length;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = pts[i].x, yi = pts[i].y;
    const xj = pts[j].x, yj = pts[j].y;
    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

// ── Self-intersection ───────────────────────────────────────────────────────

/**
 * Test if two finite line segments (a1→a2) and (b1→b2) properly intersect.
 * Excludes shared endpoints (adjacent edges always share a vertex — that's fine).
 */
export function segmentsIntersect(
  a1: PolyPoint, a2: PolyPoint,
  b1: PolyPoint, b2: PolyPoint
): boolean {
  const cross = (o: PolyPoint, a: PolyPoint, b: PolyPoint) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const d1 = cross(b1, b2, a1);
  const d2 = cross(b1, b2, a2);
  const d3 = cross(a1, a2, b1);
  const d4 = cross(a1, a2, b2);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  // Collinear cases — treat as non-intersecting to allow touching edges
  return false;
}

/**
 * Check all non-adjacent edge pairs of a polygon for intersections.
 * Returns true if the polygon would self-intersect.
 */
export function polygonIsSelfIntersecting(pts: PolyPoint[]): boolean {
  const n = pts.length;
  if (n < 4) return false; // A triangle can never self-intersect
  for (let i = 0; i < n; i++) {
    const a1 = pts[i];
    const a2 = pts[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      // Skip the pair (last edge, first edge) which share the first vertex
      if (i === 0 && j === n - 1) continue;
      const b1 = pts[j];
      const b2 = pts[(j + 1) % n];
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

// ── Edge manipulation ───────────────────────────────────────────────────────

/**
 * Insert a new vertex along edge[edgeIndex → edgeIndex+1] at parameter t ∈ [0,1].
 * Returns a new points array with the vertex inserted.
 */
export function splitEdge(pts: PolyPoint[], edgeIndex: number, t: number): PolyPoint[] {
  const n = pts.length;
  const a = pts[edgeIndex];
  const b = pts[(edgeIndex + 1) % n];
  const newPt: PolyPoint = {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
  const result = [...pts];
  result.splice(edgeIndex + 1, 0, newPt);
  return result;
}

// ── Constraint helpers ──────────────────────────────────────────────────────

const MIN_AREA_PCT = 0.25; // %² — prevents zero-area slivers

export function polygonIsDegenerate(pts: PolyPoint[]): boolean {
  return polygonArea(pts) < MIN_AREA_PCT;
}

export function clampPoint(pt: PolyPoint, bbox?: BBox): PolyPoint {
  const minX = bbox?.minX ?? 0;
  const minY = bbox?.minY ?? 0;
  const maxX = bbox?.maxX ?? 100;
  const maxY = bbox?.maxY ?? 100;
  return {
    x: Math.max(minX, Math.min(maxX, pt.x)),
    y: Math.max(minY, Math.min(maxY, pt.y)),
  };
}

/**
 * Translate all polygon points by (dx, dy), clamping so the bounding box
 * stays within [0, 100] × [0, 100].
 */
export function translatePolygon(pts: PolyPoint[], dx: number, dy: number): PolyPoint[] {
  const bb = polygonBBox(pts);
  const clampedDx = dx < 0
    ? Math.max(dx, -bb.minX)
    : Math.min(dx, 100 - bb.maxX);
  const clampedDy = dy < 0
    ? Math.max(dy, -bb.minY)
    : Math.min(dy, 100 - bb.maxY);
  return pts.map((p) => ({ x: p.x + clampedDx, y: p.y + clampedDy }));
}

// ── SVG helpers ─────────────────────────────────────────────────────────────

/** Convert points array to SVG polygon points string: "x1,y1 x2,y2 ..." */
export function toSvgPoints(pts: PolyPoint[]): string {
  return pts.map((p) => `${p.x},${p.y}`).join(" ");
}

/** Distance from point P to line segment A→B (in percentage units). */
export function distToSegment(p: PolyPoint, a: PolyPoint, b: PolyPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const ex = p.x - a.x, ey = p.y - a.y;
    return Math.sqrt(ex * ex + ey * ey);
  }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  const ex = p.x - projX, ey = p.y - projY;
  return Math.sqrt(ex * ex + ey * ey);
}

/** Parameter t of the closest point on segment A→B to point P. */
export function projectPointOnSegment(p: PolyPoint, a: PolyPoint, b: PolyPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return 0;
  return Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
}
