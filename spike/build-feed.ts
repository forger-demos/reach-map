// Throwaway spike CLI: bun spike/build-feed.ts <gtfs-dir> <YYYYMMDD> <out.bin>
// Streams a GTFS directory into the compact timetable for one service day.
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {buildTimetable, encode, footpaths, type TripInput} from './timetable';

const BOM = String.fromCharCode(0xfeff);
const stripBom = (c: string): string => (c.startsWith(BOM) ? c.slice(1) : c);

function splitCsv(line: string): string[] {
  if (!line.includes('"')) return line.split(',');
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === ',' && !quoted) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

async function* lines(path: string): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let rest = '';
  const reader = Bun.file(path).stream().getReader();
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    rest += decoder.decode(chunk.value, {stream: true});
    const parts = rest.split('\n');
    rest = parts.pop() ?? '';
    for (const p of parts) yield p.endsWith('\r') ? p.slice(0, -1) : p;
  }
  if (rest) yield rest;
}

async function table(path: string): Promise<Array<Record<string, string>>> {
  const rows: Array<Record<string, string>> = [];
  let header: string[] | null = null;
  for await (const line of lines(path)) {
    if (!line) continue;
    const cells = splitCsv(line);
    if (!header) header = cells.map((c) => stripBom(c));
    else rows.push(Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ''])));
  }
  return rows;
}

const seconds = (t: string): number => {
  const [h, m, s] = t.trim().split(':').map(Number);
  return (h as number) * 3600 + (m as number) * 60 + (s as number);
};

const [dir, date, out] = process.argv.slice(2);
if (!dir || !date || !out) throw new Error('usage: build-feed <gtfs-dir> <YYYYMMDD> <out.bin>');
const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
  new Date(Date.UTC(+date.slice(0, 4), +date.slice(4, 6) - 1, +date.slice(6, 8))).getUTCDay()
] as string;

const t0 = performance.now();
const active = new Set<string>();
for (const c of await table(`${dir}/calendar.txt`)) {
  if (c[weekday] === '1' && (c.start_date as string) <= date && date <= (c.end_date as string)) active.add(c.service_id as string);
}
for (const c of await table(`${dir}/calendar_dates.txt`)) {
  if (c.date !== date) continue;
  if (c.exception_type === '1') active.add(c.service_id as string);
  else active.delete(c.service_id as string);
}
const tripIds = new Set<string>();
for (const t of await table(`${dir}/trips.txt`)) if (active.has(t.service_id as string)) tripIds.add(t.trip_id as string);

const stopIndex = new Map<string, number>();
const lat: number[] = [];
const lon: number[] = [];
for (const s of await table(`${dir}/stops.txt`)) {
  if (s.location_type && s.location_type !== '0') continue;
  stopIndex.set(s.stop_id as string, lat.length);
  lat.push(+(s.stop_lat as string));
  lon.push(+(s.stop_lon as string));
}

const building = new Map<string, TripInput>();
let first = true;
let cols: string[] = [];
for await (const line of lines(`${dir}/stop_times.txt`)) {
  if (first) {
    cols = splitCsv(line).map((c) => stripBom(c));
    first = false;
    continue;
  }
  const comma = line.indexOf(',');
  const id = line.slice(0, comma);
  if (!tripIds.has(id)) continue;
  const c = splitCsv(line);
  const stop = stopIndex.get(c[cols.indexOf('stop_id')] as string);
  if (stop === undefined) continue;
  let trip = building.get(id);
  if (!trip) building.set(id, (trip = {stops: [], arrivals: [], departures: []}));
  trip.stops.push(stop);
  trip.arrivals.push(seconds(c[1] as string));
  trip.departures.push(seconds(c[2] as string));
}
const t1 = performance.now();
const trips = [...building.values()].filter((t) => t.stops.length > 1);
const foot = footpaths(lat, lon, 400, 1.3, 1.25);
const tt = buildTimetable(lat, lon, trips, foot);
const bytes = encode(tt);
mkdirSync(dirname(out), {recursive: true});
writeFileSync(out, bytes);
const gz = Bun.gzipSync(bytes).length;
console.log(JSON.stringify({
  date, weekday, services: active.size, trips: trips.length, stops: tt.stopCount,
  routes: tt.routeStopOffset.length - 1, stopTimes: tt.arrivals.length, footEdges: tt.footTo.length,
  rawBytes: bytes.length, gzipBytes: gz, readMs: Math.round(t1 - t0), totalMs: Math.round(performance.now() - t0),
}));
