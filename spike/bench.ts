// Throwaway spike CLI: bun spike/bench.ts <timetable.bin>
import {readFileSync} from 'node:fs';
import {indexStops, raptor} from './raptor';
import {decode, metres} from './timetable';

const t0 = performance.now();
const tt = decode(readFileSync(process.argv[2] as string) as unknown as Uint8Array);
const idx = indexStops(tt);
const load = performance.now() - t0;
const spots: Array<[string, number, number]> = [
  ['Railway square', 60.1719, 24.9414],
  ['Itakeskus', 60.2100, 25.0830],
  ['Espoo Leppavaara', 60.2190, 24.8130],
  ['Vantaa Tikkurila', 60.2920, 25.0440],
  ['Kauniainen', 60.2100, 24.7280],
];
for (const [name, lat, lon] of spots) {
  const sources = [];
  for (let s = 0; s < tt.stopCount; s++) {
    const m = metres(lat, lon, tt.stopLat[s] as number, tt.stopLon[s] as number);
    if (m < 600) sources.push({stop: s, time: 8 * 3600 + Math.round((m * 1.3) / 1.25)});
  }
  const times: number[] = [];
  let within = [0, 0, 0, 0];
  for (let i = 0; i < 5; i++) {
    const t = performance.now();
    const r = raptor(tt, idx, sources, 6);
    times.push(performance.now() - t);
    within = [900, 1800, 2700, 3600].map((d) => r.arrival.filter((a) => a <= 8 * 3600 + d).length);
  }
  console.log(name, `sources=${sources.length}`, `query ms=${times.map((x) => x.toFixed(0)).join('/')}`, `stops within 15/30/45/60 = ${within.join('/')}`);
}
console.log(`load+index ms=${load.toFixed(0)}`);
