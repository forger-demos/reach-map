// From a clicked point to coloured stops: the sources a click walks to and the time bands of the result.
import type {Source} from './raptor';
import type {Timetable} from './timetable';
import {MAX_ORIGIN_METRES, metres, walkSeconds} from './walk';

/** Upper bound of each band, in minutes. A stop is in the first band that holds its travel time. */
export const BAND_MINUTES = [15, 30, 45, 60] as const;

/** Seconds from the start of the service day at which a click leaves: 08:00. */
export const DEFAULT_DEPARTURE = 8 * 3600;

/** Rounds of the search: one more than the vehicle legs the traveller may use. */
export const MAX_ROUNDS = 6;

/** The stops within walking range of a point, each with the time the traveller reaches it. */
export function sourcesNear(
  tt: Pick<Timetable, 'stopCount' | 'stopLat' | 'stopLon'>,
  lat: number,
  lon: number,
  departure: number,
): Source[] {
  const sources: Source[] = [];
  for (let s = 0; s < tt.stopCount; s++) {
    const m = metres(lat, lon, tt.stopLat[s] as number, tt.stopLon[s] as number);
    if (m <= MAX_ORIGIN_METRES) sources.push({stop: s, time: departure + walkSeconds(m)});
  }
  return sources;
}

/** Band index (0 for the first) of each stop, -1 where it takes longer than the last band or is unreachable. */
export function bandsOf(arrival: ArrayLike<number>, departure: number): Int8Array {
  const out = new Int8Array(arrival.length).fill(-1);
  for (let s = 0; s < arrival.length; s++) {
    const minutes = ((arrival[s] as number) - departure) / 60;
    out[s] = BAND_MINUTES.findIndex((limit) => minutes <= limit);
  }
  return out;
}

/** How many stops are reached within the given number of minutes. */
export function reachableWithin(arrival: ArrayLike<number>, departure: number, minutes: number): number {
  let n = 0;
  for (let s = 0; s < arrival.length; s++) if (((arrival[s] as number) - departure) / 60 <= minutes) n++;
  return n;
}
