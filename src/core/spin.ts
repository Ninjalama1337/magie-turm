import Decimal from 'break_eternity.js';
import { SIGIL_BY_ID } from '../content/sigils';
import { addFluch, addGlut, addSouls, info, log, MAX_LAPS_PER_BALL, mulFluch, roll, spawnGhost } from './effects';
import { fireAll, hasArcana } from './hooks';
import { Rng } from './rng';
import { computeStats, currentDemon } from './stats';
import type { Ball, Bet, RunState, SpinCtx, SpinResult, Stats } from './types';
import { colorOf, dozenOf, isEven, isOdd, neighbours, WHEEL_ORDER } from './wheel';

export const BET_LABELS: Record<Bet['kind'], string> = {
  red: 'Rot',
  black: 'Schwarz',
  even: 'Gerade',
  odd: 'Ungerade',
  low: '1–18',
  high: '19–36',
  dozen1: '1. Dutzend',
  dozen2: '2. Dutzend',
  dozen3: '3. Dutzend',
  number: 'Zahl',
};

export function betLabel(bet: Bet): string {
  return bet.kind === 'number' ? `Zahl ${bet.number ?? 0}` : BET_LABELS[bet.kind];
}

export function betPayout(bet: Bet, s: Stats): number {
  switch (bet.kind) {
    case 'red':
    case 'black':
      return s.colorPay;
    case 'even':
    case 'odd':
      return s.parityPay;
    case 'low':
    case 'high':
      return s.halfPay;
    case 'dozen1':
    case 'dozen2':
    case 'dozen3':
      return s.dozenPay;
    case 'number':
      return s.numberPay;
  }
}

export function betMatches(bet: Bet, pocket: number, sternRange = 0): boolean {
  switch (bet.kind) {
    case 'red':
      return colorOf(pocket) === 'red';
    case 'black':
      return colorOf(pocket) === 'black';
    case 'even':
      return isEven(pocket);
    case 'odd':
      return isOdd(pocket);
    case 'low':
      return pocket >= 1 && pocket <= 18;
    case 'high':
      return pocket >= 19;
    case 'dozen1':
      return dozenOf(pocket) === 1;
    case 'dozen2':
      return dozenOf(pocket) === 2;
    case 'dozen3':
      return dozenOf(pocket) === 3;
    case 'number': {
      const n = bet.number ?? 0;
      return pocket === n || (sternRange > 0 && neighbours(n, sternRange).includes(pocket));
    }
  }
}

export function sternRange(level: number): number {
  return level > 0 ? 1 + Math.floor((level - 1) / 2) : 0;
}

export function isBetAllowed(run: RunState, bet: Bet): boolean {
  return !(bet.kind === 'number' && currentDemon(run)?.mods.noNumberBets);
}

function friction(ctx: SpinCtx, b: Ball): number {
  return ctx.stats.friction + ctx.stats.frictionGrowth * b.laps;
}

function landMain(ctx: SpinCtx, b: Ball): void {
  const pocket = WHEEL_ORDER[ctx.rng.int(WHEEL_ORDER.length)];
  b.pocket = pocket;
  ctx.pocket = pocket;
  log(ctx, 'land', b.id, { pocket });

  if (pocket > 0) addGlut(ctx, pocket, { k: 'pocket' });
  else if (ctx.stats.hellFluch > 1) mulFluch(ctx, ctx.stats.hellFluch, { k: 'pocket' });

  const ench = ctx.run.enchants[pocket];
  if (ench) {
    const src = { k: 'pocket' } as const;
    switch (ench) {
      case 'gold':
        addSouls(ctx, 3, src);
        break;
      case 'blood':
        mulFluch(ctx, 1.5, src);
        break;
      case 'glass':
        mulFluch(ctx, 3, src);
        if (ctx.rng.chance(0.25)) {
          delete ctx.run.enchants[pocket];
          info(ctx, 'Glas zerbricht!', src, 0, 'bad');
        }
        break;
      case 'lucky':
        if (roll(ctx, 1 / 5)) addFluch(ctx, 20, src);
        if (roll(ctx, 1 / 15)) addSouls(ctx, 20, src);
        break;
      case 'ember':
        addGlut(ctx, 10 * Math.max(1, ctx.mainLaps), src);
        break;
    }
  }

  fireAll(ctx, 'land', pocket);

  const hit = betMatches(ctx.bet, pocket, sternRange(hasArcana(ctx, 'stern')));
  ctx.betHit = hit;
  if (hit) {
    mulFluch(ctx, betPayout(ctx.bet, ctx.stats), { k: 'bet' });
    fireAll(ctx, 'betHit');
  } else {
    info(ctx, 'Verfehlt', { k: 'bet' }, 0, 'bad');
    fireAll(ctx, 'betMiss');
  }
}

function landGhost(ctx: SpinCtx, b: Ball): void {
  const pocket = WHEEL_ORDER[ctx.rng.int(WHEEL_ORDER.length)];
  b.pocket = pocket;
  log(ctx, 'ghostLand', b.id, { pocket });
  if (pocket > 0) addGlut(ctx, pocket, { k: 'pocket' }, b.id);
}

export interface SpinOptions {
  quiet?: boolean;
}

/**
 * Simuliert eine komplette Drehung. Deterministisch bei gleichem RNG-Zustand.
 * Mutiert Arkana-Zustände und Fach-Verzauberungen im Run (dauerhafte Effekte).
 */
export function simulateSpin(run: RunState, bet: Bet, rng: Rng, opts: SpinOptions = {}): SpinResult {
  const stats = computeStats(run);
  const demon = currentDemon(run);
  const activeArcana = run.arcana.map(() => true);
  if (demon?.mods.disableRightmost && activeArcana.length) activeArcana[activeArcana.length - 1] = false;

  const ctx: SpinCtx = {
    run,
    rng,
    bet,
    stats,
    demon,
    glut: new Decimal(0),
    fluch: new Decimal(stats.baseFluch),
    events: [],
    seq: 0,
    tick: 0,
    at: 0,
    balls: [],
    ghostsSpawned: 0,
    mainLaps: 0,
    totalLaps: 0,
    sigilTriggers: 0,
    pocket: null,
    betHit: null,
    souls: 0,
    sigilSouls: 0,
    mirror: {},
    depth: 0,
    counters: {},
    activeArcana,
    quiet: !!opts.quiet,
  };

  const main: Ball = {
    id: 0,
    ghost: false,
    energy: stats.tempo * (0.85 + rng.next() * 0.3),
    laps: 0,
    active: true,
    startTick: 1,
    pocket: null,
  };
  ctx.balls.push(main);
  log(ctx, 'start', 0);

  fireAll(ctx, 'spinStart');
  for (let g = 0; g < stats.startGhosts; g++) spawnGhost(ctx, { k: 'pact', id: 'zweitekugel' });

  const worldLevel = hasArcana(ctx, 'welt');
  const worldExtra = worldLevel > 0 ? 1 + Math.floor(worldLevel / 3) : 0;
  const sigilCount = Math.min(run.sigilUnlocked, run.sigils.length);
  const landing: Ball[] = [];

  for (let tick = 1; tick < 2000; tick++) {
    ctx.tick = tick;
    ctx.at = 0;

    // 1) Landungen der Kugeln, die in der letzten Umrundung ausgerollt sind
    while (landing.length) {
      const b = landing.shift()!;
      if (b.ghost) landGhost(ctx, b);
      else landMain(ctx, b);
    }

    const active = ctx.balls.filter((b) => b.active && b.startTick <= tick);
    if (!active.length) {
      if (ctx.balls.some((b) => b.active)) continue;
      break;
    }

    // 2) Neue Irrlichter erscheinen
    ctx.at = 0.02;
    for (const b of active) if (b.ghost && b.laps === 0) fireAll(ctx, 'ghost', b);

    // 3) Rundenbeginn
    ctx.at = 0.04;
    for (const b of active) {
      b.laps++;
      b.energy -= friction(ctx, b);
      ctx.totalLaps++;
      if (!b.ghost) ctx.mainLaps++;
      ctx.glut = ctx.glut.add(stats.lapGlut);
      log(ctx, 'lap', b.id, { src: { k: 'base' }, text: `+${stats.lapGlut}`, tone: 'glut' });
      fireAll(ctx, 'lap', b);
    }

    // 4) Siegel in Reihenfolge der Rauten
    for (let slot = 0; slot < sigilCount; slot++) {
      const inst = run.sigils[slot];
      if (!inst) continue;
      const def = SIGIL_BY_ID[inst.id];
      if (!def) continue;
      ctx.at = (slot + 0.5) / 8;
      for (const b of active) {
        if (!b.active) continue;
        if (demon?.mods.sigilEveryOther && b.laps % 2 === 1) continue;
        if (demon?.mods.blockFirstSigil && slot === 0) continue;
        const extra = ctx.mirror[b.id] ?? 0;
        ctx.mirror[b.id] = 0;
        const times = 1 + worldExtra + extra;
        for (let t = 0; t < times; t++) {
          def.trigger(ctx, inst, slot, b);
          ctx.sigilTriggers++;
          fireAll(ctx, 'sigil', slot, b);
        }
      }
    }

    // 5) Ausrollen
    for (const b of active) {
      if (b.energy <= 0 || b.laps >= MAX_LAPS_PER_BALL) {
        b.active = false;
        landing.push(b);
      }
    }
  }

  ctx.tick++;
  ctx.at = 0;
  fireAll(ctx, 'spinEnd');
  if (stats.endFluch > 1) mulFluch(ctx, stats.endFluch, { k: 'pact', id: 'verdammnis' });
  if (demon?.mods.fluchFactor) mulFluch(ctx, demon.mods.fluchFactor, { k: 'demon' });

  const score = ctx.glut.mul(ctx.fluch).floor();
  log(ctx, 'end', 0);

  return {
    events: ctx.events,
    glut: ctx.glut,
    fluch: ctx.fluch,
    score,
    pocket: ctx.pocket ?? 0,
    hit: !!ctx.betHit,
    souls: ctx.souls,
    mainLaps: ctx.mainLaps,
    totalLaps: ctx.totalLaps,
    ghosts: ctx.ghostsSpawned,
  };
}
