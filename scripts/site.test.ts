import {expect, test} from 'bun:test';
import {existsSync} from 'node:fs';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildSite, maplibreAssets} from './site';

test('the built site holds every file the page and the map worker load', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'reach-dist-'));
  try {
    await buildSite(new URL(`file://${dir}/`));
    const html = await readFile(join(dir, 'index.html'), 'utf8');
    const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]!);
    expect(refs).toContain('app.js');
    for (const ref of refs) expect(existsSync(join(dir, ref))).toBe(true);
    for (const name of maplibreAssets) expect(existsSync(join(dir, name))).toBe(true);
    expect(existsSync(join(dir, 'data', 'manifest.json'))).toBe(true);
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
});

test('vercel.json builds to dist with no framework', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  expect(config).toEqual({
    framework: null,
    installCommand: 'bun install --frozen-lockfile',
    buildCommand: 'bun run build',
    outputDirectory: 'dist',
  });
});
