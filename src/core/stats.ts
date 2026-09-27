import { ARCANA_BY_ID } from '../content/arcana';
import { demonById } from '../content/demons';
import { OMEN_BY_ID } from '../content/omens';
import { PACT_BY_ID } from '../content/pacts';
import { applyBonds } from '../content/elements';
import { heroOf } from '../content/heroes';
import { applyStake } from '../content/stakes';
import { fullMeta } from '../content/talents';
import type { DemonDef, RunState, Stats } from './types';
import { wheelOf } from './wheel';

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
  endGlut: 1,
  ritualBonus: 0,
  sellFull: false,
  upgradeDiscount: 0,
  potionSlots: 2,
  potionDiscount: 0,
  editionChance: 0.08,
  demonBonus: 0,
  shopSigils: 2,
  freeRerolls: 0,
  priceAdd: 0,
  targetMult: 1,
  interestMax: 99,
  rewardAdd: 0,
};

export function currentDemon(run: RunState): DemonDef | null {
  return demonById(run.demon);
}

export function computeStats(run: RunState, withDemon = true): Stats {
  const s: Stats = { ...BASE_STATS };
  const m = fullMeta(run.meta);
  s.lapGlut += m.lapGlut;
  s.freeRerolls += m.freeReroll;
  s.shopArcana += m.extraArcanaOffer;
  s.baseFluch += m.baseFluch;
  s.endFluch *= m.endFluch;
  s.rewardAdd += m.rewardAdd;
  s.interestCap += m.interestCap;
  s.potionSlots += m.potionSlots;
  s.priceAdd += m.priceAdd;
  s.tempo += m.tempo;
  s.friction *= m.friction;
  s.frictionGrowth *= m.frictionGrowth;
  s.ghostCap += m.ghostCap;
  s.startGhosts += m.startGhosts;
  s.luck *= m.luck;
  heroOf(run).mod?.(s);
  const bo = run.boons;
  if (bo) {
    s.baseFluch += bo.baseFluch ?? 0;
    s.lapGlut += bo.lapGlut ?? 0;
    s.ghostCap += bo.ghostCap ?? 0;
    s.luck *= bo.luck ?? 1;
  }
  wheelOf(run).mod?.(s);
  applyStake(s, run.stake ?? 1);
  for (const id of run.omens ?? []) OMEN_BY_ID[id]?.mod?.(s);
  for (const p of run.pacts) PACT_BY_ID[p.id]?.mod?.(s, p.stacks);
  for (const a of run.arcana) {
    ARCANA_BY_ID[a.id]?.mod?.(s, a);
    if (a.edition === 'negativ') s.arcanaSlots += 1;
  }
  applyBonds(s, run);
  const d = withDemon ? currentDemon(run) : null;
  if (d) {
    s.friction += d.mods.frictionAdd ?? 0;
    s.spins += d.mods.spinsAdd ?? 0;
    s.targetMult *= d.mods.targetMult ?? 1;
  }
  s.interestCap = Math.min(s.interestCap, s.interestMax);
  s.spins = Math.max(1, s.spins);
  s.arcanaSlots = Math.max(1, s.arcanaSlots);
  s.friction = Math.max(0.6, s.friction);
  s.potionSlots = Math.max(0, s.potionSlots);
  return s;
}
