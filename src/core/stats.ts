import { DEMON_BY_ID } from '../content/demons';
import { PACT_BY_ID } from '../content/pacts';
import type { DemonDef, RunState, Stats } from './types';

export const BASE_STATS: Stats = {
  tempo: 12,
  friction: 3,
  frictionGrowth: 0.08,
  lapGlut: 5,
  baseFluch: 1,
  spins: 4,
  ghostCap: 6,
  startGhosts: 0,
  luck: 1,
  arcanaSlots: 5,
  shopArcana: 2,
  interestCap: 5,
  rerollDiscount: 0,
  colorPay: 2,
  parityPay: 2,
  halfPay: 2,
  dozenPay: 3,
  numberPay: 18,
  hellFluch: 1,
  endFluch: 1,
  ritualBonus: 0,
  sellFull: false,
  upgradeDiscount: 0,
};

export function currentDemon(run: RunState): DemonDef | null {
  return run.demon ? DEMON_BY_ID[run.demon] ?? null : null;
}

export function computeStats(run: RunState, withDemon = true): Stats {
  const s: Stats = { ...BASE_STATS };
  s.lapGlut += run.meta.lapGlut;
  for (const p of run.pacts) PACT_BY_ID[p.id]?.mod?.(s, p.stacks);
  const d = withDemon ? currentDemon(run) : null;
  if (d) {
    s.friction += d.mods.frictionAdd ?? 0;
    s.spins += d.mods.spinsAdd ?? 0;
  }
  s.spins = Math.max(1, s.spins);
  s.arcanaSlots = Math.max(1, s.arcanaSlots);
  return s;
}
