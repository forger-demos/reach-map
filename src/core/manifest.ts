import {DAY_TYPES, type DayType, isDate} from './service-day';

export type Mode = 'tram' | 'metro' | 'rail' | 'bus' | 'ferry';

export interface ManifestStop {
  name: string;
  lat: number;
  lon: number;
}

export interface ManifestLine {
  label: string;
  mode: Mode;
}

/** Describes the committed snapshot: where the data came from and what the day files index into. */
export interface Manifest {
  publisher: {name: string; url: string};
  license: {name: string; url: string};
  feedVersion: string;
  feedStartDate: string;
  feedEndDate: string;
  /** The real service date each day type was taken from, as YYYYMMDD. */
  dates: Record<DayType, string>;
  files: Record<DayType, string>;
  /** Stop i here is stop i in every day file. */
  stops: ManifestStop[];
  /** Line l here is the value of a day file's routeLine entries. */
  lines: ManifestLine[];
}

export const LICENSE = {name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/'};

/** GTFS route_type to a mode; the extended 100-799 range HSL uses is folded into the basic ones. */
export function modeOf(routeType: string): Mode {
  const t = parseInt(routeType, 10);
  if (t === 0 || (t >= 900 && t < 1000)) return 'tram';
  if (t === 1 || (t >= 400 && t < 500)) return 'metro';
  if (t === 2 || (t >= 100 && t < 200)) return 'rail';
  if (t === 4 || (t >= 1000 && t < 1100)) return 'ferry';
  return 'bus';
}

/** Throws a message naming the first missing or malformed field. */
export function validateManifest(value: unknown): Manifest {
  const m = value as Partial<Manifest> | null;
  const fail = (field: string): never => {
    throw new Error(`manifest: ${field} is missing or invalid`);
  };
  if (!m || typeof m !== 'object') return fail('manifest');
  if (!m.publisher?.name || !m.publisher.url) fail('publisher');
  if (!m.license?.name || !m.license.url) fail('license');
  if (!m.feedVersion) fail('feedVersion');
  if (!m.feedStartDate || !m.feedEndDate) fail('feed dates');
  for (const d of DAY_TYPES) {
    if (!isDate(m.dates?.[d] ?? '')) fail(`dates.${d}`);
    if (!m.files?.[d]) fail(`files.${d}`);
  }
  if (!Array.isArray(m.stops) || m.stops.length === 0) fail('stops');
  if (!Array.isArray(m.lines)) fail('lines');
  return m as Manifest;
}
