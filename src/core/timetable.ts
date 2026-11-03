// The compact timetable of one service day and its binary form.
// Times are seconds from the start of the service day and may pass 86400.

export interface Timetable {
  stopCount: number;
  stopLat: Float32Array;
  stopLon: Float32Array;
  /** Route r visits routeStops[routeStopOffset[r] .. routeStopOffset[r+1]). */
  routeStopOffset: Int32Array;
  routeStops: Int32Array;
  /** Index into the manifest's lines for each route. */
  routeLine: Int32Array;
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
  /** Index into the manifest's lines. */
  line: number;
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
  'routeLine',
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

/** Layout: magic, stopCount, then each field as a byte length followed by its bytes. */
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
  if (bytes.byteLength < 8 || view.getUint32(0, true) !== MAGIC) throw new Error('not a reach-map timetable');
  const stopCount = view.getUint32(4, true);
  let at = 8;
  // Uint8Array.from copies the field out. A Node Buffer is a view into a shared pool or
  // the whole file, so wrapping its memory directly would alias bytes the field does not own.
  const take = (): ArrayBuffer => {
    const len = view.getUint32(at, true);
    const copy = Uint8Array.from(bytes.subarray(at + 4, at + 4 + len)).buffer as ArrayBuffer;
    at += 4 + len;
    return copy;
  };
  return {
    stopCount,
    stopLat: new Float32Array(take()),
    stopLon: new Float32Array(take()),
    routeStopOffset: new Int32Array(take()),
    routeStops: new Int32Array(take()),
    routeLine: new Int32Array(take()),
    routeTimeOffset: new Int32Array(take()),
    arrivals: new Int32Array(take()),
    departures: new Int32Array(take()),
    footOffset: new Int32Array(take()),
    footTo: new Int32Array(take()),
    footSecs: new Int32Array(take()),
  };
}

/** Whether trip b can follow trip a on one route without overtaking it. */
function follows(a: TripInput, b: TripInput): boolean {
  for (let i = 0; i < a.stops.length; i++) {
    if ((b.arrivals[i] as number) < (a.arrivals[i] as number) || (b.departures[i] as number) < (a.departures[i] as number)) return false;
  }
  return true;
}

/**
 * Groups trips of one line and stop sequence into routes whose trips never overtake each
 * other: the search assumes trips of a route are in the same order at every stop.
 * A trip that would overtake the ones before it starts a new route.
 */
export function groupRoutes(trips: TripInput[]): TripInput[][] {
  const byPattern = new Map<string, TripInput[]>();
  for (const t of trips) {
    const key = `${t.line}|${t.stops.join(',')}`;
    const list = byPattern.get(key);
    if (list) list.push(t);
    else byPattern.set(key, [t]);
  }
  const routes: TripInput[][] = [];
  for (const list of byPattern.values()) {
    list.sort((a, b) => (a.departures[0] as number) - (b.departures[0] as number));
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
  stopLat: ArrayLike<number>,
  stopLon: ArrayLike<number>,
  trips: TripInput[],
  foot: Array<Array<[number, number]>>,
): Timetable {
  const routes = groupRoutes(trips);
  const routeStopOffset = new Int32Array(routes.length + 1);
  const routeTimeOffset = new Int32Array(routes.length + 1);
  routes.forEach((r, i) => {
    const k = (r[0] as TripInput).stops.length;
    routeStopOffset[i + 1] = (routeStopOffset[i] as number) + k;
    routeTimeOffset[i + 1] = (routeTimeOffset[i] as number) + k * r.length;
  });
  const routeStops = new Int32Array(routeStopOffset[routes.length] as number);
  const routeLine = new Int32Array(routes.length);
  const arrivals = new Int32Array(routeTimeOffset[routes.length] as number);
  const departures = new Int32Array(arrivals.length);
  routes.forEach((r, i) => {
    const first = r[0] as TripInput;
    const k = first.stops.length;
    routeStops.set(first.stops, routeStopOffset[i] as number);
    routeLine[i] = first.line;
    r.forEach((t, j) => {
      const base = (routeTimeOffset[i] as number) + j * k;
      arrivals.set(t.arrivals, base);
      departures.set(t.departures, base);
    });
  });
  const n = stopLat.length;
  const footOffset = new Int32Array(n + 1);
  for (let s = 0; s < n; s++) footOffset[s + 1] = (footOffset[s] as number) + (foot[s]?.length ?? 0);
  const footTo = new Int32Array(footOffset[n] as number);
  const footSecs = new Int32Array(footTo.length);
  for (let s = 0; s < n; s++) {
    (foot[s] ?? []).forEach(([to, secs], k) => {
      footTo[(footOffset[s] as number) + k] = to;
      footSecs[(footOffset[s] as number) + k] = secs;
    });
  }
  return {
    stopCount: n,
    stopLat: Float32Array.from(stopLat),
    stopLon: Float32Array.from(stopLon),
    routeStopOffset,
    routeStops,
    routeLine,
    routeTimeOffset,
    arrivals,
    departures,
    footOffset,
    footTo,
    footSecs,
  };
}
