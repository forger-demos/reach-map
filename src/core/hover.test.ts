import {expect, test} from 'bun:test';
import {fixture, h} from './fixtures/raptor';
import {hoverJourney} from './hover';
import {pathGeoJson} from './journey-geojson';
import {indexStops, raptor} from './raptor';

const tt = fixture();
const result = raptor(tt, indexStops(tt), [{stop: 0, time: h(8, 0)}], 5);
const origin = {lat: 60.0, lon: 24.0};
const departure = h(8, 0);
// Stops sit on lat 60.0, 0.01 degrees of longitude (about 555 m) apart.

test('a point on the origin stop is a walk-only journey', () => {
  const hover = hoverJourney(tt, result, origin, departure, 60.0, 24.0);
  expect(hover?.stop).toBe(0);
  expect(hover?.legs).toEqual([]);
  expect(hover?.input.totalSecs).toBe(0);
});

test('a point is reached from the stop that is soonest including the walk', () => {
  // On C (08:20) the walk of 555 m from B costs 578 s on top of 08:10, i.e. 08:19:38, which is sooner.
  const hover = hoverJourney(tt, result, origin, departure, 60.0, 24.02);
  expect(hover?.stop).toBe(1);
  expect(hover?.input.endWalkSecs).toBe(578);
});

test('the walk from the stop is added to its arrival', () => {
  // About 55.5 m east of B: 55.5 * 1.3 / 1.25 = 58 s after the 08:10 arrival.
  const hover = hoverJourney(tt, result, origin, departure, 60.0, 24.011);
  expect(hover?.stop).toBe(1);
  expect(hover?.input.endWalkSecs).toBe(58);
  expect(hover?.input.totalSecs).toBe(600 + 58);
});

test('a point beyond the walking cap of every stop has no journey', () => {
  expect(hoverJourney(tt, result, origin, departure, 60.1, 24.0)).toBeNull();
});

test('a stop the search never reached has no journey', () => {
  expect(hoverJourney(tt, result, origin, departure, 60.0, 24.08)).toBeNull();
});

test('the path runs origin, each leg by mode, then the last walk', () => {
  const hover = hoverJourney(tt, result, origin, departure, 60.0, 24.011)!;
  const path = pathGeoJson({
    legs: hover.legs,
    origin: [24.0, 60.0],
    point: [24.011, 60.0],
    stop: hover.stop,
    stopLat: tt.stopLat,
    stopLon: tt.stopLon,
    modeOf: () => 'tram',
  });
  expect(path.features.map((f) => f.properties.mode)).toEqual(['walk', 'tram', 'walk']);
  expect(path.features[1]?.geometry.coordinates[0]?.[0]).toBeCloseTo(24.0, 4);
  expect(path.features[1]?.geometry.coordinates[1]?.[0]).toBeCloseTo(24.01, 4);
});
