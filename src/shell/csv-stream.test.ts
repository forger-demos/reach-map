import {expect, test} from 'bun:test';
import {records} from '../core/csv';
import {streamLines, tableFromStream} from './csv-stream';

const streamOf = (...chunks: string[]): ReadableStream<Uint8Array> => {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      for (const chunk of chunks) c.enqueue(enc.encode(chunk));
      c.close();
    },
  });
};

async function collect<T>(it: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const x of it) out.push(x);
  return out;
}

test('lines split across chunks are rejoined and CRLF is dropped', async () => {
  expect(await collect(streamLines(streamOf('ab', 'c\r\nde', 'f\n', 'g')))).toEqual(['abc', 'def', 'g']);
});

test('a final line with CRLF and no newline loses the CR', async () => {
  expect(await collect(streamLines(streamOf('a\nb\r')))).toEqual(['a', 'b']);
});

test('a multi-byte character split across chunks survives', async () => {
  const bytes = new TextEncoder().encode('K\u00e4pyl\u00e4\n');
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(bytes.slice(0, 2));
      c.enqueue(bytes.slice(2));
      c.close();
    },
  });
  expect(await collect(streamLines(stream))).toEqual(['K\u00e4pyl\u00e4']);
});

test('a table reads its header, skips blank lines and strips a byte order mark', async () => {
  const table = await tableFromStream(streamOf('\n\uFEFFa,b\n', '1,"x,y"\n\n2,3\n'));
  expect(table.header).toEqual(['a', 'b']);
  expect(await records(table)).toEqual([
    {a: '1', b: 'x,y'},
    {a: '2', b: '3'},
  ]);
});

test('an empty stream is a table with no columns and no rows', async () => {
  const table = await tableFromStream(streamOf());
  expect(table.header).toEqual([]);
  expect(await collect(table.rows)).toEqual([]);
});
