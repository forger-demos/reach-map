import {expect, test} from 'bun:test';
import {BOTH, cellsWithin, diffFields, isFlat, NEITHER, ONLY_FIRST, ONLY_SECOND, readout} from './diff';

const MIN = 60;
const first = [10 * MIN, 20 * MIN, Infinity, 40 * MIN, Infinity];
const second = [5 * MIN, 25 * MIN, 30 * MIN, Infinity, Infinity];

test('each cell is classified by which side reaches it, with a delta only where both do', () => {
  const d = diffFields(first, second);
  expect(Array.from(d.kind)).toEqual([BOTH, BOTH, ONLY_SECOND, ONLY_FIRST, NEITHER]);
  // second minus first: 5 - 10 = -5 min (quicker), 25 - 20 = +5 min (slower).
  expect(d.delta[0]).toBe(-5 * MIN);
  expect(d.delta[1]).toBe(5 * MIN);
  expect(Number.isNaN(d.delta[2])).toBe(true);
  expect(Number.isNaN(d.delta[3])).toBe(true);
  expect(Number.isNaN(d.delta[4])).toBe(true);
});

test('fields of different sizes cannot be compared', () => {
  expect(() => diffFields([1, 2], [1])).toThrow();
});

test('cells within a time count the inclusive limit and skip the unreached', () => {
  expect(cellsWithin(first, 20)).toBe(2);
  expect(cellsWithin(second, 30)).toBe(3);
  expect(cellsWithin([Infinity], 60)).toBe(0);
});

test('identical fields are flat; any time or reach difference is not', () => {
  expect(isFlat(diffFields(first, first))).toBe(true);
  expect(isFlat(diffFields([60], [120]))).toBe(false);
  expect(isFlat(diffFields([Infinity], [60]))).toBe(false);
  expect(isFlat(diffFields([60], [Infinity]))).toBe(false);
  expect(isFlat(diffFields([Infinity], [Infinity]))).toBe(true);
});

test('the readout says more, fewer or the same within the limit', () => {
  // Within 30 minutes: first reaches 2 cells, second reaches 3.
  expect(readout(first, second, 30)).toBe('The second reaches 1 cell more than the first within 30 minutes.');
  expect(readout(second, first, 30)).toBe('The second reaches 1 cell fewer than the first within 30 minutes.');
  expect(readout([10 * MIN, 20 * MIN, 30 * MIN], [20 * MIN, 10 * MIN, 30 * MIN], 30)).toBe('Both reach the same number of cells within 30 minutes.');
  expect(readout([Infinity, Infinity, Infinity, Infinity], [1, 2, 3, 4], 30)).toBe('The second reaches 4 cells more than the first within 30 minutes.');
});
