import {expect, test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {decode} from '../src/core/timetable';
import {DETOUR_FACTOR, WALK_SPEED_MPS, metres} from '../src/core/walk';
import {indexStops, raptor} from './raptor';

const file = new URL('../public/data/timetable-weekday.bin', import.meta.url).pathname;

test('a real-feed query from Helsinki railway square takes under a second', () => {
  const tt = decode(readFileSync(file) as unknown as Uint8Array);
  const idx = indexStops(tt);
  const lat = 60.1719;
  const lon = 24.9414;
  const sources = [];
  for (let s = 0; s < tt.stopCount; s++) {
    const m = metres(lat, lon, tt.stopLat[s] as number, tt.stopLon[s] as number);
    if (m < 600) sources.push({stop: s, time: 8 * 3600 + Math.round((m * DETOUR_FACTOR) / WALK_SPEED_MPS)});
  }
  expect(sources.length).toBeGreaterThan(0);
  const started = performance.now();
  const r = raptor(tt, idx, sources, 6);
  const elapsed = performance.now() - started;
  let within60 = 0;
  for (const a of r.arrival) if (a <= 9 * 3600) within60++;
  expect(within60).toBeGreaterThan(500);
  expect(elapsed).toBeLessThan(1000);
});
