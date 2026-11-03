import {expect, test} from 'bun:test';
import {parseTheme, resolveTheme, styleFor, stopPaint} from './theme';

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
