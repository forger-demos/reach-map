import {buildCatalog, buildDay, buildManifest, DAY_FILE_NAMES, type OpenFeed, readFeedInfo} from '../core/feed';
import type {Manifest} from '../core/manifest';
import {dayTypeOf, DAY_TYPES, type DayType, isDate} from '../core/service-day';
import {encode} from '../core/timetable';

export type WriteFile = (path: string, data: Uint8Array | string) => Promise<void>;

export interface BuildReport {
  dayType: DayType;
  date: string;
  services: number;
  trips: number;
  routes: number;
  rawBytes: number;
  gzipBytes: number;
}

/** Checks the three dates against the day types and the feed's validity window. */
export function checkDates(dates: Record<DayType, string>, start: string, end: string): void {
  for (const d of DAY_TYPES) {
    const date = dates[d];
    if (!isDate(date)) throw new Error(`${d}: "${date}" is not a YYYYMMDD date`);
    if (dayTypeOf(date) !== d) throw new Error(`${d}: ${date} falls on a ${dayTypeOf(date)}`);
    if (date < start || date > end) throw new Error(`${d}: ${date} is outside the feed window ${start} to ${end}`);
  }
}

/** JSON with every non-ASCII character escaped, so the committed file is plain ASCII and still valid JSON. */
export function asciiJson(value: unknown): string {
  return JSON.stringify(value).replace(/[^\x00-\x7f]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

/** Builds the three day files and the manifest into outDir. Returns the manifest and a report per day. */
export async function buildSnapshot(
  open: OpenFeed,
  dates: Record<DayType, string>,
  outDir: string,
  write: WriteFile,
): Promise<{manifest: Manifest; reports: BuildReport[]}> {
  const info = await readFeedInfo(open);
  checkDates(dates, info.startDate, info.endDate);
  const catalog = await buildCatalog(open);
  const reports: BuildReport[] = [];
  for (const dayType of DAY_TYPES) {
    const day = await buildDay(open, catalog, dates[dayType]);
    const bytes = encode(day.timetable);
    await write(`${outDir}/${DAY_FILE_NAMES[dayType]}`, bytes);
    reports.push({
      dayType,
      date: dates[dayType],
      services: day.services,
      trips: day.trips,
      routes: day.timetable.routeStopOffset.length - 1,
      rawBytes: bytes.length,
      gzipBytes: Bun.gzipSync(bytes).length,
    });
  }
  const manifest = buildManifest(info, catalog, dates);
  await write(`${outDir}/manifest.json`, `${asciiJson(manifest)}\n`);
  return {manifest, reports};
}

export interface Args {
  input: string;
  dates: Record<DayType, string>;
}

export const USAGE = 'usage: bun run data:build <feed.zip|feed-dir> --weekday YYYYMMDD --saturday YYYYMMDD --sunday YYYYMMDD';

export function parseArgs(argv: string[]): Args {
  const dates: Partial<Record<DayType, string>> = {};
  let input: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] as string;
    const flag = a.startsWith('--') ? (a.slice(2) as DayType) : undefined;
    if (flag !== undefined && DAY_TYPES.includes(flag)) {
      const value = argv[++i];
      if (value === undefined) throw new Error(`--${flag} needs a date\n${USAGE}`);
      dates[flag] = value;
    } else if (a.startsWith('--') || input !== undefined) throw new Error(`unexpected argument ${a}\n${USAGE}`);
    else input = a;
  }
  if (input === undefined) throw new Error(USAGE);
  for (const d of DAY_TYPES) if (dates[d] === undefined) throw new Error(`missing --${d}\n${USAGE}`);
  return {input, dates: dates as Record<DayType, string>};
}
