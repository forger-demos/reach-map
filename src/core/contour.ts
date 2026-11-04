// Marching squares over the field grid. Values sit at cell centres, so a vertex lies on the line
// between two neighbouring centres where the value crosses the threshold.
import {cellLat, cellLon, type Grid} from './field';

export type Position = [number, number];

export interface Line {
  /** Longitude and latitude pairs. A closed line repeats its first position at the end. */
  coordinates: Position[];
  closed: boolean;
}

/**
 * A cell is inside when its value is at or below the threshold; Infinity (unreached) is outside.
 * Where a finite centre meets an unreached one there is nothing to interpolate, so the vertex sits
 * halfway between the two centres.
 *
 * A saddle (opposite corners inside, the others outside) is resolved by the mean of the four
 * corners: if it is at or below the threshold the inside corners join across the cell, otherwise
 * they stay apart. An unreached corner makes the mean Infinity, so they stay apart.
 */
export function contour(values: ArrayLike<number>, grid: Grid, threshold: number): Line[] {
  const {cols, rows} = grid;
  const at = (r: number, c: number) => values[r * cols + c] as number;
  const inside = (v: number) => v <= threshold;

  // An edge point is named by the lower-index centre it starts from and its direction.
  const key = (horizontal: boolean, r: number, c: number) => (r * cols + c) * 2 + (horizontal ? 0 : 1);
  const position = new Map<number, Position>();
  const point = (horizontal: boolean, r: number, c: number): number => {
    const id = key(horizontal, r, c);
    if (!position.has(id)) {
      const r2 = horizontal ? r : r + 1;
      const c2 = horizontal ? c + 1 : c;
      const a = at(r, c);
      const b = at(r2, c2);
      const t = Number.isFinite(a) && Number.isFinite(b) ? (threshold - a) / (b - a) : 0.5;
      const lon = cellLon(grid, c) + t * (cellLon(grid, c2) - cellLon(grid, c));
      const lat = cellLat(grid, r) + t * (cellLat(grid, r2) - cellLat(grid, r));
      position.set(id, [lon, lat]);
    }
    return id;
  };

  const segments: Array<[number, number]> = [];
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const tl = at(r, c);
      const tr = at(r, c + 1);
      const br = at(r + 1, c + 1);
      const bl = at(r + 1, c);
      const code = (inside(tl) ? 1 : 0) | (inside(tr) ? 2 : 0) | (inside(br) ? 4 : 0) | (inside(bl) ? 8 : 0);
      if (code === 0 || code === 15) continue;
      const top = () => point(true, r, c);
      const bottom = () => point(true, r + 1, c);
      const left = () => point(false, r, c);
      const right = () => point(false, r, c + 1);
      switch (code) {
        case 1: case 14: segments.push([left(), top()]); break;
        case 2: case 13: segments.push([top(), right()]); break;
        case 3: case 12: segments.push([left(), right()]); break;
        case 4: case 11: segments.push([right(), bottom()]); break;
        case 6: case 9: segments.push([top(), bottom()]); break;
        case 7: case 8: segments.push([left(), bottom()]); break;
        case 5: // top-left and bottom-right inside
          if ((tl + tr + br + bl) / 4 <= threshold) segments.push([left(), bottom()], [top(), right()]);
          else segments.push([left(), top()], [right(), bottom()]);
          break;
        case 10: // top-right and bottom-left inside
          if ((tl + tr + br + bl) / 4 <= threshold) segments.push([left(), top()], [right(), bottom()]);
          else segments.push([top(), right()], [left(), bottom()]);
          break;
      }
    }
  }
  return chain(segments, position);
}

/** Joins segments that share an edge point into lines, open ones first, in a fixed order. */
function chain(segments: Array<[number, number]>, position: Map<number, Position>): Line[] {
  const touching = new Map<number, number[]>();
  segments.forEach(([a, b], i) => {
    for (const p of [a, b]) touching.set(p, [...(touching.get(p) ?? []), i]);
  });
  const used = new Array<boolean>(segments.length).fill(false);

  const walk = (startSegment: number, startPoint: number): number[] => {
    const ids = [startPoint];
    let seg = startSegment;
    let from = startPoint;
    for (;;) {
      used[seg] = true;
      const [a, b] = segments[seg] as [number, number];
      const to = a === from ? b : a;
      ids.push(to);
      const next = (touching.get(to) as number[]).find((s) => !used[s]);
      if (next === undefined) return ids;
      seg = next;
      from = to;
    }
  };
  const toLine = (ids: number[]): Line => ({
    coordinates: ids.map((id) => position.get(id) as Position),
    closed: ids.length > 2 && ids[0] === ids[ids.length - 1],
  });

  const lines: Line[] = [];
  const ends = [...touching.keys()].filter((p) => (touching.get(p) as number[]).length === 1).sort((a, b) => a - b);
  for (const p of ends) {
    const s = (touching.get(p) as number[])[0] as number;
    if (!used[s]) lines.push(toLine(walk(s, p)));
  }
  for (let s = 0; s < segments.length; s++) {
    if (!used[s]) lines.push(toLine(walk(s, (segments[s] as [number, number])[0])));
  }
  return lines;
}
