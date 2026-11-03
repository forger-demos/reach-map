import {expect, test} from 'bun:test';
import {parseGtfsTime} from './gtfs-time';

test('parses clock times to seconds', () => {
  expect(parseGtfsTime('08:05:09')).toBe(8 * 3600 + 5 * 60 + 9);
  expect(parseGtfsTime('8:00:00')).toBe(28800);
});

test('hours past 24 are kept, not wrapped', () => {
  expect(parseGtfsTime('24:10:00')).toBe(87000);
  expect(parseGtfsTime('25:00:00')).toBe(90000);
});

test('blank and malformed times are null', () => {
  expect(parseGtfsTime('')).toBeNull();
  expect(parseGtfsTime(' ')).toBeNull();
  expect(parseGtfsTime('08:00')).toBeNull();
});
