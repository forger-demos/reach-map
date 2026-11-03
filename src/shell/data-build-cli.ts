// Entry point for `bun run data:build`. Logic lives in data-build.ts so tests can reach it.
import {mkdir} from 'node:fs/promises';
import {buildSnapshot, parseArgs} from './data-build';
import {directorySource, isZip, zipSource} from './feed-source';

const outDir = new URL('../../public/data', import.meta.url).pathname;
const args = parseArgs(process.argv.slice(2));
const open = isZip(args.input)
  ? zipSource(args.input, (cmd) => Bun.spawn(cmd, {stdout: 'pipe', stderr: 'inherit'}).stdout as ReadableStream<Uint8Array>)
  : directorySource(args.input);

await mkdir(outDir, {recursive: true});
const {reports} = await buildSnapshot(open, args.dates, outDir, async (path, data) => {
  await Bun.write(path, data);
});
for (const r of reports) console.log(JSON.stringify(r));
