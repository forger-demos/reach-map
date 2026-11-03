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
