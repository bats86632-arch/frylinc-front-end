import { describe, it, expect } from "vitest";
import {
  rectToPoints,
  distToPolygonBoundary,
  pointInPolygon,
  splitEdge,
  translatePolygon,
  translateEdge,
} from "../../utils/polygonGeom";

describe("ZonePoly Mobile Interaction Logic", () => {
  // A standard 20x15 zone box located at (10, 10) to (30, 25)
  const zonePts = rectToPoints(10, 10, 20, 15);

  it("prioritizes whole-body movement when clicking the middle or within the box", () => {
    // Exact center is (20, 17.5)
    const center = { x: 20, y: 17.5 };
    expect(pointInPolygon(center, zonePts)).toBe(true);

    const distCenter = distToPolygonBoundary(center, zonePts);
    expect(distCenter).toBe(7.5);
    // Interior distance exceeds boundary safety threshold (1.0), meaning it's guaranteed to move the body
    expect(distCenter > 1.0).toBe(true);

    // Any touch within the box (e.g. at x=15, y=14) is cleanly recognized as interior
    const innerPoint = { x: 15, y: 14 };
    expect(pointInPolygon(innerPoint, zonePts)).toBe(true);
    expect(distToPolygonBoundary(innerPoint, zonePts)).toBeGreaterThan(1.0);

    // Translating the whole body moves all vertices without altering topology or vertex count
    const moved = translatePolygon(zonePts, 5, 5);
    expect(moved).toHaveLength(4);
    expect(moved[0]).toEqual({ x: 15, y: 15 });
    expect(moved[2]).toEqual({ x: 35, y: 30 });
  });

  it("distinguishes border touches from interior taps", () => {
    // Point on top edge: (20, 10)
    const topEdgePoint = { x: 20, y: 10 };
    expect(distToPolygonBoundary(topEdgePoint, zonePts)).toBe(0);

    // Translating the edge shifts the wall without inserting new vertices
    const wallShifted = translateEdge(zonePts, 0, 0, -3);
    expect(wallShifted).toHaveLength(4);
    expect(wallShifted[0]).toEqual({ x: 10, y: 7 });
    expect(wallShifted[1]).toEqual({ x: 30, y: 7 });
  });

  it("inserts new vertex at midpoint cleanly only on deliberate action", () => {
    // Top edge is edge 0 from (10, 10) to (30, 10)
    // Midpoint is (20, 10)
    const withNew = splitEdge(zonePts, 0, 0.5);
    expect(withNew).toHaveLength(5);
    expect(withNew[1]).toEqual({ x: 20, y: 10 });
  });
});
