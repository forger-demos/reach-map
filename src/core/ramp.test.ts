import {expect, test} from 'bun:test';
import {BAND_MINUTES} from './reach';
import {FIELD_ALPHA, fieldPixels, luminance, rampColour, TRANSPARENT} from './ramp';
import {bandColours, type Theme} from './theme';

const themes: Theme[] = ['light', 'dark'];

test('unreachable and beyond the last step are transparent', () => {
  for (const theme of themes) {
    expect(rampColour(Infinity, theme)).toEqual(TRANSPARENT);
    expect(rampColour(NaN, theme)).toEqual(TRANSPARENT);
    expect(rampColour(60.01, theme)).toEqual(TRANSPARENT);
    expect(rampColour(60, theme)[3]).toBe(FIELD_ALPHA);
  }
});

test('longer trips are never lighter than shorter ones', () => {
  for (const theme of themes) {
    let previous = Infinity;
    for (let minutes = 0; minutes <= 60; minutes += 0.5) {
      const l = luminance(rampColour(minutes, theme));
      expect(l).toBeLessThanOrEqual(previous + 1e-9);
      previous = l;
    }
    expect(luminance(rampColour(0, theme))).toBeGreaterThan(luminance(rampColour(60, theme)));
  }
});

test('the two themes use different colours at every step', () => {
  for (const minutes of [0, 10, 15, 30, 45, 60]) {
    expect(rampColour(minutes, 'light')).not.toEqual(rampColour(minutes, 'dark'));
  }
});

test('the ramp meets the legend colour at each band edge', () => {
  for (const theme of themes) {
    BAND_MINUTES.forEach((minutes, i) => {
      const hex = (bandColours(theme).bands[i] as string).slice(1);
      const n = parseInt(hex, 16);
      expect(rampColour(minutes, theme).slice(0, 3)).toEqual([(n >> 16) & 255, (n >> 8) & 255, n & 255]);
    });
  }
});

test('colours blend halfway between anchors and negative times clamp to zero', () => {
  // Light anchors: #f6c900 at 0 and #e8a800 at 15, so 7.5 minutes is their midpoint (green 201 and 168 average to 184.5, rounded up).
  expect(rampColour(7.5, 'light').slice(0, 3)).toEqual([239, 185, 0]);
  expect(rampColour(-5, 'light')).toEqual(rampColour(0, 'light'));
});

test('pixels are RGBA in cell order with transparent holes', () => {
  const px = fieldPixels([0, Infinity, 1800], 'dark');
  expect(px.length).toBe(12);
  expect(Array.from(px.slice(0, 4))).toEqual(Array.from(rampColour(0, 'dark')));
  expect(Array.from(px.slice(4, 8))).toEqual([0, 0, 0, 0]);
  expect(Array.from(px.slice(8, 12))).toEqual(Array.from(rampColour(30, 'dark')));
});
