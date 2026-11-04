import {expect, test} from 'bun:test';
import {BOTH, diffFields, NEITHER, ONLY_FIRST, ONLY_SECOND} from './diff';
import {DIFF_PALETTE, DIFF_RANGE_MINUTES, diffColour, diffLegend, diffPixels} from './diff-ramp';
import {FIELD_ALPHA, luminance, TRANSPARENT, type Rgba} from './ramp';
import type {Theme} from './theme';

const themes: Theme[] = ['light', 'dark'];

function hexLuminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return luminance([(n >> 16) & 255, (n >> 8) & 255, n & 255, 255] as Rgba);
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [hexLuminance(a), hexLuminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

test('zero is the neutral, the range is the full colour, and beyond it stays there', () => {
  for (const theme of themes) {
    const p = DIFF_PALETTE[theme];
    const rgb = (hex: string): Rgba => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), FIELD_ALPHA];
    expect(diffColour(BOTH, 0, theme)).toEqual(rgb(p.neutral));
    expect(diffColour(BOTH, -DIFF_RANGE_MINUTES, theme)).toEqual(rgb(p.faster));
    expect(diffColour(BOTH, -500, theme)).toEqual(rgb(p.faster));
    expect(diffColour(BOTH, DIFF_RANGE_MINUTES, theme)).toEqual(rgb(p.slower));
    expect(diffColour(BOTH, 500, theme)).toEqual(rgb(p.slower));
  }
});

test('one-sided cells have their own colours and empty cells are transparent', () => {
  for (const theme of themes) {
    const p = DIFF_PALETTE[theme];
    expect(diffColour(ONLY_SECOND, NaN, theme).slice(0, 3)).toEqual([parseInt(p.gained.slice(1, 3), 16), parseInt(p.gained.slice(3, 5), 16), parseInt(p.gained.slice(5, 7), 16)]);
    expect(diffColour(ONLY_FIRST, NaN, theme)).not.toEqual(diffColour(ONLY_SECOND, NaN, theme));
    expect(diffColour(NEITHER, NaN, theme)).toEqual(TRANSPARENT);
    expect(diffColour(BOTH, NaN, theme)).toEqual(TRANSPARENT);
  }
});

test('halfway between zero and the range is halfway between the colours', () => {
  // Light: neutral #f2f2f2 (242, 242, 242) and faster #2c7fb8 (44, 127, 184): halves are 143, 184.5 and 213.
  expect(diffColour(BOTH, -DIFF_RANGE_MINUTES / 2, 'light').slice(0, 3)).toEqual([143, 185, 213]);
});

test('each side moves the same way in lightness the further it is from zero, and clear of the neutral', () => {
  for (const theme of themes) {
    const p = DIFF_PALETTE[theme];
    const sign = theme === 'light' ? -1 : 1;
    for (const side of [[p.neutral, p.faster, p.gained], [p.neutral, p.slower, p.lost]]) {
      const l = side.map(hexLuminance);
      expect(sign * (l[1] as number - (l[0] as number))).toBeGreaterThan(0);
      expect(sign * (l[2] as number - (l[1] as number))).toBeGreaterThan(0);
      // Non-text contrast: the full colour stands clear of the neutral.
      expect(contrast(side[0] as string, side[1] as string)).toBeGreaterThanOrEqual(3);
    }
  }
});

test('the two sides are different hues: blue is the quicker side, orange the slower', () => {
  for (const theme of themes) {
    const p = DIFF_PALETTE[theme];
    const hue = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      return [(n >> 16) & 255, n & 255] as const;
    };
    const [fr, fb] = hue(p.faster);
    const [sr, sb] = hue(p.slower);
    expect(fb).toBeGreaterThan(fr);
    expect(sr).toBeGreaterThan(sb);
  }
});

test('pixels follow the diff in cell order', () => {
  const d = diffFields([600, Infinity, Infinity], [600, 600, Infinity]);
  const px = diffPixels(d, 'dark');
  expect(Array.from(px.slice(0, 4))).toEqual(Array.from(diffColour(BOTH, 0, 'dark')));
  expect(Array.from(px.slice(4, 8))).toEqual(Array.from(diffColour(ONLY_SECOND, NaN, 'dark')));
  expect(Array.from(px.slice(8, 12))).toEqual([0, 0, 0, 0]);
});

test('the legend names every colour', () => {
  for (const theme of themes) {
    const legend = diffLegend(theme);
    expect(legend.map((l) => l.colour)).toEqual(Object.values(DIFF_PALETTE[theme]));
    expect(new Set(legend.map((l) => l.label)).size).toBe(5);
  }
});
