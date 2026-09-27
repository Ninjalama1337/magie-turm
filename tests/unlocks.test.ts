import { describe, expect, it } from 'vitest';
import Decimal from 'break_eternity.js';
import { ARCANA } from '../src/content/arcana';
import { PACTS } from '../src/content/pacts';
import { POTIONS } from '../src/content/potions';
import { SIGILS } from '../src/content/sigils';
import { ALL_REFS, checkDiscoveries, LEVELS, levelFor, STARTER, xpForLevel, xpForRun } from '../src/content/unlocks';
import { discover, grantXp } from '../src/core/progress';
import { Rng } from '../src/core/rng';
import { finishRitual, newRun, spin } from '../src/core/run';
import { generateShop, inPool } from '../src/core/shop';

describe('Freischaltungen', () => {
  it('jedes Element ist genau einmal zugeordnet', () => {
    const all = ALL_REFS();
    expect(new Set(all).size).toBe(all.length);
    const expected = [
      ...ARCANA.map((a) => `arcana:${a.id}`),
      ...SIGILS.map((s) => `sigil:${s.id}`),
      ...PACTS.map((p) => `pact:${p.id}`),
      ...POTIONS.map((p) => `potion:${p.id}`),
    ].sort();
    expect([...all].sort()).toEqual(expected);
  });

  it('Stufen steigen monoton und alle sind erreichbar', () => {
    expect(levelFor(0)).toBe(0);
    expect(levelFor(xpForLevel(1))).toBe(1);
    expect(levelFor(1e9)).toBe(LEVELS.length);
    for (let l = 1; l < LEVELS.length; l++) expect(xpForLevel(l + 1)).toBeGreaterThan(xpForLevel(l));
  });

  it('auch eine frühe Niederlage bringt Erkenntnis', () => {
    const run = newRun(1);
    expect(xpForRun(run, false)).toBeGreaterThanOrEqual(10);
  });

  it('grantXp schaltet ganze Stufen frei', () => {
    const ins = { xp: 0, unlocked: [...STARTER] };
    const res = grantXp(ins, xpForLevel(2));
    expect(res.levelAfter).toBe(2);
    expect(res.items).toEqual([...LEVELS[0].items, ...LEVELS[1].items]);
    expect(ins.unlocked.length).toBe(STARTER.length + res.items.length);
    expect(grantXp(ins, 1).items.length).toBe(0);
  });

  it('der Basar bietet nur freigeschaltete Elemente an', () => {
    const run = newRun(5, undefined, { pool: STARTER });
    run.target = new Decimal(1);
    spin(run, { kind: 'red' }, true);
    finishRitual(run);
    for (let i = 0; i < 40; i++) {
      run.shop = generateShop(run, new Rng(i));
      for (const o of run.shop.offers) {
        if (o.kind === 'enchant') continue;
        const kind = o.kind === 'arcana' ? 'arcana' : o.kind === 'sigil' ? 'sigil' : o.kind === 'pact' ? 'pact' : 'potion';
        expect(inPool(run, kind, o.id)).toBe(true);
        expect(STARTER).toContain(`${kind}:${o.id}`);
      }
    }
  });

  it('ohne Pool ist alles verfügbar (Herausforderungen, alte Spielstände)', () => {
    const run = newRun(5);
    expect(inPool(run, 'arcana', 'welt')).toBe(true);
  });

  it('Entdeckungen werden erkannt und nur einmal vergeben', () => {
    const run = newRun(1, undefined, { pool: STARTER });
    const res = spin(run, { kind: 'red' }, true).result;
    const fake = { ...res, mainLaps: 25, ghosts: 6, pocket: 0 };
    const ins = { xp: 0, unlocked: [...STARTER] };
    const found = discover(ins, { run, spin: fake });
    const ids = found.map((d) => d.item);
    expect(ids).toEqual(expect.arrayContaining(['arcana:teufel', 'arcana:ritter_kelche', 'arcana:turm']));
    expect(checkDiscoveries({ run, spin: fake }, new Set(ins.unlocked)).length).toBe(0);
  });

  it('Ritual-Entdeckung: mit einer Drehung gewinnen', () => {
    const run = newRun(1);
    expect(checkDiscoveries({ run, ritualWon: { spinsUsed: 1 } }, new Set()).some((d) => d.item === 'arcana:rad')).toBe(true);
  });
});
