import * as maplibregl from 'maplibre-gl';
import {parseTheme, resolveTheme, styleFor, type Theme} from '../core/theme';

const STORAGE_KEY = 'reach-map-theme';
const HELSINKI_BOUNDS: [[number, number], [number, number]] = [[24.55, 60.07], [25.3, 60.35]];

const query = window.matchMedia('(prefers-color-scheme: dark)');
let override = parseTheme(localStorage.getItem(STORAGE_KEY));
let theme: Theme = resolveTheme(override, query.matches);

function applyChrome(): void {
  document.documentElement.dataset.theme = theme;
  button.textContent = theme === 'dark' ? 'Light' : 'Dark';
  button.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
}

const button = document.getElementById('theme-toggle') as HTMLButtonElement;
applyChrome();

const map = new maplibregl.Map({
  container: 'map',
  style: styleFor(theme),
  bounds: HELSINKI_BOUNDS,
  fitBoundsOptions: {padding: 24},
  attributionControl: false,
});
map.addControl(new maplibregl.AttributionControl({compact: false, customAttribution: '<a href="https://maplibre.org/">MapLibre</a>'}), 'bottom-right');
map.addControl(new maplibregl.NavigationControl({showCompass: false}), 'top-right');

function setTheme(next: Theme): void {
  if (next === theme) return;
  theme = next;
  applyChrome();
  map.setStyle(styleFor(theme));
}

button.addEventListener('click', () => {
  override = theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(STORAGE_KEY, override);
  setTheme(override);
});

query.addEventListener('change', () => {
  if (override === null) setTheme(resolveTheme(null, query.matches));
});

(window as unknown as {__map: maplibregl.Map}).__map = map;
