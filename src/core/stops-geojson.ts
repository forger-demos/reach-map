import type {Timetable} from './timetable';

export interface StopFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: {id: number};
    geometry: {type: 'Point'; coordinates: [number, number]};
  }>;
}

/** Every stop of a timetable as a GeoJSON point, in stop index order. */
export function stopsGeoJson(tt: Pick<Timetable, 'stopCount' | 'stopLat' | 'stopLon'>): StopFeatureCollection {
  const features: StopFeatureCollection['features'] = [];
  for (let i = 0; i < tt.stopCount; i++) {
    features.push({
      type: 'Feature',
      properties: {id: i},
      geometry: {type: 'Point', coordinates: [tt.stopLon[i] as number, tt.stopLat[i] as number]},
    });
  }
  return {type: 'FeatureCollection', features};
}
