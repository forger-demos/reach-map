import {expect, test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {validateManifest} from './core/manifest';
import {DAY_TYPES, dayTypeOf} from './core/service-day';
import {decode, routeCount} from './core/timetable';

// The committed snapshot is read from disk; refreshing it is `bun run data:build`.
const dir = new URL('../public/data/', import.meta.url);
const manifest = validateManifest(JSON.parse(readFileSync(new URL('manifest.json', dir), 'utf8')));
const MAX_GZIP_BYTES = 3 * 1024 * 1024;

test('the manifest names the publisher, licence, feed version and three dates of the right day types', () => {
  expect(manifest.publisher.name.length).toBeGreaterThan(0);
  expect(manifest.license.name).toBe('CC BY 4.0');
  expect(manifest.feedVersion.length).toBeGreaterThan(0);
  for (const d of DAY_TYPES) {
    expect(dayTypeOf(manifest.dates[d])).toBe(d);
    expect(manifest.dates[d] >= manifest.feedStartDate && manifest.dates[d] <= manifest.feedEndDate).toBe(true);
  }
});

for (const d of DAY_TYPES) {
  test(`the ${d} file decodes, matches the manifest and is under 3 MB gzipped`, () => {
    const bytes = readFileSync(new URL(manifest.files[d], dir)) as unknown as Uint8Array;
    expect(Bun.gzipSync(bytes).length).toBeLessThan(MAX_GZIP_BYTES);
    const tt = decode(bytes as unknown as Uint8Array);
    expect(tt.stopCount).toBe(manifest.stops.length);
    expect(routeCount(tt)).toBeGreaterThan(0);
    for (const line of tt.routeLine) expect(manifest.lines[line]).toBeDefined();
    manifest.stops.forEach((s, i) => {
      expect(tt.stopLat[i]).toBeCloseTo(s.lat, 4);
      expect(tt.stopLon[i]).toBeCloseTo(s.lon, 4);
    });
  });
}
