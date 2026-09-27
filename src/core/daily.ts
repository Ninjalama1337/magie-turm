import { MAX_STAKE } from '../content/stakes';
import { OMENS } from '../content/omens';
import { Rng } from './rng';
import type { RunMode } from './types';
import { WHEELS } from './wheel';

export interface ChallengeSpec {
  mode: Exclude<RunMode, 'normal'>;
  key: string;
  seed: number;
  wheel: string;
  stake: number;
  omens: string[];
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** ISO-Woche, z. B. „2026-W39“ */
export function weekKey(d = new Date()): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function challengeFor(mode: 'daily' | 'weekly', d = new Date()): ChallengeSpec {
  const key = mode === 'daily' ? dayKey(d) : weekKey(d);
  const seed = hash(`teufelsrad:${mode}:${key}`);
  const rng = new Rng(seed);
  const wheel = rng.pick(WHEELS).id;
  const stake = mode === 'daily' ? rng.range(1, 3) : rng.range(2, MAX_STAKE);
  const pool = [...OMENS];
  rng.shuffle(pool);
  const omens = pool.slice(0, mode === 'daily' ? 2 : 3).map((o) => o.id);
  return { mode, key, seed, wheel, stake, omens };
}

/** Millisekunden bis zum nächsten UTC-Tageswechsel */
export function msUntilReset(d = new Date()): number {
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  return next - d.getTime();
}
