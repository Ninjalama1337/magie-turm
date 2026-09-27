import { describe, expect, it } from 'vitest';
import Decimal from 'break_eternity.js';
import { ARCANA } from '../src/content/arcana';
import { PACTS } from '../src/content/pacts';
import { SIGILS } from '../src/content/sigils';
import { DEMONS } from '../src/content/demons';
import { fmt } from '../src/core/num';
import { Rng } from '../src/core/rng';
import { finishRitual, newRun, nextRitual, spin, targetFor } from '../src/core/run';
import { deserializeRun, serializeRun } from '../src/core/save';
import { buy, moveArcana, sellArcana, swapSigils, unlockSlot, upgradeArcana } from '../src/core/shop';
import { betMatches, simulateSpin } from '../src/core/spin';
import type { RunState } from '../src/core/types';
import { colorOf, neighbours, WHEEL_ORDER } from '../src/core/wheel';

function runWith(opts: { arcana?: string[]; sigils?: string[]; pacts?: string[]; demon?: string } = {}): RunState {
  const run = newRun(42);
  run.arcana = (opts.arcana ?? []).map((id, i) => ({ uid: 100 + i, id, level: 1, state: {} }));
  run.sigilUnlocked = 8;
  run.sigils = Array.from({ length: 8 }, (_, i) =>
    opts.sigils?.[i] ? { uid: 200 + i, id: opts.sigils[i], level: 1 } : null,
  );
  run.pacts = (opts.pacts ?? []).map((id) => ({ id, stacks: 1 }));
  run.demon = opts.demon ?? null;
  return run;
}

describe('Kessel', () => {
  it('hat 37 eindeutige Fächer', () => {
    expect(new Set(WHEEL_ORDER).size).toBe(37);
    expect(colorOf(0)).toBe('hell');
    expect(colorOf(32)).toBe('red');
    expect(colorOf(15)).toBe('black');
  });
  it('findet Nachbarn', () => {
    expect(neighbours(0, 1).sort()).toEqual([26, 32].sort());
  });
  it('wertet Einsätze aus', () => {
    expect(betMatches({ kind: 'red' }, 1)).toBe(true);
    expect(betMatches({ kind: 'black' }, 0)).toBe(false);
    expect(betMatches({ kind: 'even' }, 0)).toBe(false);
    expect(betMatches({ kind: 'dozen3' }, 36)).toBe(true);
    expect(betMatches({ kind: 'number', number: 0 }, 32, 1)).toBe(true);
    expect(betMatches({ kind: 'number', number: 0 }, 32, 0)).toBe(false);
  });
});

describe('Zahlen', () => {
  it('formatiert große Zahlen', () => {
    expect(fmt(1234)).toBe('1.234');
    expect(fmt(new Decimal('1.5e45'))).toBe('1,50e45');
    expect(fmt(new Decimal('1e1e10'))).toMatch(/^e/);
  });
});

describe('Drehung', () => {
  it('ist deterministisch', () => {
    const a = simulateSpin(runWith({ arcana: ['narr', 'rad'], sigils: ['glut', 'wuerfel'] }), { kind: 'red' }, new Rng(7));
    const b = simulateSpin(runWith({ arcana: ['narr', 'rad'], sigils: ['glut', 'wuerfel'] }), { kind: 'red' }, new Rng(7));
    expect(a.score.toString()).toBe(b.score.toString());
    expect(a.events.length).toBe(b.events.length);
    expect(a.pocket).toBe(b.pocket);
  });

  it('liefert Score = Glut × Fluch und endet mit Landung', () => {
    const r = simulateSpin(runWith(), { kind: 'red' }, new Rng(1));
    expect(r.mainLaps).toBeGreaterThanOrEqual(2);
    expect(r.score.eq(r.glut.mul(r.fluch).floor())).toBe(true);
    expect(r.events.some((e) => e.type === 'land')).toBe(true);
    expect(r.events[r.events.length - 1].type).toBe('end');
  });

  it('Glutsiegel erhöht Glut pro Runde', () => {
    const base = simulateSpin(runWith(), { kind: 'red' }, new Rng(3));
    const withSigil = simulateSpin(runWith({ sigils: ['glut'] }), { kind: 'red' }, new Rng(3));
    expect(withSigil.glut.sub(base.glut).toNumber()).toBe(8 * withSigil.mainLaps);
  });

  it('Sturmsiegel verlängert die Fahrt', () => {
    const base = simulateSpin(runWith(), { kind: 'red' }, new Rng(5));
    const fast = simulateSpin(runWith({ sigils: ['tempo', 'tempo', 'tempo'] }), { kind: 'red' }, new Rng(5));
    expect(fast.mainLaps).toBeGreaterThan(base.mainLaps);
  });

  it('Spiegelsiegel verdoppelt das nächste Siegel', () => {
    const a = simulateSpin(runWith({ sigils: ['glut'] }), { kind: 'red' }, new Rng(9));
    const b = simulateSpin(runWith({ sigils: ['spiegel', 'glut'] }), { kind: 'red' }, new Rng(9));
    expect(b.glut.sub(a.glut).toNumber()).toBe(8 * b.mainLaps);
  });

  it('Magier wiederholt die linke Arkana', () => {
    const a = simulateSpin(runWith({ arcana: ['narr'] }), { kind: 'red' }, new Rng(2));
    const b = simulateSpin(runWith({ arcana: ['narr', 'magier'] }), { kind: 'red' }, new Rng(2));
    expect(b.fluch.gt(a.fluch)).toBe(true);
  });

  it('Schatten beschwört Irrlichter, Beelzebub verhindert sie', () => {
    const a = simulateSpin(runWith({ arcana: ['schatten'] }), { kind: 'red' }, new Rng(4));
    expect(a.ghosts).toBe(1);
    const b = simulateSpin(runWith({ arcana: ['schatten'], demon: 'beelzebub' }), { kind: 'red' }, new Rng(4));
    expect(b.ghosts).toBe(0);
  });

  it('begrenzt Endlos-Ketten', () => {
    const run = runWith({
      arcana: ['welt', 'herrscherin', 'magier', 'gehaengte', 'hexe'],
      sigils: ['tempo', 'kette', 'spiegel', 'kette', 'tempo', 'irrlicht', 'pentagramm', 'echo'],
      pacts: ['horde', 'schwere', 'zweitekugel'],
    });
    run.sigils.forEach((s) => s && (s.level = 5));
    run.arcana.forEach((a) => (a.level = 5));
    const r = simulateSpin(run, { kind: 'red' }, new Rng(11));
    expect(r.mainLaps).toBeLessThanOrEqual(160);
    expect(r.score.isFinite()).toBe(true);
  });

  it('jede Arkana, jedes Siegel und jeder Pakt läuft fehlerfrei', () => {
    for (const a of ARCANA) {
      for (const s of SIGILS) {
        const run = runWith({ arcana: [a.id, 'magier'], sigils: [s.id, s.id], pacts: [PACTS[(a.id.length + s.id.length) % PACTS.length].id] });
        const r = simulateSpin(run, { kind: 'number', number: 17 }, new Rng(a.id.length * 31 + s.id.length));
        expect(r.score.gte(0)).toBe(true);
        expect(a.desc(1, run.arcana[0]).length).toBeGreaterThan(5);
        expect(s.desc(1).length).toBeGreaterThan(3);
      }
    }
    for (const d of DEMONS) {
      const r = simulateSpin(runWith({ arcana: ['narr'], sigils: ['glut'], demon: d.id }), { kind: 'red' }, new Rng(1));
      expect(r.score.gte(0)).toBe(true);
    }
  });

  it('Gericht lädt sich bei Fehlschlägen auf', () => {
    const run = runWith({ arcana: ['gericht'] });
    for (let i = 0; i < 10; i++) simulateSpin(run, { kind: 'number', number: 5 }, new Rng(i + 100));
    expect(run.arcana[0].state.glut ?? 0).toBeGreaterThan(0);
  });
});

describe('Run', () => {
  it('Ziele steigen und erreichen im Jenseits riesige Werte', () => {
    expect(targetFor(1, 0).lt(targetFor(1, 1))).toBe(true);
    expect(targetFor(9, 2).lt(targetFor(10, 0))).toBe(true);
    expect(targetFor(60, 2).gt('1e308')).toBe(true);
  });

  it('spielt ein Ritual durch und öffnet den Basar', () => {
    const run = newRun(123);
    run.target = new Decimal(1);
    const { outcome } = spin(run, { kind: 'red' }, true);
    expect(outcome).toBe('won');
    const souls = run.souls;
    const lines = finishRitual(run);
    expect(lines.length).toBeGreaterThan(0);
    expect(run.souls).toBeGreaterThan(souls);
    expect(run.phase).toBe('shop');
    expect(run.shop!.offers.length).toBeGreaterThanOrEqual(4);
    nextRitual(run);
    expect(run.ritual).toBe(1);
    expect(run.phase).toBe('ritual');
  });

  it('verliert, wenn die Drehungen ausgehen', () => {
    const run = newRun(5);
    run.target = new Decimal('1e100');
    let out = 'continue';
    while (out === 'continue') out = spin(run, { kind: 'red' }, true).outcome;
    expect(out).toBe('lost');
    expect(run.phase).toBe('gameover');
  });

  it('Dämon im dritten Ritual, Luzifer im neunten Kreis', () => {
    const run = newRun(9);
    run.ritual = 1;
    nextRitual(run);
    expect(run.demon).toBeTruthy();
    run.circle = 8;
    run.ritual = 2;
    nextRitual(run);
    expect(run.circleDemon).toBe('luzifer');
  });

  it('Basar: kaufen, verkaufen, aufwerten, freilegen, umordnen', () => {
    const run = newRun(77);
    run.target = new Decimal(1);
    spin(run, { kind: 'red' }, true);
    finishRitual(run);
    run.souls = 200;
    const arc = run.shop!.offers.findIndex((o) => o.kind === 'arcana');
    expect(buy(run, arc)).toBe(true);
    expect(run.arcana.length).toBe(1);
    expect(upgradeArcana(run, 0)).toBe(true);
    expect(run.arcana[0].level).toBe(2);
    const sig = run.shop!.offers.findIndex((o) => o.kind === 'sigil');
    expect(buy(run, sig)).toBe(true);
    expect(unlockSlot(run)).toBe(true);
    expect(run.sigilUnlocked).toBe(4);
    swapSigils(run, 0, 3);
    expect(run.sigils[0]).toBeNull();
    run.arcana.push({ uid: 999, id: 'narr', level: 1, state: {} });
    moveArcana(run, 1, 0);
    expect(run.arcana[0].id).toBe('narr');
    expect(sellArcana(run, 0)).toBe(true);
    expect(run.arcana.length).toBe(1);
  });

  it('Speichern & Laden erhält den Zustand', () => {
    const run = newRun(31337);
    run.ritualScore = new Decimal('1.23e400');
    run.arcana.push({ uid: 5, id: 'tod', level: 2, state: { stored: 12 } });
    const back = deserializeRun(serializeRun(run))!;
    expect(back.ritualScore.toString()).toBe(run.ritualScore.toString());
    expect(back.arcana[0].state.stored).toBe(12);
    expect(back.target.eq(run.target)).toBe(true);
    expect(deserializeRun('{kaputt')).toBeNull();
  });
});
