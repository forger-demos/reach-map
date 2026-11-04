import * as maplibregl from 'maplibre-gl';
import {creditOf} from '../core/credit';
import {CELL_METRES, computeField, makeGrid, reachedCells, REGION} from '../core/field';
import {describe} from '../core/describe';
import {diffFields, isFlat, readout} from '../core/diff';
import {diffLegend} from '../core/diff-ramp';
import {hoverJourney} from '../core/hover';
import {pathGeoJson} from '../core/journey-geojson';
import {indexStops, raptor, type Result, type StopIndex} from '../core/raptor';
import {BAND_MINUTES, MAX_ROUNDS, bandsOf, reachableWithin, sourcesNear} from '../core/reach';
import {clockLabel, resolveServiceDay, type DayType} from '../core/service-day';
import {validateManifest} from '../core/manifest';
import {stopsGeoJson, type StopFeatureCollection} from '../core/stops-geojson';
import {bandColours, bandExpression, modeColours, parseTheme, resolveTheme, stopPaint, styleFor, type Theme} from '../core/theme';
import {decode, type Timetable} from '../core/timetable';
import {ContourLayer, DASHED} from './contour-layer';
import {FieldLayer} from './field-layer';
import {JourneyLayer} from './journey-layer';

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

interface Loaded {
  timetable: Timetable;
  index: StopIndex;
}

let stops: StopFeatureCollection | null = null;
let manifest: ReturnType<typeof validateManifest> | null = null;
const days = new Map<DayType, Promise<Loaded>>();
let dayType: DayType = 'weekday';
let clock = 8 * 3600;
let loaded: Loaded | null = null;
let loadedDayType: DayType = 'weekday';
let origin: [number, number] | null = null;

type Mode = 'single' | 'places' | 'times';
/** Comparison: two points at one time, or one point at two times. The second situation is the one compared against the first. */
let mode: Mode = 'single';
let origin2: [number, number] | null = null;
let dayType2: DayType = 'weekday';
let clock2 = 8 * 3600;
let loadedDayType2: DayType = 'weekday';
/** The second time counts only once the traveller has set it; until then a hint asks for it. */
let chosen2 = false;
let pick: 'first' | 'second' = 'first';
let comparing = false;
let showStops = false;
let latest = 0;

const grid = makeGrid(REGION, CELL_METRES);
const field = new FieldLayer(map, grid);
const outlines = new ContourLayer(map, grid);
const outlines2 = new ContourLayer(map, grid, DASHED);
const journeyLayer = new JourneyLayer(map);
/** The last search, kept so hovering reads it instead of searching again. */
let current: {tt: Timetable; result: Result; offset: number; origin: [number, number]} | null = null;
const stopsToggle = document.getElementById('stops-toggle') as HTMLInputElement;
const stopsRow = document.getElementById('stops-row') as HTMLElement;

/** Dots give way to the colour field once there is one; the toggle brings them back. */
function applyStopVisibility(): void {
  stopsRow.hidden = !origin;
  if (map.getLayer('stops')) map.setLayoutProperty('stops', 'visibility', !origin || showStops ? 'visible' : 'none');
}

const stopColour = () => (origin ? bandExpression(theme, stopPaint(theme).fill) : stopPaint(theme).fill);

function drawOrigin(): void {
  const marks: Array<{at: [number, number]; second: boolean}> = [];
  if (origin) marks.push({at: origin, second: false});
  if (origin2 && mode === 'places') marks.push({at: origin2, second: true});
  const data = {
    type: 'FeatureCollection',
    features: marks.map((m) => ({type: 'Feature', properties: {second: m.second}, geometry: {type: 'Point', coordinates: m.at}})),
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
    paint: {'circle-radius': 8, 'circle-color': ['case', ['get', 'second'], '#8e44ad', '#e5484d'], 'circle-stroke-color': stopPaint(theme).outline, 'circle-stroke-width': 2},
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
  outlines.render(theme);
  outlines2.render(theme);
  journeyLayer.render(theme);
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

/** One fetch per day file; a failed fetch is forgotten so choosing it again retries. */
function loadDay(day: DayType): Promise<Loaded> {
  let pending = days.get(day);
  if (!pending) {
    pending = (async () => {
      const res = await fetch(`data/${(manifest as NonNullable<typeof manifest>).files[day]}`);
      if (!res.ok) throw new Error(`timetable ${res.status}`);
      const timetable = decode(new Uint8Array(await res.arrayBuffer()));
      return {timetable, index: indexStops(timetable)};
    })();
    pending.catch(() => days.delete(day));
    days.set(day, pending);
  }
  return pending;
}

const when = document.getElementById('when') as HTMLFieldSetElement;
const slider = document.getElementById('time-slider') as HTMLInputElement;
const timeLabel = document.getElementById('time-label') as HTMLOutputElement;
const dayRadios = [...document.querySelectorAll<HTMLInputElement>('input[name="day"]')];
const modeSet = document.getElementById('mode') as HTMLFieldSetElement;
const modeRadios = [...document.querySelectorAll<HTMLInputElement>('input[name="mode"]')];
const pickRow = document.getElementById('pick') as HTMLElement;
const pickRadios = [...document.querySelectorAll<HTMLInputElement>('input[name="pick"]')];
const when2 = document.getElementById('when2') as HTMLElement;
const day2Radios = [...document.querySelectorAll<HTMLInputElement>('input[name="day2"]')];
const slider2 = document.getElementById('time-slider2') as HTMLInputElement;
const timeLabel2 = document.getElementById('time-label2') as HTMLOutputElement;
const whenLegend = document.getElementById('when-legend') as HTMLElement;
const DAY_NAMES: Record<DayType, string> = {weekday: 'a weekday', saturday: 'a Saturday', sunday: 'a Sunday'};

function showClock(): void {
  const text = clockLabel(clock);
  timeLabel.textContent = text;
  slider.setAttribute('aria-valuetext', text);
}

async function loadTimetable(): Promise<void> {
  try {
    const res = await fetch('data/manifest.json');
    if (!res.ok) throw new Error(`manifest ${res.status}`);
    manifest = validateManifest(await res.json());
    loaded = await loadDay(dayType);
    stops = stopsGeoJson(loaded.timetable);
    status.textContent = 'Click the map to see where public transport takes you from there, leaving 08:00 on a weekday.';
    status.dataset.state = 'ready';
    showCredit(manifest);
    when.disabled = false;
    modeSet.disabled = false;
    if (map.isStyleLoaded()) drawStops();
  } catch {
    status.textContent = 'The timetable could not be loaded. The map still works.';
    status.dataset.state = 'failed';
  }
}
void loadTimetable();

function showLegend(): void {
  const entries = comparing
    ? diffLegend(theme)
    : bandColours(theme).bands.map((colour, i) => ({colour, label: `Up to ${BAND_MINUTES[i]} min`}));
  legend.replaceChildren(
    ...entries.map((entry) => {
      const item = document.createElement('li');
      const swatch = document.createElement('span');
      swatch.className = 'swatch';
      swatch.style.background = entry.colour;
      item.append(swatch, entry.label);
      return item;
    }),
  );
  legend.hidden = !origin;
}

interface Search {
  tt: Timetable;
  result: Result;
  offset: number;
  values: Float32Array;
}

type Outcome = {kind: 'ok'; search: Search} | {kind: 'stale'} | {kind: 'failed'; day: DayType} | {kind: 'nostop'; tt: Timetable};

/** Searches from a point for a day and time, and fills the field. `mine` is the request number; a newer request makes this one stale. */
async function search(from: [number, number], chosenDay: DayType, time: number, mine: number): Promise<Outcome> {
  const [lng, lat] = from;
  const query = resolveServiceDay(chosenDay, time);
  if (!days.has(query.dayType)) {
    status.textContent = `Loading ${query.dayType} timetable...`;
    status.dataset.state = 'computing';
  }
  let day: Loaded;
  try {
    day = await loadDay(query.dayType);
  } catch {
    return mine !== latest ? {kind: 'stale'} : {kind: 'failed', day: query.dayType};
  }
  if (mine !== latest) return {kind: 'stale'};
  status.textContent = 'Computing...';
  status.dataset.state = 'computing';
  await new Promise((resolve) => setTimeout(resolve, 0));
  if (mine !== latest) return {kind: 'stale'};
  const tt = day.timetable;
  const sources = sourcesNear(tt, lat, lng, query.offset);
  const result = sources.length > 0 ? raptor(tt, day.index, sources, MAX_ROUNDS) : null;
  const values = result
    ? computeField(grid, {stopLat: tt.stopLat, stopLon: tt.stopLon, arrival: result.arrival, departure: query.offset})
    : null;
  if (!result || !values || reachedCells(values) === 0) return {kind: 'nostop', tt};
  return {kind: 'ok', search: {tt, result, offset: query.offset, values}};
}

function setPick(next: 'first' | 'second'): void {
  pick = next;
  for (const r of pickRadios) r.checked = r.value === next;
}

/** Runs the search from the origin for the chosen day and time, and from the second situation when comparing; the previous result stays until it is done. */
async function reach(): Promise<void> {
  if (!origin || !manifest) return;
  const mine = ++latest;
  const first = await search(origin, dayType, clock, mine);
  if (first.kind === 'stale') return;
  if (first.kind === 'failed') {
    dayType = loadedDayType;
    for (const r of dayRadios) r.checked = r.value === dayType;
    status.textContent = `The ${first.day} timetable could not be loaded. The previous result is still shown.`;
    status.dataset.state = 'failed';
    return;
  }
  if (first.kind === 'nostop') {
    origin = null;
    origin2 = null;
    comparing = false;
    current = null;
    clearHover();
    stops = stopsGeoJson(first.tt);
    field.set(null);
    outlines.set(null);
    outlines2.set(null);
    status.textContent = 'No stop is within walking range of that point. Click closer to a stop.';
    status.dataset.state = 'empty';
    redraw();
    return;
  }
  loadedDayType = dayType;
  const a = first.search;

  const secondFrom = mode === 'places' ? origin2 : mode === 'times' && chosen2 ? origin : null;
  let b: Search | null = null;
  if (secondFrom) {
    const second = await search(secondFrom, mode === 'times' ? dayType2 : dayType, mode === 'times' ? clock2 : clock, mine);
    if (second.kind === 'stale') return;
    if (second.kind === 'failed') {
      dayType2 = loadedDayType2;
      for (const r of day2Radios) r.checked = r.value === dayType2;
      status.textContent = `The ${second.day} timetable could not be loaded. The first result is still shown.`;
      status.dataset.state = 'failed';
    } else if (second.kind === 'nostop') {
      origin2 = null;
      status.textContent = 'No stop is within walking range of the second point. Click closer to a stop.';
      status.dataset.state = 'empty';
    } else {
      b = second.search;
      loadedDayType2 = dayType2;
    }
  }

  current = null;
  clearHover();
  comparing = b !== null;
  stops = stopsGeoJson(a.tt, bandsOf(a.result.arrival, a.offset));
  outlines.set(a.values);
  if (b) {
    const diff = diffFields(a.values, b.values);
    field.setDiff(diff);
    outlines2.set(b.values);
    status.textContent = isFlat(diff) ? 'There is no difference between the two.' : readout(a.values, b.values, 30);
    status.dataset.state = isFlat(diff) ? 'same' : 'compare';
  } else {
    field.set(a.values);
    outlines2.set(null);
    current = {tt: a.tt, result: a.result, offset: a.offset, origin};
    if (mode === 'single') {
      const n = reachableWithin(a.result.arrival, a.offset, 30);
      status.textContent = `${n} ${n === 1 ? 'stop' : 'stops'} within 30 minutes, leaving ${clockLabel(clock)} on ${DAY_NAMES[dayType]}.`;
      status.dataset.state = 'reach';
    } else if (status.dataset.state !== 'failed' && status.dataset.state !== 'empty') {
      status.textContent = mode === 'places' ? 'Now click a second point to compare it with the first.' : 'Choose a second day and time to compare with the first.';
      status.dataset.state = 'hint';
    }
    if (mode === 'places' && !origin2 && pick === 'first') setPick('second');
  }
  redraw();
}

function redraw(): void {
  field.render(theme);
  outlines.render(theme);
  outlines2.render(theme);
  drawStops();
  showLegend();
}

const journeyPanel = document.getElementById('journey') as HTMLElement;

function clearHover(): void {
  journeyPanel.hidden = true;
  journeyPanel.replaceChildren();
  journeyLayer.set(null);
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function showHover(lng: number, lat: number): void {
  if (!current || !manifest || !loaded) return clearHover();
  const {tt, result, offset, origin: from} = current;
  const hover = hoverJourney(tt, result, {lat: from[1], lon: from[0]}, offset, lat, lng);
  if (!hover) return clearHover();
  const lines = manifest.lines;
  const lineOf = (route: number) => lines[tt.routeLine[route] as number] ?? {label: '?', mode: 'bus' as const};
  const d = describe(hover.input, {stopName: (s) => manifest?.stops[s]?.name ?? 'stop', ride: lineOf});
  const colours = modeColours(theme);
  const total = document.createElement('p');
  total.className = 'total';
  total.textContent = `${d.totalMinutes} min, ${d.changes === 0 ? 'no changes' : plural(d.changes, 'change')}, ${d.walkMinutes} min walking`;
  const list = document.createElement('ul');
  for (const ride of d.rides) {
    const item = document.createElement('li');
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.style.background = colours[ride.mode];
    chip.textContent = ride.label;
    item.append(chip, `${ride.mode}: ${ride.from} to ${ride.to}`);
    list.append(item);
  }
  journeyPanel.replaceChildren(total, list);
  journeyPanel.hidden = false;
  journeyLayer.set(
    pathGeoJson({
      legs: hover.legs,
      origin: from,
      point: [lng, lat],
      stop: hover.stop,
      stopLat: tt.stopLat,
      stopLon: tt.stopLon,
      modeOf: (route) => lineOf(route).mode,
    }),
  );
}

map.on('mousemove', (e) => showHover(e.lngLat.lng, e.lngLat.lat));
map.on('mouseout', clearHover);
// On touch the finger both presses and drags: follow it while it is down.
map.on('touchstart', (e) => showHover(e.lngLat.lng, e.lngLat.lat));
map.on('touchmove', (e) => showHover(e.lngLat.lng, e.lngLat.lat));
map.on('touchend', clearHover);

map.on('click', (e) => {
  if (!loaded) return;
  const at: [number, number] = [e.lngLat.lng, e.lngLat.lat];
  if (mode === 'places' && origin && pick === 'second') origin2 = at;
  else origin = at;
  void reach();
});

function showClock2(): void {
  const text = clockLabel(clock2);
  timeLabel2.textContent = text;
  slider2.setAttribute('aria-valuetext', text);
}

const idleText = (): string =>
  mode === 'places'
    ? 'Click the map to set the first point, then click a second point to compare.'
    : mode === 'times'
      ? 'Click the map to choose the point, then choose a second day and time.'
      : 'Click the map to see where public transport takes you from there, leaving 08:00 on a weekday.';

/** Switching mode starts the comparison over: the second situation begins unset, the first stays. */
function setMode(next: Mode): void {
  mode = next;
  origin2 = null;
  chosen2 = false;
  dayType2 = dayType;
  clock2 = clock;
  for (const r of day2Radios) r.checked = r.value === dayType2;
  slider2.value = String(clock2 / 60);
  showClock2();
  pickRow.hidden = next !== 'places';
  when2.hidden = next !== 'times';
  whenLegend.textContent = next === 'times' ? 'First time' : next === 'places' ? 'Leave (both points)' : 'Leave';
  setPick('first');
  if (origin) {
    status.dataset.state = 'computing';
    void reach();
  } else {
    status.textContent = idleText();
    status.dataset.state = 'ready';
  }
}

for (const radio of modeRadios) radio.addEventListener('change', () => setMode(radio.value as Mode));
for (const radio of pickRadios) radio.addEventListener('change', () => setPick(radio.value as 'first' | 'second'));
for (const radio of day2Radios) {
  radio.addEventListener('change', () => {
    dayType2 = radio.value as DayType;
    chosen2 = true;
    void reach();
  });
}
slider2.addEventListener('input', () => {
  clock2 = Number(slider2.value) * 60;
  chosen2 = true;
  showClock2();
  void reach();
});

for (const radio of dayRadios) {
  radio.addEventListener('change', () => {
    dayType = radio.value as DayType;
    void reach();
  });
}
slider.addEventListener('input', () => {
  clock = Number(slider.value) * 60;
  showClock();
  void reach();
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
  clearHover();
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
