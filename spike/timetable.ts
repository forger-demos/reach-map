// Throwaway spike: the compact timetable shape and its binary form.
// Times are seconds since midnight of the service day and may pass 86400.

export interface Timetable {
  stopCount: number;
  stopLat: Float32Array;
  stopLon: Float32Array;
  /** Route r visits routeStops[routeStopOffset[r] .. routeStopOffset[r+1]). */
  routeStopOffset: Int32Array;
  routeStops: Int32Array;
  /** Trip j of route r, stop i: index routeTimeOffset[r] + j * stopsInRoute + i. */
  routeTimeOffset: Int32Array;
  arrivals: Int32Array;
  departures: Int32Array;
  /** Walking transfers from stop s: footTo/footSecs[footOffset[s] .. footOffset[s+1]). */
  footOffset: Int32Array;
  footTo: Int32Array;
  footSecs: Int32Array;
}

export interface TripInput {
  stops: number[];
  arrivals: number[];
  departures: number[];
}

const MAGIC = 0x52454348; // "RECH"

const FIELDS = [
  'stopLat',
  'stopLon',
  'routeStopOffset',
  'routeStops',
  'routeTimeOffset',
  'arrivals',
  'departures',
  'footOffset',
  'footTo',
  'footSecs',
] as const;

export function routeCount(tt: Timetable): number {
  return tt.routeStopOffset.length - 1;
}

export function tripCount(tt: Timetable, route: number): number {
  const k = (tt.routeStopOffset[route + 1] ?? 0) - (tt.routeStopOffset[route] ?? 0);
  const span = (tt.routeTimeOffset[route + 1] ?? 0) - (tt.routeTimeOffset[route] ?? 0);
  return k === 0 ? 0 : span / k;
}

/** Layout: magic, stopCount, then each field as (byteLength, bytes padded to 4). */
export function encode(tt: Timetable): Uint8Array {
  const parts = FIELDS.map((f) => new Uint8Array(tt[f].buffer, tt[f].byteOffset, tt[f].byteLength));
  const total = 8 + parts.reduce((n, p) => n + 4 + p.byteLength, 0);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, MAGIC, true);
  view.setUint32(4, tt.stopCount, true);
  let at = 8;
  for (const p of parts) {
    view.setUint32(at, p.byteLength, true);
    out.set(p, at + 4);
    at += 4 + p.byteLength;
  }
  return out;
}

export function decode(bytes: Uint8Array): Timetable {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== MAGIC) throw new Error('not a reach-map timetable');
  const stopCount = view.getUint32(4, true);
  let at = 8;
  const take = (): ArrayBuffer => {
    const len = view.getUint32(at, true);
    // Uint8Array.from copies; Buffer#slice would return a view of the whole file.
    const copy = Uint8Array.from(bytes.subarray(at + 4, at + 4 + len)).buffer as ArrayBuffer;
    at += 4 + len;
    return copy;
  };
  const stopLat = new Float32Array(take());
  const stopLon = new Float32Array(take());
  const routeStopOffset = new Int32Array(take());
  const routeStops = new Int32Array(take());
  const routeTimeOffset = new Int32Array(take());
  const arrivals = new Int32Array(take());
  const departures = new Int32Array(take());
  const footOffset = new Int32Array(take());
  const footTo = new Int32Array(take());
  const footSecs = new Int32Array(take());
  return {
    stopCount, stopLat, stopLon, routeStopOffset, routeStops, routeTimeOffset,
    arrivals, departures, footOffset, footTo, footSecs,
  };
}

/** Whether trip b can follow trip a on one route without overtaking it. */
function follows(a: TripInput, b: TripInput): boolean {
  for (let i = 0; i < a.stops.length; i++) {
    if ((b.arrivals[i] ?? 0) < (a.arrivals[i] ?? 0) || (b.departures[i] ?? 0) < (a.departures[i] ?? 0)) return false;
  }
  return true;
}

/**
 * Groups trips by stop sequence into routes whose trips never overtake each
 * other (RAPTOR needs trips of a route to be ordered the same at every stop).
 */
export function groupRoutes(trips: TripInput[]): TripInput[][] {
  const byPattern = new Map<string, TripInput[]>();
  for (const t of trips) {
    const key = t.stops.join(',');
    const list = byPattern.get(key);
    if (list) list.push(t);
    else byPattern.set(key, [t]);
  }
  const routes: TripInput[][] = [];
  for (const list of byPattern.values()) {
    list.sort((a, b) => (a.departures[0] ?? 0) - (b.departures[0] ?? 0));
    const lanes: TripInput[][] = [];
    for (const t of list) {
      const lane = lanes.find((l) => follows(l[l.length - 1] as TripInput, t));
      if (lane) lane.push(t);
      else lanes.push([t]);
    }
    routes.push(...lanes);
  }
  return routes;
}

export function buildTimetable(
  stopLat: number[],
  stopLon: number[],
  trips: TripInput[],
  foot: Array<Array<[number, number]>>,
): Timetable {
  const routes = groupRoutes(trips);
  const routeStopOffset = new Int32Array(routes.length + 1);
  const routeTimeOffset = new Int32Array(routes.length + 1);
  routes.forEach((r, i) => {
    const k = (r[0] as TripInput).stops.length;
    routeStopOffset[i + 1] = (routeStopOffset[i] ?? 0) + k;
    routeTimeOffset[i + 1] = (routeTimeOffset[i] ?? 0) + k * r.length;
  });
  const routeStops = new Int32Array(routeStopOffset[routes.length] ?? 0);
  const arrivals = new Int32Array(routeTimeOffset[routes.length] ?? 0);
  const departures = new Int32Array(routeTimeOffset[routes.length] ?? 0);
  routes.forEach((r, i) => {
    const first = r[0] as TripInput;
    const k = first.stops.length;
    routeStops.set(first.stops, routeStopOffset[i] ?? 0);
    r.forEach((t, j) => {
      const base = (routeTimeOffset[i] ?? 0) + j * k;
      arrivals.set(t.arrivals, base);
      departures.set(t.departures, base);
    });
  });
  const footOffset = new Int32Array(stopLat.length + 1);
  foot.forEach((list, s) => {
    footOffset[s + 1] = (footOffset[s] ?? 0) + list.length;
  });
  const footTo = new Int32Array(footOffset[stopLat.length] ?? 0);
  const footSecs = new Int32Array(footTo.length);
  foot.forEach((list, s) => {
    list.forEach(([to, secs], n) => {
      footTo[(footOffset[s] ?? 0) + n] = to;
      footSecs[(footOffset[s] ?? 0) + n] = secs;
    });
  });
  return {
    stopCount: stopLat.length,
    stopLat: Float32Array.from(stopLat),
    stopLon: Float32Array.from(stopLon),
    routeStopOffset, routeStops, routeTimeOffset, arrivals, departures,
    footOffset, footTo, footSecs,
  };
}

/** Straight-line walking transfers between stops closer than maxMetres. */
export function footpaths(
  lat: number[],
  lon: number[],
  maxMetres: number,
  detour: number,
  metresPerSecond: number,
): Array<Array<[number, number]>> {
  const cell = maxMetres / 111_000;
  const grid = new Map<string, number[]>();
  const key = (x: number, y: number) => `${x},${y}`;
  const cx = (i: number) => Math.floor((lon[i] as number) * Math.cos(((lat[i] as number) * Math.PI) / 180) / cell);
  const cy = (i: number) => Math.floor((lat[i] as number) / cell);
  lat.forEach((_, i) => {
    const k = key(cx(i), cy(i));
    const list = grid.get(k);
    if (list) list.push(i);
    else grid.set(k, [i]);
  });
  return lat.map((_, i) => {
    const out: Array<[number, number]> = [];
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        for (const j of grid.get(key(cx(i) + dx, cy(i) + dy)) ?? []) {
          if (j === i) continue;
          const m = metres(lat[i] as number, lon[i] as number, lat[j] as number, lon[j] as number);
          if (m <= maxMetres) out.push([j, Math.round((m * detour) / metresPerSecond)]);
        }
      }
    }
    return out;
  });
}

export function metres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dy = (lat2 - lat1) * rad;
  const dx = (lon2 - lon1) * rad * Math.cos(((lat1 + lat2) / 2) * rad);
  return Math.hypot(dx, dy) * 6_371_000;
}
