import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {expect, test} from 'bun:test';
import {records} from '../core/csv';
import {directorySource, isZip, zipSource} from './feed-source';

const streamOf = (text: string): ReadableStream<Uint8Array> => new Blob([text]).stream();

test('a directory source reads files by name through the injected reader', async () => {
  const asked: string[] = [];
  const open = directorySource('/feed', (path) => {
    asked.push(path);
    return new Blob(['stop_id,stop_name\nA,Alpha\n']);
  });
  expect(await records(await open('stops.txt'))).toEqual([{stop_id: 'A', stop_name: 'Alpha'}]);
  expect(asked).toEqual(['/feed/stops.txt']);
});

test('a zip source streams one member with unzip -p', async () => {
  const ran: string[][] = [];
  const open = zipSource('/data/hsl.zip', (cmd) => {
    ran.push(cmd);
    return streamOf('a\n1\n');
  });
  expect(await records(await open('trips.txt'))).toEqual([{a: '1'}]);
  expect(ran).toEqual([['unzip', '-p', '/data/hsl.zip', 'trips.txt']]);
});

test('zip paths are recognised by extension', () => {
  expect(isZip('hsl.zip')).toBe(true);
  expect(isZip('HSL.ZIP')).toBe(true);
  expect(isZip('/tmp/feed')).toBe(false);
});

test('a directory source reads real files by default', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'feed-'));
  try {
    writeFileSync(join(dir, 'routes.txt'), 'route_id\nL1\n');
    expect(await records(await directorySource(dir)('routes.txt'))).toEqual([{route_id: 'L1'}]);
  } finally {
    rmSync(dir, {recursive: true});
  }
});
