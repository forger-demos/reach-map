/**
 * Seconds from the start of the service day for a GTFS `H:MM:SS` time. Hours may pass 24:
 * a trip leaving at 25:10:00 runs after midnight but belongs to the day it started on.
 * Returns null for a blank or malformed time.
 */
export function parseGtfsTime(text: string): number | null {
  const m = /^\s*(\d+):(\d{2}):(\d{2})\s*$/.exec(text);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}
