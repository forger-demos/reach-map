// A short, structured account of one journey: what the traveller does, minute by minute.
import type {Leg} from './raptor';
import type {Mode} from './manifest';

export interface RideInfo {
  label: string;
  mode: Mode;
}

/** What `describe` needs to name things; the shell or ui supplies it from the manifest and timetable. */
export interface Names {
  stopName(stop: number): string;
  ride(route: number): RideInfo;
}

export interface RideStep extends RideInfo {
  from: string;
  to: string;
}

export interface Description {
  /** Whole minutes on foot: to the first stop, between stops, and from the last stop. */
  walkMinutes: number;
  rides: RideStep[];
  /** Vehicle changes: one less than the rides, never negative. */
  changes: number;
  totalMinutes: number;
}

export interface JourneyInput {
  legs: Leg[];
  /** Seconds walked from the origin to the first stop. */
  startWalkSecs: number;
  /** Seconds walked from the last stop to the hovered point. */
  endWalkSecs: number;
  /** Seconds from leaving the origin to arriving at the hovered point. */
  totalSecs: number;
}

const minutes = (secs: number) => Math.round(secs / 60);

export function describe(input: JourneyInput, names: Names): Description {
  let walkSecs = input.startWalkSecs + input.endWalkSecs;
  const rides: RideStep[] = [];
  for (const leg of input.legs) {
    if (leg.kind === 'walk') walkSecs += leg.arrive - leg.depart;
    else rides.push({...names.ride(leg.route), from: names.stopName(leg.from), to: names.stopName(leg.to)});
  }
  return {
    walkMinutes: minutes(walkSecs),
    rides,
    changes: Math.max(0, rides.length - 1),
    totalMinutes: minutes(input.totalSecs),
  };
}
