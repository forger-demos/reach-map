import {expect, test} from 'bun:test';
import {DETOUR_FACTOR, footpaths, MAX_TRANSFER_METRES, metres, walkSeconds, WALK_SPEED_MPS} from './walk';

// One degree of longitude at 60N is about 55.8 km, so 0.001 degrees is about 55.8 m.
const near = metres(60, 24, 60, 24.001);

test('distance on the ground', () => {
  expect(near).toBeGreaterThan(55);
  expect(near).toBeLessThan(56.5);
  expect(metres(60, 24, 60, 24)).toBe(0);
});

test('walking time is straight line times detour over speed', () => {
  expect(walkSeconds(125)).toBe(Math.round((125 * DETOUR_FACTOR) / WALK_SPEED_MPS));
  expect(walkSeconds(125)).toBe(130);
});

test('transfers reach stops inside the cap and no others', () => {
  const lat = [60.0, 60.0, 60.0, 60.0];
  const lon = [24.0, 24.001, 24.1, 24.0069];
  const f = footpaths(lat, lon);
  const far = metres(60, 24, 60, 24.0069);
  expect(f[0]).toEqual([[1, walkSeconds(near)], [3, walkSeconds(far)]]);
  expect(f[1]?.map(([to]) => to).sort()).toEqual([0, 3]);
  expect(f[2]).toEqual([]);
  // 0.0069 degrees is about 385 m, inside the cap.
  expect(far).toBeLessThan(MAX_TRANSFER_METRES);
});

test('a stop just past the cap is not a transfer', () => {
  expect(footpaths([60, 60], [24, 24.0075])[0]).toEqual([]);
});
