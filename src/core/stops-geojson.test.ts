import {expect, test} from 'bun:test';
import {stopsGeoJson} from './stops-geojson';

test('stops become points in longitude, latitude order', () => {
  const fc = stopsGeoJson({stopCount: 2, stopLat: Float32Array.from([60.5, 61]), stopLon: Float32Array.from([24.5, 25])});
  expect(fc.features.map((f) => [f.properties.id, ...f.geometry.coordinates])).toEqual([[0, 24.5, 60.5], [1, 25, 61]]);
});
