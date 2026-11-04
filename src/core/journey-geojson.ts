import type {Mode} from './manifest';
import type {Leg} from './raptor';

export type PathMode = Mode | 'walk';

export interface PathFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: {mode: PathMode};
    geometry: {type: 'LineString'; coordinates: Array<[number, number]>};
  }>;
}

export interface PathInput {
  legs: Leg[];
  origin: [number, number];
  point: [number, number];
  /** The stops the path starts and ends on, so a walk-only journey still draws. */
  stop: number;
  stopLat: ArrayLike<number>;
  stopLon: ArrayLike<number>;
  modeOf(route: number): Mode;
}

/** Straight segments: origin to the first stop, one per leg coloured by mode, last stop to the point. */
export function pathGeoJson(input: PathInput): PathFeatureCollection {
  const at = (s: number): [number, number] => [input.stopLon[s] as number, input.stopLat[s] as number];
  const features: PathFeatureCollection['features'] = [];
  const add = (mode: PathMode, a: [number, number], b: [number, number]) =>
    features.push({type: 'Feature', properties: {mode}, geometry: {type: 'LineString', coordinates: [a, b]}});
  add('walk', input.origin, at(input.legs[0]?.from ?? input.stop));
  for (const leg of input.legs) add(leg.kind === 'ride' ? input.modeOf(leg.route) : 'walk', at(leg.from), at(leg.to));
  add('walk', at(input.stop), input.point);
  return {type: 'FeatureCollection', features};
}
