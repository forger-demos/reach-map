import {buildTimetable, type TripInput} from '../timetable';

export const h = (hh: number, mm: number) => hh * 3600 + mm * 60;

/**
 * Seven stops A..G (0..6) on three lines:
 *   R1  A -> B -> C   departs A 08:00 and 08:30, 10 minutes per hop
 *   R2  C -> D -> E   departs C 08:25 and 09:00, 10 minutes per hop
 *   R3  B -> F        departs B 08:15, arrives F 08:30
 * and a five minute walk between E and F. G is served by nothing.
 */
export function fixture() {
  const trip = (stops: number[], times: number[]): TripInput => ({line: 0, stops, arrivals: times, departures: times});
  const trips = [
    trip([0, 1, 2], [h(8, 0), h(8, 10), h(8, 20)]),
    trip([0, 1, 2], [h(8, 30), h(8, 40), h(8, 50)]),
    trip([2, 3, 4], [h(8, 25), h(8, 35), h(8, 45)]),
    trip([2, 3, 4], [h(9, 0), h(9, 10), h(9, 20)]),
    trip([1, 5], [h(8, 15), h(8, 30)]),
  ];
  const foot: Array<Array<[number, number]>> = [[], [], [], [], [[5, 300]], [[4, 300]], []];
  const lat = [60.0, 60.0, 60.0, 60.0, 60.0, 60.0, 60.0];
  const lon = [24.0, 24.01, 24.02, 24.03, 24.04, 24.05, 24.06];
  return buildTimetable(lat, lon, trips, foot);
}
