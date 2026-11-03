/** A GTFS file: its column names and its rows, each row a list of cells in column order. */
export interface Table {
  header: string[];
  rows: AsyncIterable<string[]>;
}

export type Row = Record<string, string>;

const BOM = String.fromCharCode(0xfeff);

export function stripBom(text: string): string {
  return text.startsWith(BOM) ? text.slice(1) : text;
}

/** Splits one CSV line. Double quotes group commas; escaped quotes inside a field are not supported. */
export function splitCsvLine(line: string): string[] {
  if (!line.includes('"')) return line.split(',');
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === ',' && !quoted) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

async function* rowsOf(lines: string[], from: number): AsyncGenerator<string[]> {
  for (let i = from; i < lines.length; i++) yield splitCsvLine(lines[i] as string);
}

/** Builds a table from CSV text; used for small files and for test fixtures. */
export function tableFromText(text: string): Table {
  const lines = stripBom(text)
    .split('\n')
    .map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l))
    .filter((l) => l !== '');
  return {header: splitCsvLine(lines[0] ?? ''), rows: rowsOf(lines, 1)};
}

/** Reads a whole table into records keyed by column name. Only for files that fit in memory. */
export async function records(table: Table): Promise<Row[]> {
  const out: Row[] = [];
  for await (const cells of table.rows) {
    const row: Row = {};
    table.header.forEach((name, i) => {
      row[name] = cells[i] ?? '';
    });
    out.push(row);
  }
  return out;
}
