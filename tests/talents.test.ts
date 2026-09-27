import { describe, expect, it } from 'vitest';
import { ARCANA_BY_ID } from '../src/content/arcana';
import { BRANCHES, TALENTS, talentAvailable, talentBonuses, TALENT_TOTAL_COST } from '../src/content/talents';
import { Rng } from '../src/core/rng';
import { newRun } from '../src/core/run';
import { DEFAULT_META_STATE, refundLegacyUpgrades } from '../src/core/save';
import { simulateSpin } from '../src/core/spin';
import { computeStats } from '../src/core/stats';

describe('Grimoire-Talentbaum', () => {
  it('hat drei Äste mit je 8 Knoten und eindeutigen IDs', () => {
    for (const b of BRANCHES) {
      const tiers = TALENTS.filter((t) => t.branch === b.id).map((t) => t.tier).sort((a, c) => a - c);
      expect(tiers).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    }
    expect(new Set(TALENTS.map((t) => t.id)).size).toBe(TALENTS.length);
    expect(TALENT_TOTAL_COST).toBeGreaterThan(1500);
  });

  it('Knoten brauchen ihren Vorgänger', () => {
    const [a1, a2] = TALENTS.filter((t) => t.branch === 'flamme').sort((a, b) => a.tier - b.tier);
    expect(talentAvailable([], a1)).toBe(true);
    expect(talentAvailable([], a2)).toBe(false);
    expect(talentAvailable([a1.id], a2)).toBe(true);
    expect(talentAvailable([a1.id], a1)).toBe(false);
  });

  it('Boni wirken auf die Werte eines Runs', () => {
    const all = TALENTS.map((t) => t.id);
    const base = computeStats(newRun(1));
    const buffed = computeStats(newRun(1, talentBonuses(all)));
    expect(buffed.lapGlut).toBe(base.lapGlut + 5);
    expect(buffed.baseFluch).toBe(base.baseFluch + 3);
    expect(buffed.potionSlots).toBe(base.potionSlots + 1);
    expect(buffed.ghostCap).toBe(base.ghostCap + 2);
    expect(buffed.friction).toBeLessThan(base.friction);
    expect(newRun(1, talentBonuses(all)).sigilUnlocked).toBe(5);
    expect(newRun(1, talentBonuses(all)).souls).toBe(7);
  });

  it('Reliquie gibt eine seltene Arkana aus dem Pool', () => {
    const run = newRun(3, talentBonuses(['reliquie']));
    expect(run.arcana.length).toBe(1);
    expect(ARCANA_BY_ID[run.arcana[0].id].rarity).toBe('rare');
  });

  it('Erstschlag verstärkt nur die erste Drehung', () => {
    const plain = newRun(4);
    const boosted = newRun(4, talentBonuses(['erstschlag']));
    const a = simulateSpin(plain, { kind: 'red' }, new Rng(9), { quiet: true });
    const b = simulateSpin(boosted, { kind: 'red' }, new Rng(9), { quiet: true });
    expect(b.fluch.toNumber()).toBeCloseTo(a.fluch.toNumber() * 1.5);
    boosted.spinsLeft = 2;
    const c = simulateSpin(boosted, { kind: 'red' }, new Rng(9), { quiet: true });
    expect(c.fluch.toNumber()).toBeCloseTo(a.fluch.toNumber());
  });

  it('alte Segnungen werden als Asche erstattet', () => {
    const meta = structuredClone(DEFAULT_META_STATE);
    meta.upgrades = { startSouls: 5, lapGlut: 5, startSlots: 2, freeReroll: 1, extraArcanaOffer: 1 };
    const refund = refundLegacyUpgrades(meta);
    expect(refund).toBe(60 + 80 + 45 + 20 + 30);
    expect(meta.ash).toBe(refund);
    expect(meta.upgrades).toEqual({});
  });
});
