// The walking model. Walking is a model, not a measurement: a straight line scaled by a
// detour factor over a speed, capped in length. Only the validation work changes these.

/** Street distance as a multiple of the straight line. */
export const DETOUR_FACTOR = 1.3;
/** Walking speed in metres per second. */
export const WALK_SPEED_MPS = 1.25;
/** Longest stop-to-stop transfer, in straight-line metres. */
export const MAX_TRANSFER_METRES = 400;
/** Furthest stop a click walks to, in straight-line metres. */
export const MAX_ORIGIN_METRES = 600;

const EARTH_RADIUS_METRES = 6_371_000;

export function metres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dy = (lat2 - lat1) * rad;
  const dx = (lon2 - lon1) * rad * Math.cos(((lat1 + lat2) / 2) * rad);
  return Math.hypot(dx, dy) * EARTH_RADIUS_METRES;
}

/** Seconds to walk between two points under the model. */
export function walkSeconds(straightMetres: number): number {
  return Math.round((straightMetres * DETOUR_FACTOR) / WALK_SPEED_MPS);
}

/** Walking transfers from each stop to every stop within the cap, as [stop, seconds] pairs. */
export function footpaths(lat: ArrayLike<number>, lon: ArrayLike<number>): Array<Array<[number, number]>> {
  const cell = MAX_TRANSFER_METRES / 111_000;
  const grid = new Map<string, number[]>();
  const key = (x: number, y: number) => `${x},${y}`;
  const cx = (i: number) => Math.floor(((lon[i] as number) * Math.cos(((lat[i] as number) * Math.PI) / 180)) / cell);
  const cy = (i: number) => Math.floor((lat[i] as number) / cell);
  for (let i = 0; i < lat.length; i++) {
    const k = key(cx(i), cy(i));
    const list = grid.get(k);
    if (list) list.push(i);
    else grid.set(k, [i]);
  }
  const out: Array<Array<[number, number]>> = [];
  for (let i = 0; i < lat.length; i++) {
    const near: Array<[number, number]> = [];
    // Cells are wider than the cap in latitude but the longitude scale drifts with latitude,
    // so look two cells out each way to be safe.
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        for (const j of grid.get(key(cx(i) + dx, cy(i) + dy)) ?? []) {
          if (j === i) continue;
          const m = metres(lat[i] as number, lon[i] as number, lat[j] as number, lon[j] as number);
          if (m <= MAX_TRANSFER_METRES) near.push([j, walkSeconds(m)]);
        }
      }
    }
    out.push(near);
  }
  return out;
}

/** Furthest a stop paints the colour field, in straight-line metres. */
export const MAX_FIELD_WALK_METRES = 600;
