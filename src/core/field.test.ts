import {expect, test} from 'bun:test';
import {cellLat, cellLon, computeField, makeGrid, reachedCells, type Grid} from './field';

// On the equator 0.001 degrees is 111.195 m in both directions, so walking k cells takes
// round(k * 111.195 * 1.3 / 1.25) seconds: 1 cell 116, 2 cells 231, 3 cells 347.
// The cap below is 400 m: three cells (333.6 m) are inside it, four (444.8 m) are not.
const grid: Grid = {west: 0, south: 0, east: 0.011, north: 0.001, cols: 11, rows: 1, stepLon: 0.001, stepLat: 0.001};
const stopLat = [cellLat(grid, 0), cellLat(grid, 0)];
const stopLon = [cellLon(grid, 1), cellLon(grid, 6)];

test('each cell takes the least of the stops that reach it, and cells past the cap stay unreached', () => {
  // Stop A (column 1) is reached at 60 s, stop B (column 6) at 0 s.
  const field = computeField(grid, {stopLat, stopLon, arrival: [60, 0], departure: 0, capMetres: 400});
  expect(Array.from(field)).toEqual([
    176, // 0: A, one cell: 60 + 116
    60, // 1: A itself
    176, // 2: A, one cell; B is four cells away, past the cap
    291, // 3: A two cells 60 + 231 beats B three cells 0 + 347
    231, // 4: B two cells 231 beats A three cells 60 + 347 = 407
    116, // 5: B one cell
    0, // 6: B itself
    116, // 7
    231, // 8
    347, // 9: B three cells
    Infinity, // 10: B four cells, 444.8 m, past the 400 m cap
  ]);
});

test('departure is subtracted and the budget cuts cells off', () => {
  const field = computeField(grid, {stopLat, stopLon, arrival: [1060, 1000], departure: 1000, capMetres: 400, budgetSeconds: 300});
  expect(field[3]).toBe(291);
  expect(field[9]).toBe(Infinity); // 347 s is over the 300 s budget
  expect(field[4]).toBe(231);
});

test('a stop that arrives after the budget, or never, paints nothing', () => {
  const field = computeField(grid, {stopLat, stopLon, arrival: [Infinity, 4000], departure: 0, budgetSeconds: 3600});
  expect(reachedCells(field)).toBe(0);
});

test('a stop near the edge only writes cells inside the grid', () => {
  const field = computeField(grid, {stopLat: [0.0005], stopLon: [-0.0005], arrival: [0], departure: 0, capMetres: 400});
  // Column 0 centre is 0.001 degrees (111.2 m) east of the stop.
  expect(field[0]).toBe(116);
  expect(reachedCells(field)).toBe(3);
});

test('the default walk cap and budget apply', () => {
  const field = computeField(grid, {stopLat: [stopLat[0] as number], stopLon: [stopLon[0] as number], arrival: [0], departure: 0});
  // 600 m cap from column 1: column 0 to the west, columns 2 to 6 to the east (five cells, 556 m); six cells (667 m) are out.
  expect(reachedCells(field)).toBe(1 + 1 + 5);
});

test('a grid has cells no larger than asked and rows run north to south', () => {
  const g = makeGrid({west: 24, south: 60, east: 24.1, north: 60.1}, 500);
  expect(g.cols).toBe(Math.ceil((0.1 * 111_195 * Math.cos((60.05 * Math.PI) / 180)) / 500));
  expect(g.rows).toBe(Math.ceil((0.1 * 111_195) / 500));
  expect(g.stepLat * 111_195).toBeLessThanOrEqual(500);
  expect(cellLat(g, 0)).toBeGreaterThan(cellLat(g, 1));
  expect(cellLon(g, 0)).toBeLessThan(cellLon(g, 1));
  expect(cellLat(g, 0)).toBeCloseTo(60.1 - g.stepLat / 2, 9);
});
