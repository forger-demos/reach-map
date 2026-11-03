import {expect, test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {indexStops, raptor} from './raptor';
import {decode, metres} from './timetable';

// The HSL weekday of 2026-11-04 processed by spike/build-feed.ts, gzipped.
const file = new URL('./fixtures/hsl-weekday-20261104.bin.gz', import.meta.url).pathname;

test('a real-feed query from Helsinki railway square takes under a second', () => {
  const tt = decode(Bun.gunzipSync(readFileSync(file) as unknown as Uint8Array));
  const idx = indexStops(tt);
  const lat = 60.1719;
  const lon = 24.9414;
  const sources = [];
  for (let s = 0; s < tt.stopCount; s++) {
    const m = metres(lat, lon, tt.stopLat[s] as number, tt.stopLon[s] as number);
    if (m < 600) sources.push({stop: s, time: 8 * 3600 + Math.round((m * 1.3) / 1.25)});
  }
  expect(sources.length).toBeGreaterThan(0);
  const started = performance.now();
  const r = raptor(tt, idx, sources, 6);
  const elapsed = performance.now() - started;
  let within60 = 0;
  for (const a of r.arrival) if (a <= 9 * 3600) within60++;
  console.log(`query ${elapsed.toFixed(1)} ms, ${within60} stops within an hour`);
  expect(within60).toBeGreaterThan(500);
  expect(elapsed).toBeLessThan(1000);
});
