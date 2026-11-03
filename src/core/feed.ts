import {records, type Table} from './csv';
import {parseGtfsTime} from './gtfs-time';
import {LICENSE, type Manifest, type ManifestLine, type ManifestStop, modeOf} from './manifest';
import {activeServices, DAY_TYPES, type DayType} from './service-day';
import {buildTimetable, type Timetable, type TripInput} from './timetable';
import {footpaths} from './walk';

/** Opens a GTFS file of the feed by name, for example `stop_times.txt`. */
export type OpenFeed = (name: string) => Promise<Table>;

/** What every day file of one feed shares: the boarding stops, the lines and the walking transfers. */
export interface Catalog {
  stopIndex: Map<string, number>;
  stops: ManifestStop[];
  lineIndex: Map<string, number>;
  lines: ManifestLine[];
  foot: Array<Array<[number, number]>>;
}

export interface FeedInfo {
  publisherName: string;
  publisherUrl: string;
  version: string;
  startDate: string;
  endDate: string;
}

export async function readFeedInfo(open: OpenFeed): Promise<FeedInfo> {
  const [row] = await records(await open('feed_info.txt'));
  if (!row) throw new Error('feed_info.txt has no rows');
  return {
    publisherName: row.feed_publisher_name ?? '',
    publisherUrl: row.feed_publisher_url ?? '',
    version: row.feed_version ?? '',
    startDate: row.feed_start_date ?? '',
    endDate: row.feed_end_date ?? '',
  };
}

/** Only boarding stops are kept: location type blank or 0. Stations and entrances are not routed. */
export async function buildCatalog(open: OpenFeed): Promise<Catalog> {
  const stopIndex = new Map<string, number>();
  const stops: ManifestStop[] = [];
  for (const s of await records(await open('stops.txt'))) {
    const type = (s.location_type ?? '').trim();
    if (type !== '' && type !== '0') continue;
    stopIndex.set(s.stop_id as string, stops.length);
    stops.push({name: s.stop_name ?? '', lat: Number(s.stop_lat), lon: Number(s.stop_lon)});
  }
  const lineIndex = new Map<string, number>();
  const lines: ManifestLine[] = [];
  for (const r of await records(await open('routes.txt'))) {
    lineIndex.set(r.route_id as string, lines.length);
    lines.push({label: r.route_short_name || r.route_long_name || (r.route_id as string), mode: modeOf(r.route_type ?? '')});
  }
  const foot = footpaths(stops.map((s) => s.lat), stops.map((s) => s.lon));
  return {stopIndex, stops, lineIndex, lines, foot};
}

export interface DayBuild {
  timetable: Timetable;
  services: number;
  trips: number;
}

/** Builds the timetable of one service date. Reads `stop_times.txt` as a stream. */
export async function buildDay(open: OpenFeed, catalog: Catalog, date: string): Promise<DayBuild> {
  const services = activeServices(await records(await open('calendar.txt')), await records(await open('calendar_dates.txt')), date);

  const tripLine = new Map<string, number>();
  const trips = await open('trips.txt');
  const iTrip = trips.header.indexOf('trip_id');
  const iService = trips.header.indexOf('service_id');
  const iRoute = trips.header.indexOf('route_id');
  for await (const c of trips.rows) {
    if (!services.has(c[iService] as string)) continue;
    const line = catalog.lineIndex.get(c[iRoute] as string);
    if (line !== undefined) tripLine.set(c[iTrip] as string, line);
  }

  interface Building extends TripInput {
    seqs: number[];
  }
  const building = new Map<string, Building>();
  const times = await open('stop_times.txt');
  const col = (name: string) => times.header.indexOf(name);
  const [cTrip, cArr, cDep, cStop, cSeq] = ['trip_id', 'arrival_time', 'departure_time', 'stop_id', 'stop_sequence'].map(col) as [number, number, number, number, number];
  for await (const c of times.rows) {
    const line = tripLine.get(c[cTrip] as string);
    if (line === undefined) continue;
    const stop = catalog.stopIndex.get(c[cStop] as string);
    if (stop === undefined) continue;
    const a = parseGtfsTime(c[cArr] as string);
    const d = parseGtfsTime(c[cDep] as string);
    const arr = a ?? d;
    const dep = d ?? a;
    if (arr === null || dep === null) continue;
    let trip = building.get(c[cTrip] as string);
    if (!trip) building.set(c[cTrip] as string, (trip = {line, stops: [], arrivals: [], departures: [], seqs: []}));
    trip.stops.push(stop);
    trip.arrivals.push(arr);
    trip.departures.push(dep);
    trip.seqs.push(Number(c[cSeq]));
  }

  const kept: TripInput[] = [];
  for (const t of building.values()) {
    if (t.stops.length < 2) continue;
    kept.push(inSequenceOrder(t));
  }
  const timetable = buildTimetable(
    catalog.stops.map((s) => s.lat),
    catalog.stops.map((s) => s.lon),
    kept,
    catalog.foot,
  );
  return {timetable, services: services.size, trips: kept.length};
}

/** Stop times arrive in stop_sequence order in practice; sort when a feed does not. */
function inSequenceOrder(t: TripInput & {seqs: number[]}): TripInput {
  if (t.seqs.every((s, i) => i === 0 || s >= (t.seqs[i - 1] as number))) return t;
  const order = t.seqs.map((_, i) => i).sort((a, b) => (t.seqs[a] as number) - (t.seqs[b] as number));
  return {
    line: t.line,
    stops: order.map((i) => t.stops[i] as number),
    arrivals: order.map((i) => t.arrivals[i] as number),
    departures: order.map((i) => t.departures[i] as number),
  };
}

export const DAY_FILE_NAMES: Record<DayType, string> = {
  weekday: 'timetable-weekday.bin',
  saturday: 'timetable-saturday.bin',
  sunday: 'timetable-sunday.bin',
};

export function buildManifest(info: FeedInfo, catalog: Catalog, dates: Record<DayType, string>): Manifest {
  const files = {} as Record<DayType, string>;
  for (const d of DAY_TYPES) files[d] = DAY_FILE_NAMES[d];
  return {
    publisher: {name: info.publisherName, url: info.publisherUrl},
    license: LICENSE,
    feedVersion: info.version,
    feedStartDate: info.startDate,
    feedEndDate: info.endDate,
    dates,
    files,
    stops: catalog.stops,
    lines: catalog.lines,
  };
}
