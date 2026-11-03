import {expect, test} from 'bun:test';
import {creditOf, formatDate} from './credit';
import {LICENSE, type Manifest, modeOf, validateManifest} from './manifest';

const manifest: Manifest = {
  publisher: {name: 'Test Transit', url: 'http://example.test/'},
  license: LICENSE,
  feedVersion: '2026-11-01 04:00:00',
  feedStartDate: '20261102',
  feedEndDate: '20261108',
  dates: {weekday: '20261104', saturday: '20261107', sunday: '20261108'},
  files: {weekday: 'w.bin', saturday: 's.bin', sunday: 'u.bin'},
  stops: [{name: 'Alpha', lat: 60.17, lon: 24.94}],
  lines: [{label: '1', mode: 'bus'}],
};

test('a complete manifest passes and is returned as is', () => {
  expect(validateManifest(manifest)).toBe(manifest);
});

test('each required field is checked by name', () => {
  const without = (patch: Record<string, unknown>) => ({...manifest, ...patch});
  expect(() => validateManifest(null)).toThrow('manifest is missing');
  expect(() => validateManifest(without({publisher: {name: '', url: 'x'}}))).toThrow('publisher');
  expect(() => validateManifest(without({license: undefined}))).toThrow('license');
  expect(() => validateManifest(without({feedVersion: ''}))).toThrow('feedVersion');
  expect(() => validateManifest(without({feedEndDate: ''}))).toThrow('feed dates');
  expect(() => validateManifest(without({dates: {...manifest.dates, saturday: 'soon'}}))).toThrow('dates.saturday');
  expect(() => validateManifest(without({files: {...manifest.files, sunday: ''}}))).toThrow('files.sunday');
  expect(() => validateManifest(without({stops: []}))).toThrow('stops');
  expect(() => validateManifest(without({lines: 'none'}))).toThrow('lines');
});

test('route types fold into modes', () => {
  expect(modeOf('0')).toBe('tram');
  expect(modeOf('900')).toBe('tram');
  expect(modeOf('1')).toBe('metro');
  expect(modeOf('401')).toBe('metro');
  expect(modeOf('2')).toBe('rail');
  expect(modeOf('109')).toBe('rail');
  expect(modeOf('4')).toBe('ferry');
  expect(modeOf('1000')).toBe('ferry');
  expect(modeOf('3')).toBe('bus');
  expect(modeOf('702')).toBe('bus');
  expect(modeOf('')).toBe('bus');
});

test('the credit names the publisher, licence, feed version and service date', () => {
  expect(creditOf(manifest)).toEqual({
    publisher: 'Test Transit',
    publisherUrl: 'http://example.test/',
    year: '2026',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    feedVersion: '2026-11-01 04:00:00',
    serviceDate: 'Wed 4 Nov 2026',
  });
  expect(formatDate('20261108')).toBe('Sun 8 Nov 2026');
});
