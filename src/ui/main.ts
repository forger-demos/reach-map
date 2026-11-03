import * as maplibregl from 'maplibre-gl';
import {creditOf} from '../core/credit';
import {validateManifest} from '../core/manifest';
import {stopsGeoJson, type StopFeatureCollection} from '../core/stops-geojson';
import {parseTheme, resolveTheme, stopPaint, styleFor, type Theme} from '../core/theme';
import {decode} from '../core/timetable';

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

let stops: StopFeatureCollection | null = null;

function drawStops(): void {
  if (!stops) return;
  const paint = stopPaint(theme);
  if (map.getSource('stops')) {
    map.setPaintProperty('stops', 'circle-color', paint.fill);
    map.setPaintProperty('stops', 'circle-stroke-color', paint.outline);
    return;
  }
  map.addSource('stops', {type: 'geojson', data: stops as never});
  map.addLayer({
    id: 'stops',
    type: 'circle',
    source: 'stops',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 1.5, 12, 3, 16, 5],
      'circle-color': paint.fill,
      'circle-stroke-color': paint.outline,
      'circle-stroke-width': 0.75,
    },
  });
}
// A new base style drops our source and layer, so draw them again once it has loaded.
map.on('style.load', drawStops);

const status = document.getElementById('status') as HTMLElement;
const credit = document.getElementById('credit') as HTMLElement;

function showCredit(manifest: ReturnType<typeof validateManifest>): void {
  const c = creditOf(manifest);
  const link = (href: string, text: string): HTMLAnchorElement => {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  };
  credit.replaceChildren(
    'Timetables: ',
    link(c.publisherUrl, `${c.publisher} ${c.year}`),
    ', ',
    link(c.licenseUrl, c.license),
    `. Feed ${c.feedVersion}, service date ${c.serviceDate}.`,
  );
}

async function loadTimetable(): Promise<void> {
  try {
    const res = await fetch('data/manifest.json');
    if (!res.ok) throw new Error(`manifest ${res.status}`);
    const manifest = validateManifest(await res.json());
    const file = await fetch(`data/${manifest.files.weekday}`);
    if (!file.ok) throw new Error(`timetable ${file.status}`);
    const tt = decode(new Uint8Array(await file.arrayBuffer()));
    stops = stopsGeoJson(tt);
    status.textContent = `${tt.stopCount} stops. Weekday timetable.`;
    status.dataset.state = 'ready';
    showCredit(manifest);
    if (map.isStyleLoaded()) drawStops();
  } catch {
    status.textContent = 'The timetable could not be loaded. The map still works.';
    status.dataset.state = 'failed';
  }
}
void loadTimetable();

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
