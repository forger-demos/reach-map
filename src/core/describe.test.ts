import {expect, test} from 'bun:test';
import {describe as describeJourney, type Names} from './describe';
import type {Leg} from './raptor';

const names: Names = {
  stopName: (s) => ['Kamppi', 'Rautatientori', 'Kalasatama', 'Itakeskus'][s] as string,
  ride: (r) => (r === 0 ? {label: '1', mode: 'tram'} : {label: 'M1', mode: 'metro'}),
};
const ride = (route: number, from: number, to: number, depart: number, arrive: number): Leg => ({kind: 'ride', route, from, to, depart, arrive});

// Each case is worked by hand in seconds; minutes are rounded from the sum.
const cases: Array<[string, Parameters<typeof describeJourney>[0], ReturnType<typeof describeJourney>]> = [
  [
    'walk only: 4 minutes out, 3 back',
    {legs: [], startWalkSecs: 240, endWalkSecs: 180, totalSecs: 420},
    {walkMinutes: 7, rides: [], changes: 0, totalMinutes: 7},
  ],
  [
    'one ride: 2 min walk, 10 min ride, 1 min walk',
    {legs: [ride(0, 0, 1, 120, 720)], startWalkSecs: 120, endWalkSecs: 60, totalSecs: 780},
    {walkMinutes: 3, rides: [{label: '1', mode: 'tram', from: 'Kamppi', to: 'Rautatientori'}], changes: 0, totalMinutes: 13},
  ],
  [
    'a ride with a change: two rides and a 5 minute transfer walk',
    {
      legs: [ride(0, 0, 1, 120, 720), {kind: 'walk', from: 1, to: 2, depart: 720, arrive: 1020}, ride(1, 2, 3, 1200, 1800)],
      startWalkSecs: 120,
      endWalkSecs: 0,
      totalSecs: 1800,
    },
    {
      walkMinutes: 7,
      rides: [
        {label: '1', mode: 'tram', from: 'Kamppi', to: 'Rautatientori'},
        {label: 'M1', mode: 'metro', from: 'Kalasatama', to: 'Itakeskus'},
      ],
      changes: 1,
      totalMinutes: 30,
    },
  ],
  [
    'a final walk after the last ride',
    {legs: [ride(1, 2, 3, 0, 600)], startWalkSecs: 0, endWalkSecs: 450, totalSecs: 1050},
    {walkMinutes: 8, rides: [{label: 'M1', mode: 'metro', from: 'Kalasatama', to: 'Itakeskus'}], changes: 0, totalMinutes: 18},
  ],
];

for (const [name, input, expected] of cases) {
  test(name, () => expect(describeJourney(input, names)).toEqual(expected));
}
