import Decimal from 'break_eternity.js';
import { describe, expect, it } from 'vitest';
import { bonds, resonance, SIGIL_ELEMENT } from '../src/content/elements';
import { HEROES } from '../src/content/heroes';
import { SIGILS } from '../src/content/sigils';
import { Rng } from '../src/core/rng';
import { newRun } from '../src/core/run';
import { DEFAULT_META_STATE, exportSave, parseSave } from '../src/core/save';
import { simulateSpin } from '../src/core/spin';
import { computeStats } from '../src/core/stats';
import type { RunState } from '../src/core/types';

const place = (run: RunState, ids: string[]) => {
  run.sigilUnlocked = 8;
  run.sigils = run.sigils.map((_, i) => (ids[i] ? { uid: 100 + i, id: ids[i], level: 1 } : null));
};

describe('Siegel-Synergien', () => {
  it('jedes Siegel hat ein Element', () => {
    for (const s of SIGILS) expect(SIGIL_ELEMENT[s.id], s.id).toBeTruthy();
  });

  it('Resonanz nur bei gleichem Element direkt nebeneinander', () => {
    const run = newRun(1);
    place(run, ['glut', 'kerze', 'fluch', 'tempo', 'glut']);
    expect(resonance(run).slice(0, 5)).toEqual([true, true, false, false, false]);
  });

  it('versiegelte Rauten zählen weder für Resonanz noch für Bünde', () => {
    const run = newRun(1);
    place(run, ['glut', 'kerze', 'echo']);
    run.sigilUnlocked = 2;
    expect(resonance(run)[2]).toBe(false);
    expect(bonds(run).find((b) => b.element.id === 'flamme')?.count).toBe(2);
  });

  it('Resonanz verstärkt ein Siegel wie eine Stufe mehr', () => {
    const a = newRun(3);
    place(a, ['glut', 'fluch']);
    const b = newRun(3);
    place(b, ['glut', 'kerze']);
    const glutA = simulateSpin(a, { kind: 'red' }, new Rng(9)).glut;
    const onlyGlut = newRun(3);
    place(onlyGlut, ['glut']);
    const base = simulateSpin(onlyGlut, { kind: 'red' }, new Rng(9)).glut;
    // ohne Resonanz ändert ein fremdes Element die Glut nicht
    expect(glutA.eq(base)).toBe(true);
    expect(simulateSpin(b, { kind: 'red' }, new Rng(9)).glut.gt(base)).toBe(true);
  });

  it('Bünde verändern die Werte ab der jeweiligen Schwelle', () => {
    const run = newRun(1);
    const base = computeStats(run);
    place(run, ['glut', 'fluch', 'kerze', 'tempo', 'echo']);
    expect(computeStats(run).lapGlut).toBe(base.lapGlut + 3);
    place(run, ['glut', 'kerze', 'echo', 'sanduhr', 'kelch']);
    expect(computeStats(run).endGlut).toBe(1.5);
    place(run, ['seelen', 'goldader', 'muenze']);
    const s = computeStats(run);
    expect(s.rewardAdd).toBe(base.rewardAdd + 1);
    expect(s.interestCap).toBe(base.interestCap + 5);
  });
});

describe('Beschwörer', () => {
  it('haben eindeutige IDs, der Wanderer ist immer frei', () => {
    expect(new Set(HEROES.map((h) => h.id)).size).toBe(HEROES.length);
    expect(HEROES[0].unlocked({ runs: 0, bestCircle: 0, victories: 0, insightXp: 0 })).toBe(true);
    expect(HEROES.filter((h) => h.unlocked({ runs: 0, bestCircle: 0, victories: 0, insightXp: 0 }))).toHaveLength(1);
    expect(HEROES.every((h) => h.unlocked({ runs: 99, bestCircle: 9, victories: 1, insightXp: 99999 }))).toBe(true);
  });

  it('verändern Start und Werte', () => {
    const w = newRun(5);
    expect(w.hero).toBeUndefined();
    const sp = newRun(5, undefined, { hero: 'spieler' });
    expect(sp.sigils[0]?.id).toBe('wuerfel');
    expect(computeStats(sp).numberPay).toBe(computeStats(w).numberPay * 1.5);
    const hx = newRun(5, undefined, { hero: 'hexe' });
    expect(hx.potions).toHaveLength(2);
    expect(hx.souls).toBe(w.souls - 2);
    expect(computeStats(hx).potionSlots).toBe(computeStats(w).potionSlots + 1);
    expect(computeStats(newRun(5, undefined, { hero: 'alchemist' })).arcanaSlots).toBe(4);
    const gs = newRun(5, undefined, { hero: 'seher' });
    expect(gs.sigils[0]?.id).toBe('irrlicht');
    expect(computeStats(gs).startGhosts).toBe(1);
  });

  it('Runs aller Beschwörer lassen sich simulieren', () => {
    for (const h of HEROES) {
      const run = newRun(11, undefined, { hero: h.id });
      const r = simulateSpin(run, { kind: 'number', number: 7 }, new Rng(2));
      expect(r.score.gte(0)).toBe(true);
    }
  });
});

describe('Spielstand-Export', () => {
  it('Roundtrip von Meta und Run', () => {
    const meta = structuredClone(DEFAULT_META_STATE);
    meta.ash = 123;
    meta.talents = ['glutkern1'];
    const run = newRun(7, undefined, { hero: 'graefin' });
    run.ritualScore = new Decimal('1e50');
    const code = exportSave(meta, run);
    expect(code.startsWith('TEUFELSRAD1:')).toBe(true);
    const back = parseSave(`  ${code.slice(0, 20)}\n${code.slice(20)} `);
    expect(back?.meta.ash).toBe(123);
    expect(back?.meta.talents).toEqual(['glutkern1']);
    expect(back?.run?.hero).toBe('graefin');
    expect(back?.run?.ritualScore.eq(new Decimal('1e50'))).toBe(true);
  });

  it('ungültige Codes werden abgelehnt', () => {
    expect(parseSave('')).toBeNull();
    expect(parseSave('TEUFELSRAD1:kaputt')).toBeNull();
    expect(parseSave('TEUFELSRAD1:' + btoa('{"meta":{}}'))).toBeNull();
  });
});
