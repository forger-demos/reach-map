import {expect, test} from 'bun:test';
import {bandColours, bandExpression, contourPaint, modeColours, parseTheme, resolveTheme, styleFor, stopPaint} from './theme';

test.each([
  ['light', 'https://tiles.openfreemap.org/styles/positron'],
  ['dark', 'https://tiles.openfreemap.org/styles/dark'],
] as const)('styleFor %s', (theme, url) => {
  expect(styleFor(theme)).toBe(url);
});

test('an explicit choice beats the system preference', () => {
  expect(resolveTheme('light', true)).toBe('light');
  expect(resolveTheme('dark', false)).toBe('dark');
  expect(resolveTheme(null, true)).toBe('dark');
  expect(resolveTheme(null, false)).toBe('light');
});

test('parseTheme accepts only known themes', () => {
  expect(parseTheme('dark')).toBe('dark');
  expect(parseTheme('light')).toBe('light');
  expect(parseTheme('sepia')).toBeNull();
  expect(parseTheme(null)).toBeNull();
});

test('stop dots differ between themes', () => {
  expect(stopPaint('light')).not.toEqual(stopPaint('dark'));
});

test('the band expression colours banded stops and leaves unbanded ones plain', () => {
  const e = bandExpression('light', '#123456') as unknown[];
  expect(e[0]).toBe('case');
  expect(e[3]).toBe('#123456');
  expect((e[2] as unknown[]).length).toBe(2 + 2 * 4 + 1);
});

test('every theme has one colour per band', () => {
  expect(bandColours('dark').bands.length).toBe(4);
  expect(bandColours('light').bands.length).toBe(4);
});

test('outline colour and halo differ in each theme so labels read on both base maps', () => {
  for (const t of ['light', 'dark'] as const) expect(contourPaint(t).line).not.toBe(contourPaint(t).halo);
  expect(contourPaint('light').line).not.toBe(contourPaint('dark').line);
});

test('every mode has its own colour in each theme, so rides can be told apart', () => {
  for (const t of ['light', 'dark'] as const) {
    const colours = Object.values(modeColours(t));
    expect(new Set(colours).size).toBe(colours.length);
  }
});
