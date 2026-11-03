// Minimal timetable shape the spike search reads; the real layout and codec live in src/core/timetable.ts.
export interface Timetable {
  stopCount: number;
  routeStopOffset: Int32Array;
  routeStops: Int32Array;
  routeTimeOffset: Int32Array;
  arrivals: Int32Array;
  departures: Int32Array;
  footOffset: Int32Array;
  footTo: Int32Array;
  footSecs: Int32Array;
}

export function routeCount(tt: Timetable): number {
  return tt.routeStopOffset.length - 1;
}
