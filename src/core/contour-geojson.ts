import {contour} from './contour';
import type {Grid} from './field';

export interface ContourFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: {minutes: number};
    geometry: {type: 'LineString'; coordinates: Array<[number, number]>};
  }>;
}

/** One LineString per contour line of each threshold, in minutes, carrying its minutes for labels and styling. */
export function contoursGeoJson(field: ArrayLike<number>, grid: Grid, minutes: readonly number[]): ContourFeatureCollection {
  const features: ContourFeatureCollection['features'] = [];
  for (const m of minutes) {
    for (const line of contour(field, grid, m * 60)) {
      features.push({type: 'Feature', properties: {minutes: m}, geometry: {type: 'LineString', coordinates: line.coordinates}});
    }
  }
  return {type: 'FeatureCollection', features};
}
