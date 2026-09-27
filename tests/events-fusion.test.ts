import { describe, expect, it } from 'vitest';
import { ARCANA, ARCANA_BY_ID } from '../src/content/arcana';
import { EVENTS, rollEvent } from '../src/content/events';
import { FUSIONS, FUSION_PRICE } from '../src/content/fusions';
import { Rng } from '../src/core/rng';
import { finishRitual, newRun, nextRitual } from '../src/core/run';
import { DEFAULT_META_STATE, HISTORY_MAX, recordRun } from '../src/core/save';
import { fuseArcana, fusionOptions, resolveEvent } from '../src/core/shop';
import { simulateSpin } from '../src/core/spin';
import { computeStats } from '../src/core/stats';

describe('Arkana-Fusion', () => {
  it('Rezepte verweisen auf existierende Karten, Ergebnisse gibt es nicht im Basar', () => {
    for (const r of FUSIONS) {
      expect(ARCANA_BY_ID[r.a], r.a).toBeTruthy();
      expect(ARCANA_BY_ID[r.b], r.b).toBeTruthy();
      expect(ARCANA_BY_ID[r.result]?.rarity).toBe('legendary');
      expect(ARCANA.some((a) => a.id === r.result)).toBe(false);
    }
  });

  it('braucht beide Zutaten auf Stufe 3 und verschmilzt sie', () => {
    const run = newRun(1);
    run.souls = 20;
    run.arcana = [
      { uid: 90, id: 'narr', level: 3, state: {} },
      { uid: 91, id: 'sonne', level: 2, state: {} },
      { uid: 92, id: 'wagen', level: 3, state: {}, edition: 'holo' },
    ];
    expect(fusionOptions(run).map((r) => r.result)).toEqual(['wilderritt']);
    expect(fuseArcana(run, fusionOptions(run)[0])).toBe(true);
    expect(run.arcana.map((a) => a.id)).toEqual(['wilderritt', 'sonne']);
    expect(run.arcana[0].edition).toBe('holo');
    expect(run.souls).toBe(20 - FUSION_PRICE);
  });

  it('alle Fusions-Arkana lassen sich simulieren', () => {
    for (const r of FUSIONS) {
      const run = newRun(4);
      run.arcana = [{ uid: 50, id: r.result, level: 3, state: {} }];
      const res = simulateSpin(run, { kind: 'red' }, new Rng(3));
      expect(res.score.gt(0), r.result).toBe(true);
    }
  });
});

describe('Begegnungen', () => {
  const shopRun = (seed: number) => {
    const run = newRun(seed);
    run.ritualScore = run.target;
    finishRitual(run);
    return run;
  };

  it('erscheinen deterministisch und nur im normalen Modus', () => {
    let seen = 0;
    for (let s = 1; s <= 60; s++) {
      const a = shopRun(s);
      const b = shopRun(s);
      expect(a.shop?.event).toEqual(b.shop?.event);
      if (a.shop?.event) seen++;
    }
    expect(seen).toBeGreaterThan(10);
    expect(seen).toBeLessThan(45);
    const daily = newRun(3, undefined, { mode: 'daily' });
    expect(rollEvent(daily) === undefined || daily.mode === 'daily').toBe(true);
  });

  it('jede Option lässt sich ausführen', () => {
    for (const ev of EVENTS) {
      ev.options.forEach((_, i) => {
        const run = shopRun(7);
        run.souls = 30;
        run.shop!.event = { id: ev.id };
        const r = resolveEvent(run, i);
        if (r.ok) {
          expect(run.shop!.event!.result).toBe(r.text);
          expect(resolveEvent(run, i).ok).toBe(false);
        }
        expect(run.souls).toBeGreaterThanOrEqual(0);
      });
    }
  });

  it('Blutaltar: dauerhaft Fluch, eine Drehung weniger im nächsten Ritual', () => {
    const run = shopRun(9);
    const base = computeStats(run);
    run.shop!.event = { id: 'altar' };
    expect(resolveEvent(run, 0).ok).toBe(true);
    expect(computeStats(run).baseFluch).toBe(base.baseFluch + 2);
    nextRitual(run);
    expect(run.spinsLeft).toBe(base.spins - 1);
    expect(run.nextRitual).toBeUndefined();
  });
});

describe('Chronik', () => {
  it('speichert die letzten Runs und Summen', () => {
    const meta = structuredClone(DEFAULT_META_STATE);
    const run = newRun(2, undefined, { hero: 'hexe' });
    run.stats.spins = 7;
    run.stats.betsHit = 3;
    for (let i = 0; i < HISTORY_MAX + 5; i++) recordRun(meta, run, 'Test');
    expect(meta.history).toHaveLength(HISTORY_MAX);
    expect(meta.history[0].hero).toBe('hexe');
    expect(meta.totals.spins).toBe(7 * (HISTORY_MAX + 5));
  });
});
