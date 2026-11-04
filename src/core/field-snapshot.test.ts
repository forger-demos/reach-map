import {expect, test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {computeField, makeGrid, reachedCells, REGION, CELL_METRES} from './field';
import {indexStops, raptor} from './raptor';
import {MAX_ROUNDS, sourcesNear} from './reach';
import {decode} from './timetable';

const file = new URL('../../public/data/timetable-weekday.bin', import.meta.url).pathname;
const EIGHT = 8 * 3600;

test('the field for the whole region from the committed weekday takes under half a second', () => {
  const tt = decode(readFileSync(file) as unknown as Uint8Array);
  const idx = indexStops(tt);
  const grid = makeGrid(REGION, CELL_METRES);
  const result = raptor(tt, idx, sourcesNear(tt, 60.1719, 24.9414, EIGHT), MAX_ROUNDS);
  const started = performance.now();
  const field = computeField(grid, {stopLat: tt.stopLat, stopLon: tt.stopLon, arrival: result.arrival, departure: EIGHT});
  const elapsed = performance.now() - started;
  expect(field.length).toBe(grid.cols * grid.rows);
  expect(reachedCells(field)).toBeGreaterThan(1000);
  expect(elapsed).toBeLessThan(500);
});
