import {expect, test} from 'bun:test';
import {stopsGeoJson} from './stops-geojson';

test('stops become points in longitude, latitude order', () => {
  const fc = stopsGeoJson({stopCount: 2, stopLat: Float32Array.from([60.5, 61]), stopLon: Float32Array.from([24.5, 25])});
  expect(fc.features.map((f) => [f.properties.id, ...f.geometry.coordinates])).toEqual([[0, 24.5, 60.5], [1, 25, 61]]);
});

test('bands, when given, ride along on each stop', () => {
  const fc = stopsGeoJson({stopCount: 2, stopLat: new Float32Array([60, 61]), stopLon: new Float32Array([24, 25])}, [0, -1]);
  expect(fc.features.map((f) => f.properties)).toEqual([{id: 0, band: 0}, {id: 1, band: -1}]);
});
