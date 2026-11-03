import {expect, test} from 'bun:test';
import {fixtureFeed} from './fixtures/feed';
import {buildCatalog, buildDay, buildManifest, readFeedInfo} from './feed';

const open = fixtureFeed();
const catalog = await buildCatalog(open);
// Stop indexes follow stops.txt order among boarding stops: A=0, B=1, C=2. S1 is a station.
const [A, B, C] = [0, 1, 2];

test('the catalog keeps boarding stops only, including a blank location type', () => {
  expect(catalog.stops.map((s) => s.name)).toEqual(['Alpha', 'Beta', 'Gamma']);
  expect(catalog.stopIndex.has('S1')).toBe(false);
  expect(catalog.stopIndex.get('B')).toBe(B);
});

test('lines carry a label and a mode, falling back to the long name', () => {
  expect(catalog.lines).toEqual([
    {label: '1', mode: 'bus'},
    {label: 'Gamma - Alpha', mode: 'tram'},
  ]);
});

test('walking transfers join nearby stops only', () => {
  // A and B are about 125 m apart; C is several kilometres away.
  expect(catalog.foot[A]?.map(([to]) => to)).toEqual([B]);
  expect(catalog.foot[C]).toEqual([]);
});

test('feed info names the publisher and version', async () => {
  expect(await readFeedInfo(open)).toEqual({
    publisherName: 'Test Transit',
    publisherUrl: 'http://example.test/',
    version: '2026-11-01 04:00:00',
    startDate: '20261102',
    endDate: '20261108',
  });
  await expect(readFeedInfo(fixtureFeed({'feed_info.txt': 'feed_version\n'}))).rejects.toThrow('no rows');
});

// Thursday 2026-11-05: WK runs. T1, T2, T5, T6, T7 are its trips.
// T6 (slow, 07:00) is overtaken by T7 (fast, 07:10) and also by T1 at C, so T6 is a route of its own and
// T7, T1, T2 follow one another in another; T5 skips the station S1 and so is the route A,C. Three routes, five trips.
test('a weekday builds routes without overtaking and drops the non-boarding stop', async () => {
  const day = await buildDay(open, catalog, '20261105');
  const tt = day.timetable;
  expect(day.services).toBe(1);
  expect(day.trips).toBe(5);
  expect(tt.routeStopOffset.length - 1).toBe(3);
  const routes: Array<{stops: number[]; arrivals: number[]}> = [];
  for (let r = 0; r < 3; r++) {
    const stops = Array.from(tt.routeStops.slice(tt.routeStopOffset[r], tt.routeStopOffset[r + 1]));
    routes.push({stops, arrivals: Array.from(tt.arrivals.slice(tt.routeTimeOffset[r], tt.routeTimeOffset[r + 1]))});
  }
  const h = (hh: number, mm: number) => hh * 3600 + mm * 60;
  expect(routes).toContainEqual({stops: [A, B, C], arrivals: [h(7, 0), h(7, 50), h(8, 40)]});
  expect(routes).toContainEqual({stops: [A, B, C], arrivals: [h(7, 10), h(7, 20), h(7, 30), h(8, 0), h(8, 10), h(8, 20), h(8, 10), h(8, 20), h(8, 30)]});
  expect(routes).toContainEqual({stops: [A, C], arrivals: [h(8, 30), h(8, 50)]});
});

test('a service removed by calendar_dates is gone and one added by it appears', async () => {
  // Wednesday 2026-11-04: WK removed, EXTRA added, so only T3 runs.
  const day = await buildDay(open, catalog, '20261104');
  expect(day.trips).toBe(1);
  expect(Array.from(day.timetable.arrivals)).toEqual([9 * 3600, 9 * 3600 + 600, 9 * 3600 + 1200]);
});

test('a trip passing midnight keeps times past 86400', async () => {
  const day = await buildDay(open, catalog, '20261107');
  expect(day.trips).toBe(1);
  expect(Array.from(day.timetable.routeStops)).toEqual([C, B, A]);
  expect(Array.from(day.timetable.arrivals)).toEqual([85_800, 87_000, 90_000]);
  expect(Array.from(day.timetable.routeLine)).toEqual([1]);
});

test('a date with no service builds an empty timetable', async () => {
  const day = await buildDay(open, catalog, '20261201');
  expect(day.trips).toBe(0);
  expect(day.timetable.routeStopOffset.length).toBe(1);
});

test('stop times are put in stop_sequence order, blanks borrow the other time, junk rows are skipped', async () => {
  const feed = fixtureFeed({
    'stop_times.txt': `trip_id,arrival_time,departure_time,stop_id,stop_sequence
T1,08:20:00,08:20:00,C,3
T1,08:00:00,,A,1
T1,,08:10:00,B,2
T1,,,B,4
T1,08:30:00,08:30:00,NOPE,5
T2,08:10:00,08:10:00,A,1
NOTRIP,08:10:00,08:10:00,A,1
`,
    'trips.txt': 'route_id,service_id,trip_id\nL1,WK,T1\nL1,WK,T2\nNOLINE,WK,T9\n',
  });
  const day = await buildDay(feed, catalog, '20261105');
  // T2 has one stop and is dropped.
  expect(day.trips).toBe(1);
  expect(Array.from(day.timetable.routeStops)).toEqual([A, B, C]);
  expect(Array.from(day.timetable.arrivals)).toEqual([28_800, 29_400, 30_000]);
  expect(Array.from(day.timetable.departures)).toEqual([28_800, 29_400, 30_000]);
});

test('the manifest records publisher, feed version, dates, stops and lines', async () => {
  const dates = {weekday: '20261105', saturday: '20261107', sunday: '20261108'};
  const m = buildManifest(await readFeedInfo(open), catalog, dates);
  expect(m.publisher).toEqual({name: 'Test Transit', url: 'http://example.test/'});
  expect(m.feedVersion).toBe('2026-11-01 04:00:00');
  expect(m.dates).toEqual(dates);
  expect(m.files.weekday).toBe('timetable-weekday.bin');
  expect(m.stops.length).toBe(3);
  expect(m.lines.length).toBe(2);
  expect(m.license.name).toBe('CC BY 4.0');
});
