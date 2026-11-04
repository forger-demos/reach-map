import {expect, test} from 'bun:test';
import {bandsOf, reachableWithin, sourcesNear} from './reach';
import {walkSeconds} from './walk';

const stops = {stopCount: 3, stopLat: new Float32Array([60.17, 60.1705, 60.3]), stopLon: new Float32Array([24.94, 24.94, 24.94])};

test('a click walks to the stops in range and none beyond', () => {
  const sources = sourcesNear(stops, 60.17, 24.94, 8 * 3600);
  // 60.1705 is about 56 m north; 60.3 is about 14 km away.
  expect(sources.map((s) => s.stop)).toEqual([0, 1]);
  expect(sources[0]?.time).toBe(8 * 3600);
  expect(sources[1]?.time).toBe(8 * 3600 + walkSeconds(55.6));
});

test('a click far from every stop has no sources', () => {
  expect(sourcesNear(stops, 59.0, 24.94, 0)).toEqual([]);
});

// Leaving at 08:00: 08:15 is the edge of the first band, 08:16 falls into the second,
// 09:00 is the edge of the last, 09:01 and an unreachable stop are beyond it.
test('bands are inclusive of their upper bound', () => {
  const at = (m: number) => 8 * 3600 + m * 60;
  const b = bandsOf([at(0), at(15), at(16), at(30), at(45), at(60), at(61), Infinity], 8 * 3600);
  expect(Array.from(b)).toEqual([0, 0, 1, 1, 2, 3, -1, -1]);
});

test('the readout counts stops within the limit', () => {
  const at = (m: number) => 8 * 3600 + m * 60;
  expect(reachableWithin([at(5), at(30), at(31), Infinity], 8 * 3600, 30)).toBe(2);
});
