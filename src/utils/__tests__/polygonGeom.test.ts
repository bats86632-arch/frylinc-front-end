import { describe, it, expect } from 'vitest';
import {
  translateEdge,
  polygonArea,
  rectToPoints,
  translatePolygon,
  clampPoint,
} from '../polygonGeom';

describe('polygonGeom - translateEdge', () => {
  it('translates edge 0 (vertices 0 and 1) without moving other vertices', () => {
    // 10x10 square: (10,10), (20,10), (20,20), (10,20)
    const square = rectToPoints(10, 10, 10, 10);
    // Move top edge upward by dy = -5
    const updated = translateEdge(square, 0, 0, -5);

    expect(updated[0]).toEqual({ x: 10, y: 5 });
    expect(updated[1]).toEqual({ x: 20, y: 5 });
    // Bottom vertices remain untouched
    expect(updated[2]).toEqual({ x: 20, y: 20 });
    expect(updated[3]).toEqual({ x: 10, y: 20 });
  });

  it('translates edge 1 (vertices 1 and 2) horizontally', () => {
    const square = rectToPoints(10, 10, 10, 10);
    // Move right edge rightward by dx = +8
    const updated = translateEdge(square, 1, 8, 0);

    expect(updated[0]).toEqual({ x: 10, y: 10 });
    expect(updated[1]).toEqual({ x: 28, y: 10 });
    expect(updated[2]).toEqual({ x: 28, y: 20 });
    expect(updated[3]).toEqual({ x: 10, y: 20 });
  });

  it('clamps moved edge endpoints within [0, 100]', () => {
    const square = rectToPoints(5, 5, 10, 10);
    // Push edge 0 past 0 bound
    const updated = translateEdge(square, 0, 0, -20);

    expect(updated[0].y).toBe(0);
    expect(updated[1].y).toBe(0);
  });
});
