import {expect, test} from 'bun:test';
import {records, splitCsvLine, stripBom, tableFromText} from './csv';

test('quoted commas stay in one cell', () => {
  expect(splitCsvLine('a,"b,c",d')).toEqual(['a', 'b,c', 'd']);
  expect(splitCsvLine('a,b')).toEqual(['a', 'b']);
});

test('a byte order mark is stripped from the header', () => {
  expect(stripBom('\uFEFFtrip_id')).toBe('trip_id');
  expect(tableFromText('\uFEFFa,b\n1,2\n').header).toEqual(['a', 'b']);
});

test('records key cells by column, tolerate CRLF and blank lines, and fill short rows', async () => {
  const rows = await records(tableFromText('a,b,c\r\n1,2,3\r\n\r\n4,5\r\n'));
  expect(rows).toEqual([
    {a: '1', b: '2', c: '3'},
    {a: '4', b: '5', c: ''},
  ]);
});

test('empty text gives an empty header', async () => {
  const t = tableFromText('');
  expect(t.header).toEqual(['']);
  expect(await records(t)).toEqual([]);
});
