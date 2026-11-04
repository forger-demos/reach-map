// Colour for a difference field. Diverging: two hues that survive the common colour vision
// deficiencies (blue and orange), a neutral at zero, and a stronger shade where a cell is
// reached on one side only. Away from the neutral each side moves further in lightness, so the
// size of a difference reads without hue.
import {BOTH, ONLY_FIRST, ONLY_SECOND, type FieldDiff} from './diff';
import {FIELD_ALPHA, TRANSPARENT, type Rgba} from './ramp';
import type {Theme} from './theme';

/** A difference this large, in minutes, or larger, takes the full colour. */
export const DIFF_RANGE_MINUTES = 30;

interface Palette {
  /** Reached only by the second. */
  gained: string;
  faster: string;
  neutral: string;
  slower: string;
  /** Reached only by the first. */
  lost: string;
}

export const DIFF_PALETTE: Record<Theme, Palette> = {
  light: {gained: '#053061', faster: '#2c7fb8', neutral: '#f2f2f2', slower: '#d95f0e', lost: '#7f2704'},
  dark: {gained: '#e0f3ff', faster: '#5aaee6', neutral: '#454b5a', slower: '#f29a4a', lost: '#ffd9b0'},
};

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Colour of one cell: its kind and, when both sides reach it, the difference in minutes (second minus first). */
export function diffColour(kind: number, deltaMinutes: number, theme: Theme): Rgba {
  const p = DIFF_PALETTE[theme];
  if (kind === ONLY_SECOND) return [...rgb(p.gained), FIELD_ALPHA];
  if (kind === ONLY_FIRST) return [...rgb(p.lost), FIELD_ALPHA];
  if (kind !== BOTH || !Number.isFinite(deltaMinutes)) return TRANSPARENT;
  const t = Math.max(-1, Math.min(1, deltaMinutes / DIFF_RANGE_MINUTES));
  const from = rgb(p.neutral);
  const to = rgb(t < 0 ? p.faster : p.slower);
  const f = Math.abs(t);
  const mix = (k: 0 | 1 | 2) => Math.round(from[k] + (to[k] - from[k]) * f);
  return [mix(0), mix(1), mix(2), FIELD_ALPHA];
}

/** RGBA pixels, row-major, for a difference. */
export function diffPixels(diff: FieldDiff, theme: Theme): Uint8ClampedArray {
  const out = new Uint8ClampedArray(diff.kind.length * 4);
  for (let i = 0; i < diff.kind.length; i++) {
    out.set(diffColour(diff.kind[i] as number, (diff.delta[i] as number) / 60, theme), i * 4);
  }
  return out;
}

/** The legend, in the order the colours run from quicker to slower, each with a name so colour is not the only carrier. */
export function diffLegend(theme: Theme): Array<{label: string; colour: string}> {
  const p = DIFF_PALETTE[theme];
  return [
    {label: 'Only the second reaches', colour: p.gained},
    {label: `Second quicker by ${DIFF_RANGE_MINUTES} min or more`, colour: p.faster},
    {label: 'Same', colour: p.neutral},
    {label: `Second slower by ${DIFF_RANGE_MINUTES} min or more`, colour: p.slower},
    {label: 'Only the first reaches', colour: p.lost},
  ];
}
