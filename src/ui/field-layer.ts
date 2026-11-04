import type * as maplibregl from 'maplibre-gl';
import type {Grid} from '../core/field';
import {fieldPixels} from '../core/ramp';
import type {Theme} from '../core/theme';

const ID = 'field';

/** Paints a field into an off-screen canvas and shows it on the map as a canvas source under the labels. */
export class FieldLayer {
  private readonly canvas = document.createElement('canvas');
  private field: Float32Array | null = null;

  constructor(
    private readonly map: maplibregl.Map,
    private readonly grid: Grid,
  ) {
    this.canvas.width = grid.cols;
    this.canvas.height = grid.rows;
  }

  /** Sets the field to show, or clears it with null. */
  set(field: Float32Array | null): void {
    this.field = field;
  }

  /** Draws the current field for a theme, adding the source and layer when the style lacks them. */
  render(theme: Theme): void {
    const ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    if (this.field) {
      ctx.putImageData(new ImageData(fieldPixels(this.field, theme), this.grid.cols, this.grid.rows), 0, 0);
    } else {
      ctx.clearRect(0, 0, this.grid.cols, this.grid.rows);
    }
    const source = this.map.getSource(ID) as maplibregl.CanvasSource | undefined;
    if (source) {
      // A paused canvas source only re-reads its canvas when asked to play once.
      source.play();
      source.pause();
      this.map.triggerRepaint();
      return;
    }
    const {west, east, north, south} = this.grid;
    this.map.addSource(ID, {
      type: 'canvas',
      canvas: this.canvas,
      coordinates: [[west, north], [east, north], [east, south], [west, south]],
      animate: false,
    });
    // Labels stay readable above the colour.
    const beforeId = this.map.getStyle().layers.find((l) => l.type === 'symbol')?.id;
    this.map.addLayer({id: ID, type: 'raster', source: ID, paint: {'raster-resampling': 'linear', 'raster-fade-duration': 0}}, beforeId);
  }
}
