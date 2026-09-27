/** Europäischer Kessel: Reihenfolge der Fächer im Uhrzeigersinn. */
export const WHEEL_ORDER: readonly number[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22,
  18, 29, 7, 28, 12, 35, 3, 26,
];

const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export type PocketColor = 'red' | 'black' | 'hell';

export function colorOf(n: number): PocketColor {
  if (n === 0) return 'hell';
  return REDS.has(n) ? 'red' : 'black';
}

export function isEven(n: number): boolean {
  return n !== 0 && n % 2 === 0;
}

export function isOdd(n: number): boolean {
  return n % 2 === 1;
}

export function dozenOf(n: number): 0 | 1 | 2 | 3 {
  if (n === 0) return 0;
  return (Math.ceil(n / 12) as 1 | 2 | 3);
}

/** Position eines Fachs im Kessel */
export function wheelIndex(n: number): number {
  return WHEEL_ORDER.indexOf(n);
}

/** Nachbarn im Kessel (Abstand ≤ range) */
export function neighbours(n: number, range: number): number[] {
  const i = wheelIndex(n);
  const out: number[] = [];
  const len = WHEEL_ORDER.length;
  for (let d = -range; d <= range; d++) {
    if (d === 0) continue;
    out.push(WHEEL_ORDER[(i + d + len) % len]);
  }
  return out;
}

export function wheelDistance(a: number, b: number): number {
  const len = WHEEL_ORDER.length;
  const d = Math.abs(wheelIndex(a) - wheelIndex(b));
  return Math.min(d, len - d);
}

export const POCKET_COUNT = WHEEL_ORDER.length;
