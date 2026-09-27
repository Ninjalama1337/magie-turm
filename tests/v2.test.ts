import { describe, expect, it } from 'vitest';
import Decimal from 'break_eternity.js';
import { ACHIEVEMENTS, checkAchievements } from '../src/content/achievements';
import { ARCANA } from '../src/content/arcana';
import { DEMONS } from '../src/content/demons';
import { OMENS } from '../src/content/omens';
import { PACTS } from '../src/content/pacts';
import { POTIONS } from '../src/content/potions';
import { SIGILS } from '../src/content/sigils';
import { STAKES } from '../src/content/stakes';
import { challengeFor, weekKey } from '../src/core/daily';
import { Rng } from '../src/core/rng';
import { finishRitual, newRun, spin, targetFor } from '../src/core/run';
import { deserializeRun, serializeRun } from '../src/core/save';
import { buy, generateShop, usePotion } from '../src/core/shop';
import { betCoverage, betMatches, simulateSpin } from '../src/core/spin';
import { computeStats } from '../src/core/stats';
import type { RunState } from '../src/core/types';
import { DOUBLE_ZERO, WHEEL_BY_ID, WHEELS } from '../src/core/wheel';

function loaded(wheel: string, arcana: string[], sigils: string[]): RunState {
  const run = newRun(1, undefined, { wheel });
  run.arcana = arcana.map((id, i) => ({ uid: 50 + i, id, level: 2, state: {} }));
  run.sigilUnlocked = 8;
  run.sigils = Array.from({ length: 8 }, (_, i) => (sigils[i] ? { uid: 90 + i, id: sigils[i], level: 2 } : null));
  return run;
}

describe('Umfang', () => {
  it('hat den geplanten Inhalt', () => {
    expect(ARCANA.length).toBe(50);
    expect(SIGILS.length).toBe(30);
    expect(PACTS.length).toBe(40);
    expect(DEMONS.length).toBe(12);
    expect(WHEELS.length).toBe(6);
    expect(STAKES.length).toBe(5);
    expect(POTIONS.length).toBeGreaterThanOrEqual(12);
    expect(OMENS.length).toBeGreaterThanOrEqual(12);
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(20);
    for (const list of [ARCANA, SIGILS, PACTS, DEMONS, WHEELS]) {
      expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
    }
  });
});

describe('Kessel', () => {
  it('Amerikanisch hat 38 Fächer mit 00', () => {
    const w = WHEEL_BY_ID.american;
    expect(w.order.length).toBe(38);
    expect(new Set(w.order).size).toBe(38);
    expect(w.order).toContain(DOUBLE_ZERO);
  });

  it('Mini-Rad: Drittel und Hälften passen', () => {
    const w = WHEEL_BY_ID.mini;
    expect(new Set(w.order).size).toBe(13);
    expect(betCoverage({ kind: 'dozen1' }, w)).toBe(4);
    expect(betCoverage({ kind: 'low' }, w)).toBe(6);
    expect(betCoverage({ kind: 'red' }, w)).toBe(6);
    expect(betMatches({ kind: 'dozen3' }, 12, 0, w)).toBe(true);
  });

  it('jede Kombination läuft auf jedem Kessel', () => {
    for (const w of WHEELS) {
      for (let i = 0; i < ARCANA.length; i += 1) {
        const a = [ARCANA[i].id, ARCANA[(i + 7) % ARCANA.length].id, 'magier'];
        const s = [SIGILS[i % SIGILS.length].id, SIGILS[(i + 11) % SIGILS.length].id, SIGILS[(i + 19) % SIGILS.length].id, 'zwilling', 'blitz'];
        const run = loaded(w.id, a, s);
        const r = simulateSpin(run, { kind: i % 2 ? 'number' : 'dozen1', number: w.order[i % w.order.length] }, new Rng(i + 1));
        expect(r.score.gte(0)).toBe(true);
        expect(r.score.isFinite()).toBe(true);
      }
    }
  });

  it('Start-Ausstattung der Kessel greift', () => {
    expect(newRun(1, undefined, { wheel: 'knochen' }).sigilUnlocked).toBe(8);
    expect(Object.keys(newRun(1, undefined, { wheel: 'blut' }).enchants).length).toBe(6);
    expect(computeStats(newRun(1, undefined, { wheel: 'stern' })).spins).toBe(3);
  });
});

describe('Stufen, Dämonen, Omen', () => {
  it('Stufen erhöhen die Ziele', () => {
    const a = newRun(3, undefined, { stake: 1 });
    const b = newRun(3, undefined, { stake: 5 });
    expect(b.target.gt(a.target)).toBe(true);
    expect(computeStats(b).spins).toBe(3);
  });

  it('jeder Dämon läuft', () => {
    for (const d of DEMONS) {
      const run = loaded('euro', ['narr', 'herrscherin', 'sonne'], ['glut', 'fluch', 'tempo']);
      run.demon = d.id;
      const r = simulateSpin(run, { kind: 'red' }, new Rng(5));
      expect(r.score.gte(0)).toBe(true);
    }
  });

  it('Omen verändern den Start', () => {
    const run = newRun(4, undefined, { omens: ['reich', 'rauten'] });
    expect(run.souls).toBe(14);
    expect(run.sigilUnlocked).toBe(8);
  });

  it('Challenge-Spezifikation ist pro Datum stabil', () => {
    const d = new Date(Date.UTC(2026, 8, 27, 12));
    const a = challengeFor('daily', d);
    const b = challengeFor('daily', new Date(Date.UTC(2026, 8, 27, 23)));
    expect(a).toEqual(b);
    expect(challengeFor('daily', new Date(Date.UTC(2026, 8, 28))).seed).not.toBe(a.seed);
    expect(weekKey(d)).toBe('2026-W39');
    expect(a.omens.length).toBe(2);
  });
});

describe('Tränke & Editionen', () => {
  it('Blutgebräu verdoppelt den Fluch einer Drehung', () => {
    const r1 = loaded('euro', [], ['glut']);
    const base = simulateSpin(r1, { kind: 'red' }, new Rng(9));
    const r2 = loaded('euro', [], ['glut']);
    r2.potions = ['blut'];
    expect(usePotion(r2, 0, new Rng(1)).ok).toBe(true);
    const boosted = simulateSpin(r2, { kind: 'red' }, new Rng(9));
    expect(boosted.fluch.toNumber()).toBeCloseTo(base.fluch.toNumber() * 2);
  });

  it('Gezinkte Kugel trifft garantiert', () => {
    for (let i = 0; i < 20; i++) {
      const run = loaded('euro', [], []);
      run.potions = ['gezinkt'];
      usePotion(run, 0, new Rng(1));
      expect(simulateSpin(run, { kind: 'number', number: 7 }, new Rng(i)).hit).toBe(true);
    }
  });

  it('Buffs verfallen nach der Drehung', () => {
    const run = newRun(8);
    run.potions = ['sturm'];
    usePotion(run, 0, new Rng(1));
    expect(run.buffs.tempo).toBe(12);
    spin(run, { kind: 'red' }, true);
    expect(run.buffs.tempo).toBe(0);
  });

  it('Polychrom-Edition multipliziert, Negativ gibt einen Platz', () => {
    const run = loaded('euro', ['herrscherin'], []);
    const base = simulateSpin(run, { kind: 'red' }, new Rng(2));
    const run2 = loaded('euro', ['herrscherin'], []);
    run2.arcana[0].edition = 'poly';
    const poly = simulateSpin(run2, { kind: 'red' }, new Rng(2));
    expect(poly.fluch.toNumber()).toBeCloseTo(base.fluch.toNumber() * 1.5);
    run2.arcana[0].edition = 'negativ';
    expect(computeStats(run2).arcanaSlots).toBe(6);
  });

  it('Basar bietet Tränke an und kann sie verkaufen', () => {
    const run = newRun(12);
    run.target = new Decimal(1);
    spin(run, { kind: 'red' }, true);
    finishRitual(run);
    run.souls = 100;
    const i = run.shop!.offers.findIndex((o) => o.kind === 'potion');
    expect(i).toBeGreaterThanOrEqual(0);
    expect(buy(run, i)).toBe(true);
    expect(run.potions.length).toBe(1);
    run.shop = generateShop(run, new Rng(3));
  });
});

describe('Speichern & Erfolge', () => {
  it('migriert v1-Spielstände', () => {
    const run = newRun(1) as unknown as Record<string, unknown>;
    run.version = 1;
    for (const k of ['wheel', 'stake', 'mode', 'dailyKey', 'omens', 'potions', 'buffs']) delete run[k];
    const back = deserializeRun(serializeRun(run as unknown as RunState))!;
    expect(back.version).toBe(2);
    expect(back.wheel).toBe('euro');
    expect(back.buffs.fluchMult).toBe(1);
  });

  it('erkennt Erfolge', () => {
    const run = newRun(1);
    const res = spin(run, { kind: 'red' }, true).result;
    const got = checkAchievements({ run, spin: { ...res, score: new Decimal('1e13') } }, []);
    expect(got.map((a) => a.id)).toEqual(expect.arrayContaining(['k1', 'm1', 'e12']));
    expect(checkAchievements({ run, spin: { ...res, score: new Decimal('1e13') } }, ['k1', 'm1', 'e12']).some((a) => a.id === 'k1')).toBe(false);
  });

  it('Ziele im Jenseits bleiben endlich', () => {
    expect(targetFor(80, 2).isFinite()).toBe(true);
  });
});
