import {expect, test} from 'bun:test';
import {contour, type Line} from './contour';
import {contoursGeoJson} from './contour-geojson';
import type {Grid} from './field';

// Unit cells: column c has its centre at longitude c + 0.5 and row r at latitude rows - r - 0.5.
const unit = (cols: number, rows: number): Grid => ({west: 0, south: 0, east: cols, north: rows, cols, rows, stepLon: 1, stepLat: 1});

/** Rounded, direction-free and ordered, so a test names the expected geometry and not the walk order. */
function shape(lines: Line[]): string[] {
  const r = (n: number) => Math.round(n * 1e6) / 1e6;
  return lines
    .map((l) => {
      const pts = (l.closed ? l.coordinates.slice(0, -1) : l.coordinates).map(([x, y]) => `${r(x)},${r(y)}`);
      return (l.closed ? 'ring ' : 'line ') + (l.closed ? [...pts].sort() : pts[0]! < pts[pts.length - 1]! ? pts : [...pts].reverse()).join(' ');
    })
    .sort();
}

test('a single peak gives one closed ring through the edge points where the value crosses', () => {
  // 5x5; the middle cell is 0, its four neighbours 10, the rest 100. Threshold 5 crosses halfway
  // along each line from the middle centre (2.5, 2.5) to a neighbour.
  const v = new Array<number>(25).fill(100);
  v[12] = 0;
  for (const i of [7, 11, 13, 17]) v[i] = 10;
  const lines = contour(v, unit(5, 5), 5);
  expect(lines).toHaveLength(1);
  expect(lines[0]!.closed).toBe(true);
  expect(lines[0]!.coordinates[0]).toEqual(lines[0]!.coordinates[lines[0]!.coordinates.length - 1]!);
  expect(shape(lines)).toEqual(['ring 2,2.5 2.5,2 2.5,3 3,2.5']);
});

test('a saddle joins the low corners when the mean is under the threshold and splits them when it is over', () => {
  // 2x2: top-left and bottom-right are 0, the others 10, mean 5. Centres: (0.5, 1.5) (1.5, 1.5) top, (0.5, 0.5) (1.5, 0.5) bottom.
  const v = [0, 10, 10, 0];
  // Threshold 6: mean 5 is under it, so the two low corners are one band, cut off from the high corners.
  expect(shape(contour(v, unit(2, 2), 6))).toEqual(['line 0.5,0.9 0.9,0.5', 'line 1.1,1.5 1.5,1.1']);
  // Threshold 4: mean 5 is over it, so each low corner is cut off by itself.
  expect(shape(contour(v, unit(2, 2), 4))).toEqual(['line 0.5,1.1 0.9,1.5', 'line 1.1,0.5 1.5,0.9']);
});

test('the other saddle orientation is resolved the same way', () => {
  const v = [10, 0, 0, 10];
  // Low corners top-right and bottom-left. Threshold 6 joins them; threshold 4 keeps them apart.
  expect(shape(contour(v, unit(2, 2), 6))).toEqual(['line 0.5,1.1 0.9,1.5', 'line 1.1,0.5 1.5,0.9']);
  expect(shape(contour(v, unit(2, 2), 4))).toEqual(['line 0.5,0.9 0.9,0.5', 'line 1.1,1.5 1.5,1.1']);
});

test('a grid wholly below or wholly above the threshold has no line', () => {
  expect(contour(new Array(16).fill(0), unit(4, 4), 5)).toEqual([]);
  expect(contour(new Array(16).fill(50), unit(4, 4), 5)).toEqual([]);
  expect(contour(new Array(16).fill(Infinity), unit(4, 4), 5)).toEqual([]);
});

test('a line that meets the edge of the grid stays open', () => {
  // Left column 0, right column 10, threshold 5: a vertical line halfway between the columns.
  expect(shape(contour([0, 10, 0, 10], unit(2, 2), 5))).toEqual(['line 1,0.5 1,1.5']);
});

test('where a reached cell meets an unreached one the vertex sits halfway', () => {
  expect(shape(contour([0, Infinity, Infinity, Infinity], unit(2, 2), 5))).toEqual(['line 0.5,1 1,1.5']);
});

test('the same input gives the same lines, and a value equal to the threshold counts as inside', () => {
  const v = [5, 10, 10, 10];
  expect(contour(v, unit(2, 2), 5)).toEqual(contour(v, unit(2, 2), 5));
  expect(contour(v, unit(2, 2), 5)).toHaveLength(1);
});

test('GeoJSON carries one feature per line with its minutes', () => {
  const v = [0, 10 * 60, 0, 10 * 60];
  const fc = contoursGeoJson(v, unit(2, 2), [5, 15]);
  expect(fc.features.map((f) => f.properties.minutes)).toEqual([5]); // 15 minutes is above every value, so it has no line
  expect(fc.features[0]!.geometry.coordinates).toHaveLength(2);
});
