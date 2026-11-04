// Comparing two travel-time fields cell by cell. "First" and "second" are the two situations
// the traveller compares; a negative delta means the second is quicker.

export const NEITHER = 0;
export const BOTH = 1;
export const ONLY_FIRST = 2;
export const ONLY_SECOND = 3;

export type CellKind = typeof NEITHER | typeof BOTH | typeof ONLY_FIRST | typeof ONLY_SECOND;

export interface FieldDiff {
  /** Seconds, second minus first. NaN unless both fields reach the cell: there is no time to subtract. */
  delta: Float32Array;
  kind: Uint8Array;
}

export function diffFields(first: ArrayLike<number>, second: ArrayLike<number>): FieldDiff {
  if (first.length !== second.length) throw new Error('fields differ in size');
  const delta = new Float32Array(first.length).fill(NaN);
  const kind = new Uint8Array(first.length);
  for (let i = 0; i < first.length; i++) {
    const a = Number.isFinite(first[i] as number);
    const b = Number.isFinite(second[i] as number);
    if (a && b) {
      kind[i] = BOTH;
      delta[i] = (second[i] as number) - (first[i] as number);
    } else if (a) kind[i] = ONLY_FIRST;
    else if (b) kind[i] = ONLY_SECOND;
  }
  return {delta, kind};
}

/** How many cells are reached within the given number of minutes. */
export function cellsWithin(field: ArrayLike<number>, minutes: number): number {
  let n = 0;
  for (let i = 0; i < field.length; i++) if ((field[i] as number) / 60 <= minutes) n++;
  return n;
}

/** True when the two fields agree everywhere: no cell differs in time or in being reached. */
export function isFlat(diff: FieldDiff): boolean {
  for (let i = 0; i < diff.kind.length; i++) {
    const k = diff.kind[i];
    if (k === ONLY_FIRST || k === ONLY_SECOND) return false;
    if (k === BOTH && diff.delta[i] !== 0) return false;
  }
  return true;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** One sentence: how many more or fewer cells the second reaches within `minutes` than the first. */
export function readout(first: ArrayLike<number>, second: ArrayLike<number>, minutes: number): string {
  const a = cellsWithin(first, minutes);
  const b = cellsWithin(second, minutes);
  if (a === b) return `Both reach the same number of cells within ${minutes} minutes.`;
  const more = b > a;
  return `The second reaches ${plural(Math.abs(b - a), 'cell')} ${more ? 'more' : 'fewer'} than the first within ${minutes} minutes.`;
}
