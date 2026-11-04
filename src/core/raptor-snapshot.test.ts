import {expect, test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {indexStops, journey, raptor} from './raptor';
import {MAX_ROUNDS, reachableWithin, sourcesNear} from './reach';
import {decode} from './timetable';

const file = new URL('../../public/data/timetable-weekday.bin', import.meta.url).pathname;
const EIGHT = 8 * 3600;

test('a query from Helsinki railway square on the committed weekday takes under a second', () => {
  const tt = decode(readFileSync(file) as unknown as Uint8Array);
  const idx = indexStops(tt);
  const sources = sourcesNear(tt, 60.1719, 24.9414, EIGHT);
  expect(sources.length).toBeGreaterThan(0);
  const started = performance.now();
  const r = raptor(tt, idx, sources, MAX_ROUNDS);
  const elapsed = performance.now() - started;
  expect(reachableWithin(r.arrival, EIGHT, 60)).toBeGreaterThan(500);
  expect(elapsed).toBeLessThan(1000);

  // Every journey starts at a source and its legs chain in time and place.
  let checked = 0;
  for (let s = 0; s < tt.stopCount && checked < 200; s++) {
    if (!(r.arrival[s] as number < Infinity)) continue;
    const legs = journey(r, s);
    checked++;
    if (legs.length === 0) continue;
    expect(sources.some((x) => x.stop === legs[0]?.from)).toBe(true);
    expect(legs[legs.length - 1]?.to).toBe(s);
    expect(legs[legs.length - 1]?.arrive).toBe(r.arrival[s] as number);
    for (let i = 1; i < legs.length; i++) {
      expect(legs[i]?.from).toBe(legs[i - 1]?.to as number);
      expect(legs[i]?.depart as number).toBeGreaterThanOrEqual(legs[i - 1]?.arrive as number);
    }
  }
});
