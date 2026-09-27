import Decimal, { type DecimalSource } from 'break_eternity.js';

export { Decimal };
export type Num = Decimal;

export const D = (v: DecimalSource): Decimal => new Decimal(v);

const intFmt = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const decFmt = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

/** Formatiert beliebig große Zahlen: 12.345 · 1,23e45 · e1,2e308 · ∞ */
export function fmt(v: Decimal | number, decimals = false): string {
  const d = v instanceof Decimal ? v : new Decimal(v);
  if (d.isNan()) return '?';
  if (!d.isFinite()) return '∞';
  if (d.sign < 0) return '-' + fmt(d.neg(), decimals);
  if (d.lt(1e6)) {
    const n = d.toNumber();
    return decimals && n < 100 && n % 1 !== 0 ? decFmt.format(n) : intFmt.format(Math.floor(n));
  }
  if (d.layer <= 1 && d.lt('1e1000000')) {
    const e = Math.floor(d.log10().toNumber());
    const m = d.div(Decimal.pow(10, e)).toNumber();
    return `${m.toFixed(2).replace('.', ',')}e${intFmt.format(e)}`;
  }
  return 'e' + fmt(d.log10());
}

/** Kompakte Anzeige für Multiplikatoren (×1,5) */
export function fmtMult(v: number): string {
  return (Math.round(v * 100) / 100).toString().replace('.', ',');
}

export function toSave(d: Decimal): string {
  return d.toString();
}

export function fromSave(s: string | number | undefined, fallback: DecimalSource = 0): Decimal {
  if (s === undefined || s === null) return new Decimal(fallback);
  const d = new Decimal(s);
  return d.isNan() ? new Decimal(fallback) : d;
}
