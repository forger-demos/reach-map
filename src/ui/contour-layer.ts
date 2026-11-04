import type * as maplibregl from 'maplibre-gl';
import {contoursGeoJson, type ContourFeatureCollection} from '../core/contour-geojson';
import type {Grid} from '../core/field';
import {BAND_MINUTES} from '../core/reach';
import {contourPaint, type Theme} from '../core/theme';

const EMPTY: ContourFeatureCollection = {type: 'FeatureCollection', features: []};

export interface ContourStyle {
  /** Prefix of the source and layer ids, so two sets of outlines can share a map. */
  id: string;
  /** Dash pattern in line widths; solid when absent. */
  dash?: number[];
  /** Whether the lines carry their minutes. */
  labels: boolean;
}

export const SOLID: ContourStyle = {id: 'contours', labels: true};
/** The second set of outlines when two situations are compared: dashed and unlabelled, so the first set's labels stay clear. */
export const DASHED: ContourStyle = {id: 'contours-second', dash: [3, 2], labels: false};

/** Outlines of the four time bands as GeoJSON lines above the field, each labelled with its minutes. */
export class ContourLayer {
  private data: ContourFeatureCollection = EMPTY;

  constructor(
    private readonly map: maplibregl.Map,
    private readonly grid: Grid,
    private readonly style: ContourStyle = SOLID,
  ) {}

  /** Sets the field to outline, or clears the outlines with null. */
  set(field: Float32Array | null): void {
    this.data = field ? contoursGeoJson(field, this.grid, BAND_MINUTES) : EMPTY;
  }

  /** Draws the outlines for a theme, adding the source and layers when the style lacks them. */
  render(theme: Theme): void {
    const paint = contourPaint(theme);
    const SOURCE = this.style.id;
    const LINES = `${SOURCE}-lines`;
    const LABELS = `${SOURCE}-labels`;
    const source = this.map.getSource(SOURCE) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(this.data as never);
      this.map.setPaintProperty(LINES, 'line-color', paint.line);
      if (this.style.labels) {
        this.map.setPaintProperty(LABELS, 'text-color', paint.line);
        this.map.setPaintProperty(LABELS, 'text-halo-color', paint.halo);
      }
      return;
    }
    this.map.addSource(SOURCE, {type: 'geojson', data: this.data as never});
    this.map.addLayer({
      id: LINES,
      type: 'line',
      source: SOURCE,
      layout: {'line-join': 'round', 'line-cap': 'round'},
      paint: {'line-color': paint.line, 'line-width': 1.5, 'line-opacity': 0.85, ...(this.style.dash ? {'line-dasharray': this.style.dash} : {})},
    });
    if (!this.style.labels) return;
    this.map.addLayer({
      id: LABELS,
      type: 'symbol',
      source: SOURCE,
      layout: {
        'symbol-placement': 'line',
        'symbol-spacing': 320,
        'text-field': ['concat', ['to-string', ['get', 'minutes']], ' min'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 12,
        'text-keep-upright': true,
        'text-max-angle': 180,
        'text-padding': 4,
      },
      paint: {'text-color': paint.line, 'text-halo-color': paint.halo, 'text-halo-width': 2},
    });
  }
}
