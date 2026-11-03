import {expect, test} from 'bun:test';
import {fixtureFeed} from '../core/fixtures/feed';
import {validateManifest} from '../core/manifest';
import {decode} from '../core/timetable';
import {asciiJson, buildSnapshot, checkDates, parseArgs, USAGE} from './data-build';

const dates = {weekday: '20261105', saturday: '20261107', sunday: '20261108'};

test('the snapshot writes one file per day type and a manifest with the feed facts', async () => {
  const written = new Map<string, Uint8Array | string>();
  const {manifest, reports} = await buildSnapshot(fixtureFeed(), dates, '/out', async (path, data) => {
    written.set(path, data);
  });
  expect([...written.keys()].sort()).toEqual([
    '/out/manifest.json',
    '/out/timetable-saturday.bin',
    '/out/timetable-sunday.bin',
    '/out/timetable-weekday.bin',
  ]);
  expect(reports.map((r) => [r.dayType, r.trips])).toEqual([['weekday', 5], ['saturday', 1], ['sunday', 1]]);
  expect(reports[0]?.gzipBytes).toBeGreaterThan(0);
  const onDisk = validateManifest(JSON.parse(written.get('/out/manifest.json') as string));
  expect(onDisk).toEqual(manifest);
  expect(onDisk.publisher.name).toBe('Test Transit');
  expect(onDisk.feedVersion).toBe('2026-11-01 04:00:00');
  expect(onDisk.dates).toEqual(dates);
  const weekday = decode(written.get('/out/timetable-weekday.bin') as Uint8Array);
  expect(weekday.stopCount).toBe(onDisk.stops.length);
});

test('dates are checked against day type and feed window', () => {
  expect(() => checkDates(dates, '20261102', '20261108')).not.toThrow();
  expect(() => checkDates({...dates, weekday: 'tomorrow'}, '20261102', '20261108')).toThrow('not a YYYYMMDD date');
  expect(() => checkDates({...dates, weekday: '20261107'}, '20261102', '20261108')).toThrow('weekday: 20261107 falls on a saturday');
  expect(() => checkDates({...dates, sunday: '20261115'}, '20261102', '20261108')).toThrow('outside the feed window');
  expect(() => checkDates({...dates, saturday: '20261031'}, '20261102', '20261108')).toThrow('outside the feed window');
});

test('a bad date stops the build before anything is written', async () => {
  let writes = 0;
  const bad = {...dates, saturday: '20261108'};
  await expect(buildSnapshot(fixtureFeed(), bad, '/out', async () => void writes++)).rejects.toThrow('saturday');
  expect(writes).toBe(0);
});

test('arguments: an input and three dates in any order', () => {
  expect(parseArgs(['feed.zip', '--sunday', '3', '--weekday', '1', '--saturday', '2'])).toEqual({
    input: 'feed.zip',
    dates: {weekday: '1', saturday: '2', sunday: '3'},
  });
});

test('arguments: problems are reported with the usage line', () => {
  expect(() => parseArgs([])).toThrow(USAGE);
  expect(() => parseArgs(['feed.zip', '--weekday', '1', '--saturday', '2'])).toThrow('missing --sunday');
  expect(() => parseArgs(['feed.zip', '--weekday'])).toThrow('--weekday needs a date');
  expect(() => parseArgs(['feed.zip', '--monday', '1'])).toThrow('unexpected argument --monday');
  expect(() => parseArgs(['a.zip', 'b.zip'])).toThrow('unexpected argument b.zip');
});

test('manifest JSON is ASCII and parses back to the same value', () => {
  const value = {name: 'K\u00e4pyl\u00e4', quote: 'a"b'};
  const text = asciiJson(value);
  expect(/^[\x00-\x7f]*$/.test(text)).toBe(true);
  expect(text).toContain('K\\u00e4pyl\\u00e4');
  expect(JSON.parse(text)).toEqual(value);
});
