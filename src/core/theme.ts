export type Theme = 'light' | 'dark';

const STYLES: Record<Theme, string> = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};

export function styleFor(theme: Theme): string {
  return STYLES[theme];
}

export function resolveTheme(override: Theme | null, prefersDark: boolean): Theme {
  return override ?? (prefersDark ? 'dark' : 'light');
}

export function parseTheme(value: string | null): Theme | null {
  return value === 'light' || value === 'dark' ? value : null;
}

/** Colour of the stop dots and their outline, chosen to read on each base map. */
export function stopPaint(theme: Theme): {fill: string; outline: string} {
  return theme === 'dark' ? {fill: '#7cc4ff', outline: '#0c0e14'} : {fill: '#0a62b8', outline: '#ffffff'};
}

/** One colour per time band, nearest first, then the colour of stops beyond the last band. Sequential and readable on both base maps. */
export function bandColours(theme: Theme): {bands: string[]; beyond: string} {
  return theme === 'dark'
    ? {bands: ['#fde725', '#5ec962', '#21918c', '#6a4fb0'], beyond: '#4a5568'}
    : {bands: ['#e8a800', '#2e9e4a', '#157a8c', '#4a2f9a'], beyond: '#a0a8b5'};
}

/** Map paint expression colouring a stop by its `band` property, and by `plain` when it has none. */
export function bandExpression(theme: Theme, plain: string): unknown[] {
  const {bands, beyond} = bandColours(theme);
  const match: unknown[] = ['match', ['get', 'band']];
  bands.forEach((c, i) => match.push(i, c));
  match.push(beyond);
  return ['case', ['has', 'band'], match, plain];
}

/** Colour of the outlines and their minute labels, and the halo that keeps them readable on the field and the base map. */
export function contourPaint(theme: Theme): {line: string; halo: string} {
  return theme === 'dark' ? {line: '#ffffff', halo: '#0c0e14'} : {line: '#1b1f2a', halo: '#ffffff'};
}

/** Colour of each journey mode on the path; walking is neutral so rides stand out. */
export function modeColours(theme: Theme): Record<'walk' | 'tram' | 'metro' | 'rail' | 'bus' | 'ferry', string> {
  return theme === 'dark'
    ? {walk: '#c9d1dc', tram: '#5ec962', metro: '#ff8a3d', rail: '#c792ff', bus: '#7cc4ff', ferry: '#4dd6d6'}
    : {walk: '#4b5563', tram: '#1f8a3b', metro: '#d9560b', rail: '#7a3fc4', bus: '#0a62b8', ferry: '#0f8a8a'};
}
