import type { GlyphId, RunState, Stats } from './types';

/** Wert −1 steht für das „00“-Fach des amerikanischen Kessels. */
export const DOUBLE_ZERO = -1;

export type PocketColor = 'red' | 'black' | 'hell';

export interface WheelDef {
  id: string;
  name: string;
  title: string;
  desc: string;
  glyph: GlyphId;
  /** Fächer im Uhrzeigersinn */
  order: readonly number[];
  reds: ReadonlySet<number>;
  /** Höchste Zahl (36 oder 12) – bestimmt Hälften und Drittel */
  maxNumber: number;
  /** Asche-Preis zum Freischalten (0 = von Beginn an) */
  ashCost: number;
  mod?: (s: Stats) => void;
  start?: (run: RunState) => void;
}

const EURO_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22,
  18, 29, 7, 28, 12, 35, 3, 26,
];
const AMERICAN_ORDER = [
  0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, DOUBLE_ZERO, 27, 10, 25, 29, 12, 8, 19, 31,
  18, 6, 21, 33, 16, 4, 23, 35, 14, 2,
];
const MINI_ORDER = [0, 9, 4, 1, 12, 6, 7, 2, 11, 5, 8, 10, 3];

const EURO_REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const MINI_REDS = new Set([1, 2, 5, 6, 9, 10]);

export const WHEELS: WheelDef[] = [
  {
    id: 'euro',
    name: 'Europäischer Kessel',
    title: 'Der klassische Kessel',
    desc: '37 Fächer, ein Höllenfach. Ausgewogen – der Weg, den alle Verdammten zuerst gehen.',
    glyph: 'wheel',
    order: EURO_ORDER,
    reds: EURO_REDS,
    maxNumber: 36,
    ashCost: 0,
  },
  {
    id: 'american',
    name: 'Amerikanischer Kessel',
    title: 'Zwei Pforten zur Hölle',
    desc: '38 Fächer mit <b>0 und 00</b>. Beide Höllenfächer lösen Höllen-Effekte aus. Start mit <b>Der Turm</b>.',
    glyph: 'horn',
    order: AMERICAN_ORDER,
    reds: EURO_REDS,
    maxNumber: 36,
    ashCost: 25,
    mod: (s) => {
      s.hellFluch *= 2;
    },
    start: (run) => {
      run.arcana.push({ uid: run.uid++, id: 'turm', level: 1, state: {} });
    },
  },
  {
    id: 'mini',
    name: 'Mini-Rad',
    title: 'Dreizehn Fächer des Wahnsinns',
    desc: 'Nur <b>0–12</b>. Die Kugel rast (−35 % Reibung), aber Einsätze zahlen weniger, und Zahlen geben wenig Glut.',
    glyph: 'dice',
    order: MINI_ORDER,
    reds: MINI_REDS,
    maxNumber: 12,
    ashCost: 35,
    mod: (s) => {
      s.friction *= 0.65;
      s.numberPay = Math.round(s.numberPay * 0.45);
      s.lapGlut += 2;
    },
  },
  {
    id: 'blut',
    name: 'Blutrad',
    title: 'Getränkt in Opferblut',
    desc: 'Startet mit <b>6 Blutfächern</b> und dem <b>Blutpakt</b>, aber <b class="bad">−1 Arkana-Platz</b>.',
    glyph: 'drop',
    order: EURO_ORDER,
    reds: EURO_REDS,
    maxNumber: 36,
    ashCost: 45,
    mod: (s) => {
      s.arcanaSlots -= 1;
    },
    start: (run) => {
      for (const n of [32, 19, 21, 25, 34, 27]) run.enchants[n] = 'blood';
      run.pacts.push({ id: 'blut', stacks: 1 });
    },
  },
  {
    id: 'knochen',
    name: 'Knochenrad',
    title: 'Aus den Gebeinen der Gefallenen',
    desc: 'Alle <b>8 Rauten</b> sind frei, doch die Kugel ist schwer (<b class="bad">−25 % Tempo</b>). Start mit zwei Siegeln.',
    glyph: 'skull',
    order: EURO_ORDER,
    reds: EURO_REDS,
    maxNumber: 36,
    ashCost: 60,
    mod: (s) => {
      s.tempo *= 0.75;
    },
    start: (run) => {
      run.sigilUnlocked = 8;
      run.sigils[1] = { uid: run.uid++, id: 'wuerfel', level: 1 };
    },
  },
  {
    id: 'stern',
    name: 'Sternenrad',
    title: 'Vom Himmel gestürzt',
    desc: 'Alle <b>Wahrscheinlichkeiten ×2</b> und Start mit <b>Rad des Schicksals</b>, aber nur <b class="bad">3 Drehungen</b>.',
    glyph: 'star',
    order: EURO_ORDER,
    reds: EURO_REDS,
    maxNumber: 36,
    ashCost: 80,
    mod: (s) => {
      s.luck *= 2;
      s.spins -= 1;
    },
    start: (run) => {
      run.arcana.push({ uid: run.uid++, id: 'rad', level: 1, state: {} });
    },
  },
];

export const WHEEL_BY_ID: Record<string, WheelDef> = Object.fromEntries(WHEELS.map((w) => [w.id, w]));
export const EURO = WHEELS[0];

export function wheelOf(run: { wheel?: string }): WheelDef {
  return WHEEL_BY_ID[run.wheel ?? 'euro'] ?? EURO;
}

/** Rückwärtskompatibel: Reihenfolge des europäischen Kessels */
export const WHEEL_ORDER: readonly number[] = EURO_ORDER;
export const POCKET_COUNT = EURO_ORDER.length;

export function isHell(n: number): boolean {
  return n === 0 || n === DOUBLE_ZERO;
}

export function colorOf(n: number, w: WheelDef = EURO): PocketColor {
  if (isHell(n)) return 'hell';
  return w.reds.has(n) ? 'red' : 'black';
}

export function pocketLabel(n: number): string {
  return n === DOUBLE_ZERO ? '00' : String(n);
}

/** Glut-Wert eines Fachs */
export function pocketValue(n: number): number {
  return Math.max(0, n);
}

export function isEven(n: number): boolean {
  return n > 0 && n % 2 === 0;
}

export function isOdd(n: number): boolean {
  return n > 0 && n % 2 === 1;
}

/** Drittel (1–3) bzw. Dutzend beim großen Kessel */
export function dozenOf(n: number, w: WheelDef = EURO): 0 | 1 | 2 | 3 {
  if (n <= 0) return 0;
  return Math.ceil(n / (w.maxNumber / 3)) as 1 | 2 | 3;
}

export function isLow(n: number, w: WheelDef = EURO): boolean {
  return n >= 1 && n <= w.maxNumber / 2;
}

export function isHigh(n: number, w: WheelDef = EURO): boolean {
  return n > w.maxNumber / 2;
}

export function wheelIndex(n: number, w: WheelDef = EURO): number {
  return w.order.indexOf(n);
}

export function neighbours(n: number, range: number, w: WheelDef = EURO): number[] {
  const i = wheelIndex(n, w);
  const out: number[] = [];
  const len = w.order.length;
  if (i < 0) return out;
  for (let d = -range; d <= range; d++) {
    if (d === 0) continue;
    out.push(w.order[(i + d + len) % len]);
  }
  return out;
}

/** Alle Zahlen eines Kessels in Tischreihenfolge (für Zahlen-Auswahl) */
export function tableNumbers(w: WheelDef): number[] {
  return [...w.order].filter((n) => n > 0).sort((a, b) => a - b);
}

export function betRangeLabels(w: WheelDef): { low: string; high: string; d1: string; d2: string; d3: string } {
  const m = w.maxNumber;
  const t = m / 3;
  return {
    low: `1–${m / 2}`,
    high: `${m / 2 + 1}–${m}`,
    d1: `1–${t}`,
    d2: `${t + 1}–${2 * t}`,
    d3: `${2 * t + 1}–${m}`,
  };
}
