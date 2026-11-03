import {splitCsvLine, stripBom, type Table} from '../core/csv';

/** Splits a byte stream into lines without holding more than one chunk and a partial line. */
export async function* streamLines(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let rest = '';
  const reader = stream.getReader();
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    rest += decoder.decode(chunk.value, {stream: true});
    const parts = rest.split('\n');
    rest = parts.pop() ?? '';
    for (const p of parts) yield p.endsWith('\r') ? p.slice(0, -1) : p;
  }
  rest += decoder.decode();
  if (rest) yield rest.endsWith('\r') ? rest.slice(0, -1) : rest;
}

/** A table whose rows are read from the stream as they are consumed. Rows can be read once. */
export async function tableFromStream(stream: ReadableStream<Uint8Array>): Promise<Table> {
  const lines = streamLines(stream);
  let first = await lines.next();
  while (!first.done && first.value === '') first = await lines.next();
  const header = first.done ? [] : splitCsvLine(stripBom(first.value));
  async function* rows(): AsyncGenerator<string[]> {
    for await (const line of lines) if (line !== '') yield splitCsvLine(line);
  }
  return {header, rows: rows()};
}
