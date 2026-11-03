import {expect, test} from 'bun:test';
import {fixture, h} from './fixture';
import {indexStops, raptor} from './raptor';

const tt = fixture();
const idx = indexStops(tt);
const [A, B, C, D, E, F, G] = [0, 1, 2, 3, 4, 5, 6];

// Worked by hand. Leaving A at 08:00 rides R1 to B 08:10 and C 08:20. R2 leaves
// C at 08:25 and reaches D 08:35 and E 08:45. R3 leaves B at 08:15 and reaches F
// at 08:30; walking F -> E takes five minutes, so E is reached at 08:35, ahead of R2.
test('earliest arrivals leaving at 08:00', () => {
  const r = raptor(tt, idx, [{stop: A, time: h(8, 0)}], 5);
  expect(Array.from(r.arrival.slice(0, 6))).toEqual([h(8, 0), h(8, 10), h(8, 20), h(8, 35), h(8, 35), h(8, 30)]);
  expect(r.arrival[G]).toBe(Infinity);
  expect(Array.from(r.rounds)).toEqual([0, 1, 1, 2, 2, 2, -1]);
});

// Leaving at 08:05 misses the 08:00 train. The 08:30 train reaches B 08:40 and C
// 08:50; R3 has gone, so F is only reached on foot from E: R2 09:00 -> E 09:20 + 5 min.
test('a missed first train shifts every arrival', () => {
  const r = raptor(tt, idx, [{stop: A, time: h(8, 5)}], 5);
  expect(Array.from(r.arrival.slice(0, 6))).toEqual([h(8, 5), h(8, 40), h(8, 50), h(9, 10), h(9, 20), h(9, 25)]);
});

test('a single round cannot make the change at C', () => {
  const r = raptor(tt, idx, [{stop: A, time: h(8, 0)}], 1);
  expect(r.arrival[C]).toBe(h(8, 20));
  expect(r.arrival[E]).toBe(Infinity);
});

test('starting on a walkable stop reaches its neighbour at round 0', () => {
  const r = raptor(tt, idx, [{stop: E, time: h(8, 0)}], 3);
  expect(r.arrival[F]).toBe(h(8, 5));
  expect(r.rounds[F]).toBe(0);
});

test('later sources do not beat an earlier one at the same stop', () => {
  const r = raptor(tt, idx, [{stop: A, time: h(8, 0)}, {stop: A, time: h(9, 0)}], 5);
  expect(r.arrival[A]).toBe(h(8, 0));
});

test('a source with no service finds nothing beyond itself', () => {
  const r = raptor(tt, idx, [{stop: G, time: h(8, 0)}], 5);
  expect(r.arrival[A]).toBe(Infinity);
});

test('a source after the last train finds nothing ahead', () => {
  const r = raptor(tt, idx, [{stop: A, time: h(23, 0)}], 5);
  expect(r.arrival[B]).toBe(Infinity);
});

test('catches an earlier trip of a route boarded further along', () => {
  // Two sources on the same line: the one further along must not delay the earlier one.
  const r = raptor(tt, idx, [{stop: C, time: h(8, 25)}, {stop: D, time: h(8, 0)}], 5);
  expect(r.arrival[E]).toBe(h(8, 45));
});
