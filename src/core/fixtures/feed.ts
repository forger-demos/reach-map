import {tableFromText} from '../csv';
import type {OpenFeed} from '../feed';

/**
 * A small hand-made feed. Stops A, B, C are boarding stops; S1 is a station (location type 1),
 * not a boarding stop. Lines: L1 buses, L2 a tram.
 *
 * Services:
 *   WK    Mon-Fri 2026-11-02..2026-11-08, removed on Wed 2026-11-04 by calendar_dates
 *   WKEND Sat-Sun 2026-11-02..2026-11-08
 *   EXTRA no weekly days, added on Wed 2026-11-04 by calendar_dates
 *
 * Trips:
 *   T1 WK    L1 A 08:00 -> B 08:10 -> C 08:20
 *   T2 WK    L1 A 08:10 -> B 08:20 -> C 08:30
 *   T3 EXTRA L1 A 09:00 -> B 09:10 -> C 09:20
 *   T4 WKEND L2 C 23:50 -> B 24:10 -> A 25:00   (passes midnight)
 *   T5 WK    L1 A 08:30 -> S1 08:35 -> C 08:50  (S1 is not a boarding stop, so A -> C)
 *   T6 WK    L1 A 07:00 -> B 07:50 -> C 08:40   (slow)
 *   T7 WK    L1 A 07:10 -> B 07:20 -> C 07:30   (fast, would overtake T6 if they shared a route)
 * T6 and T7 have the same stop sequence as T1; T7 overtakes T6 so they split.
 */
const FILES: Record<string, string> = {
  'feed_info.txt': `feed_publisher_name,feed_publisher_url,feed_lang,feed_start_date,feed_end_date,feed_version
Test Transit,http://example.test/,en,20261102,20261108,2026-11-01 04:00:00
`,
  'stops.txt': `stop_id,stop_name,stop_lat,stop_lon,location_type
A,Alpha,60.1700,24.9400,0
B,Beta,60.1710,24.9410,
C,Gamma,60.2000,25.0000,0
S1,Station,60.1705,24.9405,1
`,
  'routes.txt': `route_id,route_short_name,route_long_name,route_type
L1,1,Alpha - Gamma,3
L2,,Gamma - Alpha,0
`,
  'calendar.txt': `service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date
WK,1,1,1,1,1,0,0,20261102,20261108
WKEND,0,0,0,0,0,1,1,20261102,20261108
EXTRA,0,0,0,0,0,0,0,20261102,20261108
`,
  'calendar_dates.txt': `service_id,date,exception_type
WK,20261104,2
EXTRA,20261104,1
`,
  'trips.txt': `route_id,service_id,trip_id
L1,WK,T1
L1,WK,T2
L1,EXTRA,T3
L2,WKEND,T4
L1,WK,T5
L1,WK,T6
L1,WK,T7
`,
  'stop_times.txt': `trip_id,arrival_time,departure_time,stop_id,stop_sequence
T1,08:00:00,08:00:00,A,1
T1,08:10:00,08:10:00,B,2
T1,08:20:00,08:20:00,C,3
T2,08:10:00,08:10:00,A,1
T2,08:20:00,08:20:00,B,2
T2,08:30:00,08:30:00,C,3
T3,09:00:00,09:00:00,A,1
T3,09:10:00,09:10:00,B,2
T3,09:20:00,09:20:00,C,3
T4,23:50:00,23:50:00,C,1
T4,24:10:00,24:10:00,B,2
T4,25:00:00,25:00:00,A,3
T5,08:30:00,08:30:00,A,1
T5,08:35:00,08:35:00,S1,2
T5,08:50:00,08:50:00,C,3
T6,07:00:00,07:00:00,A,1
T6,07:50:00,07:50:00,B,2
T6,08:40:00,08:40:00,C,3
T7,07:10:00,07:10:00,A,1
T7,07:20:00,07:20:00,B,2
T7,07:30:00,07:30:00,C,3
`,
};

export function fixtureFeed(overrides: Record<string, string> = {}): OpenFeed {
  const files = {...FILES, ...overrides};
  return async (name) => {
    const text = files[name];
    if (text === undefined) throw new Error(`no such file ${name}`);
    return tableFromText(text);
  };
}
