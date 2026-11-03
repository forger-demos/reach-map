import {cp} from 'node:fs/promises';

const out = new URL('../public/', import.meta.url);
const result = await Bun.build({
  entrypoints: [new URL('../src/ui/main.ts', import.meta.url).pathname],
  outdir: out.pathname,
  naming: 'app.js',
  target: 'browser',
  minify: true,
});
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
await cp(new URL('../node_modules/maplibre-gl/dist/maplibre-gl.css', import.meta.url), new URL('maplibre-gl.css', out));
for (const name of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  await cp(new URL(`../node_modules/maplibre-gl/dist/${name}`, import.meta.url), new URL(name, out));
}
