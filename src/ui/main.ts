import * as maplibregl from 'maplibre-gl';
import {creditOf} from '../core/credit';
import {CELL_METRES, computeField, makeGrid, reachedCells, REGION} from '../core/field';
import {indexStops, raptor, type StopIndex} from '../core/raptor';
import {BAND_MINUTES, DEFAULT_DEPARTURE, MAX_ROUNDS, bandsOf, reachableWithin, sourcesNear} from '../core/reach';
import {validateManifest} from '../core/manifest';
import {stopsGeoJson, type StopFeatureCollection} from '../core/stops-geojson';
import {bandColours, bandExpression, parseTheme, resolveTheme, stopPaint, styleFor, type Theme} from '../core/theme';
import {decode, type Timetable} from '../core/timetable';
import {FieldLayer} from './field-layer';

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
let timetable: Timetable | null = null;
let index: StopIndex | null = null;
let origin: [number, number] | null = null;
let showStops = false;
let latest = 0;

const grid = makeGrid(REGION, CELL_METRES);
const field = new FieldLayer(map, grid);
const stopsToggle = document.getElementById('stops-toggle') as HTMLInputElement;
const stopsRow = document.getElementById('stops-row') as HTMLElement;

/** Dots give way to the colour field once there is one; the toggle brings them back. */
function applyStopVisibility(): void {
  stopsRow.hidden = !origin;
  if (map.getLayer('stops')) map.setLayoutProperty('stops', 'visibility', !origin || showStops ? 'visible' : 'none');
}

const stopColour = () => (origin ? bandExpression(theme, stopPaint(theme).fill) : stopPaint(theme).fill);

function drawOrigin(): void {
  const data = {
    type: 'FeatureCollection',
    features: origin ? [{type: 'Feature', properties: {}, geometry: {type: 'Point', coordinates: origin}}] : [],
  };
  const source = map.getSource('origin') as maplibregl.GeoJSONSource | undefined;
  if (source) {
    source.setData(data as never);
    map.setPaintProperty('origin', 'circle-stroke-color', stopPaint(theme).outline);
    return;
  }
  map.addSource('origin', {type: 'geojson', data: data as never});
  map.addLayer({
    id: 'origin',
    type: 'circle',
    source: 'origin',
    paint: {'circle-radius': 8, 'circle-color': '#e5484d', 'circle-stroke-color': stopPaint(theme).outline, 'circle-stroke-width': 2},
  });
}

function drawStops(): void {
  if (!stops) return;
  const paint = stopPaint(theme);
  const source = map.getSource('stops') as maplibregl.GeoJSONSource | undefined;
  if (source) {
    source.setData(stops as never);
    map.setPaintProperty('stops', 'circle-color', stopColour() as never);
    map.setPaintProperty('stops', 'circle-stroke-color', paint.outline);
    drawOrigin();
    applyStopVisibility();
    return;
  }
  map.addSource('stops', {type: 'geojson', data: stops as never});
  map.addLayer({
    id: 'stops',
    type: 'circle',
    source: 'stops',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 1.5, 12, 3, 16, 5],
      'circle-color': stopColour() as never,
      'circle-stroke-color': paint.outline,
      'circle-stroke-width': 0.75,
    },
  });
  drawOrigin();
  applyStopVisibility();
}
// A new base style drops our sources and layers, so draw them again once it has loaded.
map.on('style.load', () => {
  field.render(theme);
  drawStops();
});

const status = document.getElementById('status') as HTMLElement;
const credit = document.getElementById('credit') as HTMLElement;
const legend = document.getElementById('legend') as HTMLElement;

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
    timetable = tt;
    index = indexStops(tt);
    stops = stopsGeoJson(tt);
    status.textContent = 'Click the map to see where public transport takes you from there, leaving 08:00 on a weekday.';
    status.dataset.state = 'ready';
    showCredit(manifest);
    if (map.isStyleLoaded()) drawStops();
  } catch {
    status.textContent = 'The timetable could not be loaded. The map still works.';
    status.dataset.state = 'failed';
  }
}
void loadTimetable();

function showLegend(): void {
  legend.replaceChildren(
    ...bandColours(theme).bands.map((colour, i) => {
      const item = document.createElement('li');
      const swatch = document.createElement('span');
      swatch.className = 'swatch';
      swatch.style.background = colour;
      item.append(swatch, `Up to ${BAND_MINUTES[i]} min`);
      return item;
    }),
  );
  legend.hidden = !origin;
}

map.on('click', (e) => {
  if (!timetable || !index) return;
  const tt = timetable;
  const idx = index;
  const {lng, lat} = e.lngLat;
  const mine = ++latest;
  // The previous field stays on screen while this one is computed.
  status.textContent = 'Computing...';
  status.dataset.state = 'computing';
  setTimeout(() => {
    if (mine !== latest) return;
    const sources = sourcesNear(tt, lat, lng, DEFAULT_DEPARTURE);
    const result = sources.length > 0 ? raptor(tt, idx, sources, MAX_ROUNDS) : null;
    const values = result
      ? computeField(grid, {stopLat: tt.stopLat, stopLon: tt.stopLon, arrival: result.arrival, departure: DEFAULT_DEPARTURE})
      : null;
    if (!result || !values || reachedCells(values) === 0) {
      origin = null;
      stops = stopsGeoJson(tt);
      field.set(null);
      status.textContent = 'No stop is within walking range of that point. Click closer to a stop.';
      status.dataset.state = 'empty';
    } else {
      origin = [lng, lat];
      stops = stopsGeoJson(tt, bandsOf(result.arrival, DEFAULT_DEPARTURE));
      field.set(values);
      const n = reachableWithin(result.arrival, DEFAULT_DEPARTURE, 30);
      status.textContent = `${n} ${n === 1 ? 'stop' : 'stops'} within 30 minutes, leaving 08:00 on a weekday.`;
      status.dataset.state = 'reach';
    }
    field.render(theme);
    drawStops();
    showLegend();
  }, 0);
});

stopsToggle.addEventListener('change', () => {
  showStops = stopsToggle.checked;
  applyStopVisibility();
});

function setTheme(next: Theme): void {
  if (next === theme) return;
  theme = next;
  applyChrome();
  showLegend();
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
