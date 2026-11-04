// From a hovered point to the journey that reaches it, reusing the result of the search.
import type {JourneyInput} from './describe';
import {journey, type Leg, type Result} from './raptor';
import type {Timetable} from './timetable';
import {MAX_FIELD_WALK_METRES, metres, walkSeconds} from './walk';

export interface Hover {
  /** The stop from which the traveller walks to the point. */
  stop: number;
  legs: Leg[];
  input: JourneyInput;
}

export interface Origin {
  lat: number;
  lon: number;
}

/** Longest journey the colour field shows, in seconds. */
export const MAX_TOTAL_SECS = 3600;

/**
 * The stop that gets the traveller to the point soonest, arrival plus walk, or null when no stop
 * within the walking cap does so inside the longest band. Does not search again.
 */
export function hoverJourney(
  tt: Pick<Timetable, 'stopCount' | 'stopLat' | 'stopLon'>,
  result: Result,
  origin: Origin,
  departure: number,
  lat: number,
  lon: number,
): Hover | null {
  let best = -1;
  let bestAt = Infinity;
  let bestWalk = 0;
  for (let s = 0; s < tt.stopCount; s++) {
    const arrival = result.arrival[s] as number;
    if (arrival >= bestAt) continue;
    const m = metres(lat, lon, tt.stopLat[s] as number, tt.stopLon[s] as number);
    if (m > MAX_FIELD_WALK_METRES) continue;
    const walk = walkSeconds(m);
    if (arrival + walk < bestAt) {
      best = s;
      bestAt = arrival + walk;
      bestWalk = walk;
    }
  }
  if (best < 0 || bestAt - departure > MAX_TOTAL_SECS) return null;
  const legs = journey(result, best);
  const first = legs[0]?.from ?? best;
  const startWalkSecs = walkSeconds(metres(origin.lat, origin.lon, tt.stopLat[first] as number, tt.stopLon[first] as number));
  return {stop: best, legs, input: {legs, startWalkSecs, endWalkSecs: bestWalk, totalSecs: bestAt - departure}};
}
