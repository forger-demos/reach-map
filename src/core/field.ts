// The travel-time field: a grid over the region where each cell holds the least time to reach it,
// by public transport to a stop and then on foot. Rows run north to south so a row-major array
// is also the pixel order of an image laid over the region.
import {MAX_FIELD_WALK_METRES, metres, walkSeconds, WALK_SPEED_MPS, DETOUR_FACTOR} from './walk';

export interface Bounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface Grid extends Bounds {
  cols: number;
  rows: number;
  /** Cell size in degrees of longitude and of latitude. */
  stepLon: number;
  stepLat: number;
}

/** The area the field covers: the Helsinki region. */
export const REGION: Bounds = {west: 24.55, south: 60.07, east: 25.3, north: 60.35};

/** Cell edge in metres. Small enough to look smooth, large enough to compute in a blink. */
export const CELL_METRES = 200;

/** Longest travel time the field shows, in seconds. */
export const FIELD_BUDGET_SECONDS = 60 * 60;

const METRES_PER_DEGREE = 111_195;

/** A grid whose cells are at most `cellMetres` across, measured at the middle latitude of the bounds. */
export function makeGrid(bounds: Bounds, cellMetres: number): Grid {
  const midLat = (bounds.south + bounds.north) / 2;
  const lonMetres = METRES_PER_DEGREE * Math.cos((midLat * Math.PI) / 180);
  const cols = Math.ceil(((bounds.east - bounds.west) * lonMetres) / cellMetres);
  const rows = Math.ceil(((bounds.north - bounds.south) * METRES_PER_DEGREE) / cellMetres);
  return {
    ...bounds,
    cols,
    rows,
    stepLon: (bounds.east - bounds.west) / cols,
    stepLat: (bounds.north - bounds.south) / rows,
  };
}

export function cellLon(grid: Grid, col: number): number {
  return grid.west + (col + 0.5) * grid.stepLon;
}

export function cellLat(grid: Grid, row: number): number {
  return grid.north - (row + 0.5) * grid.stepLat;
}

export interface FieldInput {
  stopLat: ArrayLike<number>;
  stopLon: ArrayLike<number>;
  /** Earliest arrival per stop in seconds, Infinity when unreachable. */
  arrival: ArrayLike<number>;
  departure: number;
  budgetSeconds?: number;
  capMetres?: number;
}

/**
 * Seconds from departure to each cell, Infinity where the cell is not reached within the budget.
 * Each reached stop writes outward only as far as the walk cap and the time it has left allow.
 */
export function computeField(grid: Grid, input: FieldInput): Float32Array {
  const budget = input.budgetSeconds ?? FIELD_BUDGET_SECONDS;
  const cap = input.capMetres ?? MAX_FIELD_WALK_METRES;
  const out = new Float32Array(grid.cols * grid.rows).fill(Infinity);
  const secondsPerMetre = DETOUR_FACTOR / WALK_SPEED_MPS;
  for (let s = 0; s < input.arrival.length; s++) {
    const t = (input.arrival[s] as number) - input.departure;
    if (!(t <= budget)) continue;
    const lat = input.stopLat[s] as number;
    const lon = input.stopLon[s] as number;
    // Slightly generous so rounding in walkSeconds never drops a cell the exact test would keep.
    const reach = Math.min(cap, (budget - t) / secondsPerMetre + 1);
    const dLat = reach / METRES_PER_DEGREE;
    const dLon = reach / (METRES_PER_DEGREE * Math.cos((lat * Math.PI) / 180));
    const col0 = Math.max(0, Math.floor((lon - dLon - grid.west) / grid.stepLon));
    const col1 = Math.min(grid.cols - 1, Math.floor((lon + dLon - grid.west) / grid.stepLon));
    const row0 = Math.max(0, Math.floor((grid.north - (lat + dLat)) / grid.stepLat));
    const row1 = Math.min(grid.rows - 1, Math.floor((grid.north - (lat - dLat)) / grid.stepLat));
    for (let row = row0; row <= row1; row++) {
      const y = cellLat(grid, row);
      for (let col = col0; col <= col1; col++) {
        const m = metres(lat, lon, y, cellLon(grid, col));
        if (m > cap) continue;
        const total = t + walkSeconds(m);
        const at = row * grid.cols + col;
        if (total <= budget && total < (out[at] as number)) out[at] = total;
      }
    }
  }
  return out;
}

/** How many cells hold a finite time. */
export function reachedCells(field: ArrayLike<number>): number {
  let n = 0;
  for (let i = 0; i < field.length; i++) if (Number.isFinite(field[i] as number)) n++;
  return n;
}
