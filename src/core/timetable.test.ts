import {expect, test} from 'bun:test';
import {buildTimetable, decode, encode, groupRoutes, routeCount, tripCount, type TripInput} from './timetable';

const trip = (line: number, stops: number[], times: number[]): TripInput => ({line, stops, arrivals: times, departures: times});

// Two trips of line 7 over stops 0,1,2 and one of line 8 over 2,1. Stop 2 walks to stop 3 in 90 s.
const trips = [trip(7, [0, 1, 2], [100, 200, 300]), trip(7, [0, 1, 2], [400, 500, 600]), trip(8, [2, 1], [50, 150])];
const foot: Array<Array<[number, number]>> = [[], [], [[3, 90]], [[2, 90]]];
const tt = buildTimetable([60, 60.1, 60.2, 60.3], [24, 24.1, 24.2, 24.3], trips, foot);

test('layout of a hand-built timetable', () => {
  expect(routeCount(tt)).toBe(2);
  expect(Array.from(tt.routeStopOffset)).toEqual([0, 3, 5]);
  expect(Array.from(tt.routeStops)).toEqual([0, 1, 2, 2, 1]);
  expect(Array.from(tt.routeLine)).toEqual([7, 8]);
  expect(Array.from(tt.routeTimeOffset)).toEqual([0, 6, 8]);
  expect(Array.from(tt.arrivals)).toEqual([100, 200, 300, 400, 500, 600, 50, 150]);
  expect(Array.from(tt.footOffset)).toEqual([0, 0, 0, 1, 2]);
  expect(Array.from(tt.footTo)).toEqual([3, 2]);
  expect(Array.from(tt.footSecs)).toEqual([90, 90]);
  expect(tt.stopCount).toBe(4);
});

test('trip counts per route', () => {
  expect([tripCount(tt, 0), tripCount(tt, 1)]).toEqual([2, 1]);
  expect(tripCount({...tt, routeStopOffset: new Int32Array([0, 0]), routeTimeOffset: new Int32Array([0, 0])}, 0)).toBe(0);
});

test('missing foot lists count as no transfers', () => {
  const t = buildTimetable([60, 60.1], [24, 24.1], [trip(0, [0, 1], [0, 10])], []);
  expect(Array.from(t.footOffset)).toEqual([0, 0, 0]);
});

test('encode then decode round-trips every field', () => {
  expect(decode(encode(tt))).toEqual(tt);
});

test('times past 24 hours survive the round trip', () => {
  const t = buildTimetable([60, 60.1], [24, 24.1], [trip(0, [0, 1], [86_000, 90_000])], [[], []]);
  expect(Array.from(decode(encode(t)).arrivals)).toEqual([86_000, 90_000]);
});

test('decoding a Node Buffer copies instead of aliasing the file', () => {
  const bytes = encode(tt);
  // A Buffer allocated from a pool shares one ArrayBuffer with other data and has a non-zero offset.
  const padded = new Uint8Array(12 + bytes.length).fill(0xff);
  padded.set(bytes, 12);
  const pooled = Buffer.from(padded.buffer, 12);
  expect(pooled.byteOffset).toBeGreaterThan(0);
  const back = decode(pooled as unknown as Uint8Array);
  expect(back).toEqual(tt);
  expect(back.arrivals.buffer.byteLength).toBe(back.arrivals.byteLength);
  expect(back.stopLat.buffer.byteLength).toBe(back.stopLat.byteLength);
});

test('a foreign or short file is refused', () => {
  expect(() => decode(new Uint8Array(16))).toThrow('not a reach-map timetable');
  expect(() => decode(new Uint8Array(2))).toThrow('not a reach-map timetable');
});

test('a trip that would overtake another starts a new route', () => {
  const slow = trip(0, [0, 1], [0, 1000]);
  const fast = trip(0, [0, 1], [10, 100]);
  const later = trip(0, [0, 1], [20, 2000]);
  const routes = groupRoutes([later, fast, slow]);
  expect(routes.map((r) => r.length).sort()).toEqual([1, 2]);
  expect(routes.find((r) => r.length === 2)).toEqual([slow, later]);
});

test('the same stops on different lines are different routes', () => {
  expect(groupRoutes([trip(1, [0, 1], [0, 10]), trip(2, [0, 1], [100, 110])]).length).toBe(2);
});
