import {cp, rm} from 'node:fs/promises';

const root = new URL('../', import.meta.url);

// Files copied verbatim from maplibre-gl; the page and the worker loader fetch them by name next to app.js.
export const maplibreAssets = ['maplibre-gl.css', 'maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];

export async function buildClient(): Promise<void> {
  const out = new URL('public/', root);
  const result = await Bun.build({
    entrypoints: [new URL('src/ui/main.ts', root).pathname],
    outdir: out.pathname,
    naming: 'app.js',
    target: 'browser',
    minify: true,
  });
  if (!result.success) throw new Error(result.logs.join('\n'));
  for (const name of maplibreAssets) {
    await cp(new URL(`node_modules/maplibre-gl/dist/${name}`, root), new URL(name, out));
  }
}

// dist/ is a copy of public/ after the client build, so the dev server and the deployed site serve the same files.
export async function buildSite(outDir = new URL('dist/', root)): Promise<void> {
  await buildClient();
  await rm(outDir, {recursive: true, force: true});
  await cp(new URL('public/', root), outDir, {recursive: true});
}
