import type * as maplibregl from 'maplibre-gl';
import type {PathFeatureCollection} from '../core/journey-geojson';
import {modeColours, type Theme} from '../core/theme';

const SOURCE = 'journey';
const CASING = 'journey-casing';
const LINES = 'journey-lines';
const EMPTY: PathFeatureCollection = {type: 'FeatureCollection', features: []};

function colourExpression(theme: Theme): unknown[] {
  const colours = modeColours(theme);
  const match: unknown[] = ['match', ['get', 'mode']];
  for (const [mode, colour] of Object.entries(colours)) match.push(mode, colour);
  match.push(colours.walk);
  return match;
}

/** The hovered journey as straight segments coloured by mode; walking is dashed. */
export class JourneyLayer {
  private data: PathFeatureCollection = EMPTY;

  constructor(private readonly map: maplibregl.Map) {}

  set(path: PathFeatureCollection | null): void {
    this.data = path ?? EMPTY;
    (this.map.getSource(SOURCE) as maplibregl.GeoJSONSource | undefined)?.setData(this.data as never);
  }

  render(theme: Theme): void {
    const halo = theme === 'dark' ? '#0c0e14' : '#ffffff';
    const source = this.map.getSource(SOURCE) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(this.data as never);
      this.map.setPaintProperty(CASING, 'line-color', halo);
      this.map.setPaintProperty(LINES, 'line-color', colourExpression(theme) as never);
      return;
    }
    this.map.addSource(SOURCE, {type: 'geojson', data: this.data as never});
    this.map.addLayer({
      id: CASING,
      type: 'line',
      source: SOURCE,
      layout: {'line-cap': 'round', 'line-join': 'round'},
      paint: {'line-color': halo, 'line-width': 8, 'line-opacity': 0.9},
    });
    this.map.addLayer({
      id: LINES,
      type: 'line',
      source: SOURCE,
      layout: {'line-cap': 'round', 'line-join': 'round'},
      paint: {'line-color': colourExpression(theme) as never, 'line-width': 4},
    });
  }
}
