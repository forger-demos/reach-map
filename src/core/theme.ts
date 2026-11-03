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
