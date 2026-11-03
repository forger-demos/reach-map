// Throwaway spike: round-based earliest-arrival search (RAPTOR) over a Timetable.
import {type Timetable, routeCount} from './timetable';

export interface Source {
  stop: number;
  /** Seconds since midnight at which the traveller is at this stop. */
  time: number;
}

export interface Result {
  /** Earliest arrival per stop, Infinity when unreachable. */
  arrival: Float64Array;
  /** Fewest rounds (vehicle legs) in which the earliest arrival was found. */
  rounds: Int8Array;
}

export interface StopIndex {
  offset: Int32Array;
  route: Int32Array;
  pos: Int32Array;
}

/** For each stop, the routes serving it and its position on each. */
export function indexStops(tt: Timetable): StopIndex {
  const counts = new Int32Array(tt.stopCount + 1);
  for (const s of tt.routeStops) counts[s + 1] = (counts[s + 1] ?? 0) + 1;
  for (let s = 0; s < tt.stopCount; s++) counts[s + 1] = (counts[s + 1] ?? 0) + (counts[s] ?? 0);
  const fill = counts.slice(0, tt.stopCount);
  const route = new Int32Array(tt.routeStops.length);
  const pos = new Int32Array(tt.routeStops.length);
  for (let r = 0; r < routeCount(tt); r++) {
    const from = tt.routeStopOffset[r] as number;
    const to = tt.routeStopOffset[r + 1] as number;
    for (let i = from; i < to; i++) {
      const s = tt.routeStops[i] as number;
      const at = fill[s] as number;
      fill[s] = at + 1;
      route[at] = r;
      pos[at] = i - from;
    }
  }
  return {offset: counts, route, pos};
}

/** Index of the first trip departing stop position i at or after time, or -1. */
function firstTrip(tt: Timetable, r: number, k: number, i: number, time: number): number {
  const base = tt.routeTimeOffset[r] as number;
  const trips = ((tt.routeTimeOffset[r + 1] as number) - base) / k;
  let lo = 0;
  let hi = trips;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((tt.departures[base + mid * k + i] as number) >= time) hi = mid;
    else lo = mid + 1;
  }
  return lo < trips ? lo : -1;
}

export function raptor(tt: Timetable, idx: StopIndex, sources: Source[], maxRounds: number): Result {
  const n = tt.stopCount;
  const best = new Float64Array(n).fill(Infinity);
  let prev = new Float64Array(n).fill(Infinity);
  const rounds = new Int8Array(n).fill(-1);
  let marked = new Set<number>();

  const relaxFeet = (from: Set<number>, cur: Float64Array, round: number, into: Set<number>) => {
    for (const s of from) {
      const t = cur[s] as number;
      for (let e = tt.footOffset[s] as number; e < (tt.footOffset[s + 1] as number); e++) {
        const to = tt.footTo[e] as number;
        const at = t + (tt.footSecs[e] as number);
        if (at < (best[to] as number)) {
          best[to] = at;
          cur[to] = at;
          rounds[to] = round;
          into.add(to);
        }
      }
    }
  };

  for (const {stop, time} of sources) {
    if (time < (best[stop] as number)) {
      best[stop] = time;
      prev[stop] = time;
      rounds[stop] = 0;
      marked.add(stop);
    }
  }
  relaxFeet(new Set(marked), prev, 0, marked);

  for (let round = 1; round <= maxRounds && marked.size > 0; round++) {
    const queue = new Map<number, number>();
    for (const s of marked) {
      for (let e = idx.offset[s] as number; e < (idx.offset[s + 1] as number); e++) {
        const r = idx.route[e] as number;
        const p = idx.pos[e] as number;
        const old = queue.get(r);
        if (old === undefined || p < old) queue.set(r, p);
      }
    }
    const cur = new Float64Array(prev);
    const next = new Set<number>();
    for (const [r, from] of queue) {
      const stopFrom = tt.routeStopOffset[r] as number;
      const k = (tt.routeStopOffset[r + 1] as number) - stopFrom;
      const timeBase = tt.routeTimeOffset[r] as number;
      let trip = -1;
      for (let i = from; i < k; i++) {
        const s = tt.routeStops[stopFrom + i] as number;
        if (trip >= 0) {
          const at = tt.arrivals[timeBase + trip * k + i] as number;
          if (at < (best[s] as number)) {
            best[s] = at;
            cur[s] = at;
            rounds[s] = round;
            next.add(s);
          }
        }
        const ready = prev[s] as number;
        if (ready < Infinity && (trip < 0 || ready <= (tt.departures[timeBase + trip * k + i] as number))) {
          const t = firstTrip(tt, r, k, i, ready);
          if (t >= 0 && (trip < 0 || t < trip)) trip = t;
        }
      }
    }
    relaxFeet(new Set(next), cur, round, next);
    prev = cur;
    marked = next;
  }
  return {arrival: best, rounds};
}
