// Travel time to colour. Sequential and ordered by lightness, so nearer reads brighter on the
// dark base map and warmer-lighter on the light one. Unreachable cells are transparent.
import {BAND_MINUTES} from './reach';
import {bandColours, type Theme} from './theme';

export type Rgba = readonly [number, number, number, number];

export const TRANSPARENT: Rgba = [0, 0, 0, 0];

/** How opaque a reached cell is, 0 to 255: the base map stays readable underneath. */
export const FIELD_ALPHA = 170;

const START: Record<Theme, string> = {light: '#f6c900', dark: '#fff7a8'};

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Anchors of the ramp: minute and colour, meeting the legend colours at each band edge. */
function anchors(theme: Theme): Array<{minutes: number; colour: [number, number, number]}> {
  const {bands} = bandColours(theme);
  return [
    {minutes: 0, colour: rgb(START[theme])},
    ...bands.map((hex, i) => ({minutes: BAND_MINUTES[i] as number, colour: rgb(hex)})),
  ];
}

/** Colour of a cell that takes `minutes` to reach; transparent when unreachable or past the last band. */
export function rampColour(minutes: number, theme: Theme): Rgba {
  const stops = anchors(theme);
  const last = stops[stops.length - 1];
  if (!(minutes <= (last?.minutes as number))) return TRANSPARENT;
  const clamped = Math.max(0, minutes);
  let i = 1;
  while ((stops[i]?.minutes as number) < clamped) i++;
  const a = stops[i - 1] as (typeof stops)[number];
  const b = stops[i] as (typeof stops)[number];
  const f = (clamped - a.minutes) / (b.minutes - a.minutes);
  const mix = (k: 0 | 1 | 2) => Math.round(a.colour[k] + (b.colour[k] - a.colour[k]) * f);
  return [mix(0), mix(1), mix(2), FIELD_ALPHA];
}

/** RGBA pixels, row-major, for a field of seconds. */
export function fieldPixels(field: ArrayLike<number>, theme: Theme): Uint8ClampedArray {
  const out = new Uint8ClampedArray(field.length * 4);
  for (let i = 0; i < field.length; i++) out.set(rampColour((field[i] as number) / 60, theme), i * 4);
  return out;
}

/** Relative luminance of a colour, 0 (black) to 1 (white). */
export function luminance(c: Rgba): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
}
