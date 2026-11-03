import type {OpenFeed} from '../core/feed';
import {tableFromStream} from './csv-stream';

/** Streams the stdout of a command. The default implementation spawns a process; tests pass a fake. */
export type CommandStream = (command: string[]) => ReadableStream<Uint8Array>;

/** Opens the files of an unzipped feed directory. */
export function directorySource(dir: string, file: (path: string) => Blob = (p) => Bun.file(p)): OpenFeed {
  return (name) => tableFromStream(file(`${dir}/${name}`).stream());
}

/** Opens files straight from the zip with `unzip -p`, so the unzipped feed never lands on disk. */
export function zipSource(zipPath: string, run: CommandStream): OpenFeed {
  return (name) => tableFromStream(run(['unzip', '-p', zipPath, name]));
}

export function isZip(path: string): boolean {
  return path.toLowerCase().endsWith('.zip');
}
