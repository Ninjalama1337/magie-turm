import Decimal from 'break_eternity.js';
import { resonance } from '../content/elements';
import { SIGIL_BY_ID } from '../content/sigils';
import { fullMeta } from '../content/talents';
import { addFluch, addGlut, addSouls, info, log, MAX_LAPS_PER_BALL, mulFluch, roll, spawnGhost } from './effects';
import { fireAll, hasArcana } from './hooks';
import { Rng } from './rng';
import { computeStats, currentDemon } from './stats';
import type { Ball, Bet, RunState, SpinCtx, SpinResult, Stats } from './types';
import {
  betRangeLabels,
  colorOf,
  dozenOf,
  EURO,
  isEven,
  isHell,
  isHigh,
  isLow,
  isOdd,
  neighbours,
  pocketLabel,
  pocketValue,
  wheelOf,
  type WheelDef,
} from './wheel';

export function betLabel(bet: Bet, w: WheelDef = EURO): string {
  const r = betRangeLabels(w);
  switch (bet.kind) {
    case 'red':
      return 'Rot';
    case 'black':
      return 'Schwarz';
    case 'even':
      return 'Gerade';
    case 'odd':
      return 'Ungerade';
    case 'low':
      return r.low;
    case 'high':
      return r.high;
    case 'dozen1':
      return r.d1;
    case 'dozen2':
      return r.d2;
    case 'dozen3':
      return r.d3;
    case 'number':
      return `Zahl ${pocketLabel(bet.number ?? 0)}`;
  }
}

export function betPayout(bet: Bet, s: Stats, halved = false): number {
  let p: number;
  switch (bet.kind) {
    case 'red':
    case 'black':
      p = s.colorPay;
      break;
    case 'even':
    case 'odd':
      p = s.parityPay;
      break;
    case 'low':
    case 'high':
      p = s.halfPay;
      break;
    case 'dozen1':
    case 'dozen2':
    case 'dozen3':
      p = s.dozenPay;
      break;
    case 'number':
      p = s.numberPay;
      break;
  }
  return halved ? 1 + (p - 1) / 2 : p;
}

export function betMatches(bet: Bet, pocket: number, sternRange = 0, w: WheelDef = EURO): boolean {
  switch (bet.kind) {
    case 'red':
      return colorOf(pocket, w) === 'red';
    case 'black':
      return colorOf(pocket, w) === 'black';
    case 'even':
      return isEven(pocket);
    case 'odd':
      return isOdd(pocket);
    case 'low':
      return isLow(pocket, w);
    case 'high':
      return isHigh(pocket, w);
    case 'dozen1':
      return dozenOf(pocket, w) === 1;
    case 'dozen2':
      return dozenOf(pocket, w) === 2;
    case 'dozen3':
      return dozenOf(pocket, w) === 3;
    case 'number': {
      const n = bet.number ?? 0;
      return pocket === n || (sternRange > 0 && neighbours(n, sternRange, w).includes(pocket));
    }
  }
}

/** Anzahl der Fächer, die einen Einsatz treffen */
export function betCoverage(bet: Bet, w: WheelDef, stern = 0): number {
  return w.order.filter((p) => betMatches(bet, p, stern, w)).length;
}

export function sternRange(level: number): number {
  return level > 0 ? 1 + Math.floor((level - 1) / 2) : 0;
}

export function isBetAllowed(run: RunState, bet: Bet): boolean {
  if (bet.kind === 'number' && currentDemon(run)?.mods.noNumberBets) return false;
  if (bet.kind === 'number' && !wheelOf(run).order.includes(bet.number ?? 0)) return false;
  return true;
}

function friction(ctx: SpinCtx, b: Ball): number {
  return (ctx.stats.friction + ctx.stats.frictionGrowth * b.laps) * b.fric;
}

function rollPocket(ctx: SpinCtx, force: boolean): number {
  const order = ctx.wheel.order;
  if (force) {
    const stern = sternRange(hasArcana(ctx, 'stern'));
    const hits = order.filter((p) => betMatches(ctx.bet, p, stern, ctx.wheel));
    if (hits.length) return hits[ctx.rng.int(hits.length)];
  }
  return order[ctx.rng.int(order.length)];
}

function landMain(ctx: SpinCtx, b: Ball): void {
  const pocket = rollPocket(ctx, ctx.run.buffs.forceHit);
  b.pocket = pocket;
  ctx.pocket = pocket;
  log(ctx, 'land', b.id, { pocket });

  const src = { k: 'pocket' } as const;
  if (pocketValue(pocket) > 0) addGlut(ctx, pocketValue(pocket), src);
  else if (isHell(pocket) && ctx.stats.hellFluch > 1) mulFluch(ctx, ctx.stats.hellFluch, src);

  const ench = ctx.run.enchants[pocket];
  if (ench) {
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

  const hit = betMatches(ctx.bet, pocket, sternRange(hasArcana(ctx, 'stern')), ctx.wheel);
  ctx.betHit = hit;
  if (hit) {
    mulFluch(ctx, betPayout(ctx.bet, ctx.stats, !!ctx.demon?.mods.halfPayout), { k: 'bet' });
    fireAll(ctx, 'betHit');
  } else {
    info(ctx, 'Verfehlt', { k: 'bet' }, 0, 'bad');
    fireAll(ctx, 'betMiss');
  }
}

function landGhost(ctx: SpinCtx, b: Ball): void {
  const pocket = rollPocket(ctx, false);
  b.pocket = pocket;
  log(ctx, 'ghostLand', b.id, { pocket });
  if (pocketValue(pocket) > 0) addGlut(ctx, pocketValue(pocket), { k: 'pocket' }, b.id);
  fireAll(ctx, 'ghostLand', pocket, b);
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
  if (demon?.mods.shuffleArcana && run.arcana.length > 1) rng.shuffle(run.arcana);
  const activeArcana = run.arcana.map(() => true);
  if (demon?.mods.disableRightmost && activeArcana.length) activeArcana[activeArcana.length - 1] = false;
  const buffs = run.buffs;

  const ctx: SpinCtx = {
    run,
    rng,
    bet,
    wheel: wheelOf(run),
    triggered: new Set(),
    firstSpin: run.spinsLeft >= stats.spins,
    lastSpin: run.spinsLeft <= 1,
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
    energy: stats.tempo * (0.85 + rng.next() * 0.3) + buffs.tempo,
    laps: 0,
    active: true,
    startTick: 1,
    pocket: null,
    fric: 1,
  };
  ctx.balls.push(main);
  log(ctx, 'start', 0);
  if (buffs.tempo > 0) info(ctx, `+${buffs.tempo} Tempo`, { k: 'potion' }, 0, 'tempo');

  fireAll(ctx, 'spinStart');
  for (let g = 0; g < stats.startGhosts; g++) spawnGhost(ctx, { k: 'pact', id: 'zweitekugel' });
  if (buffs.ghosts > 0) {
    ctx.stats = { ...stats, ghostCap: stats.ghostCap + buffs.ghosts };
    for (let g = 0; g < buffs.ghosts; g++) spawnGhost(ctx, { k: 'potion' });
  }

  const worldLevel = hasArcana(ctx, 'welt');
  const worldExtra = worldLevel > 0 ? 1 + Math.floor(worldLevel / 3) : 0;
  const ghostKnight = hasArcana(ctx, 'ritter_kelche');
  const ghostExtra = ghostKnight > 0 ? (ghostKnight >= 4 ? 2 : 1) : 0;
  const sigilCount = Math.min(run.sigilUnlocked, run.sigils.length);
  const slotOrder = Array.from({ length: sigilCount }, (_, i) => i);
  if (demon?.mods.reverseSigils) slotOrder.reverse();
  // Resonanz: Siegel neben einem Siegel desselben Elements wirken eine Stufe stärker
  const reso = resonance(run);
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
    for (let k = 0; k < slotOrder.length; k++) {
      const slot = slotOrder[k];
      const inst = run.sigils[slot];
      if (!inst) continue;
      const def = SIGIL_BY_ID[inst.id];
      if (!def) continue;
      const eff = reso[slot] ? { ...inst, level: inst.level + 1 } : inst;
      ctx.at = (k + 0.5) / 8;
      for (const b of active) {
        if (!b.active) continue;
        if (demon?.mods.sigilEveryOther && b.laps % 2 === 1) continue;
        if (demon?.mods.blockFirstSigil && slot === 0) continue;
        const extra = ctx.mirror[b.id] ?? 0;
        ctx.mirror[b.id] = 0;
        const times = 1 + worldExtra + extra + (b.ghost ? ghostExtra : 0);
        for (let t = 0; t < times; t++) {
          def.trigger(ctx, eff, slot, b);
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

  // Editionen der Arkana, die in dieser Drehung ausgelöst haben
  run.arcana.forEach((a, i) => {
    if (!a.edition || !ctx.triggered.has(i) || !ctx.activeArcana[i]) return;
    const s = { k: 'arcana', i } as const;
    if (a.edition === 'folie') addGlut(ctx, 50, s);
    else if (a.edition === 'holo') addFluch(ctx, 8, s);
    else if (a.edition === 'poly') mulFluch(ctx, 1.5, s);
  });

  if (stats.endGlut > 1) {
    ctx.glut = ctx.glut.mul(stats.endGlut).floor();
    info(ctx, `×${stats.endGlut} Glut`.replace('.', ','), { k: 'base' }, 0, 'glut');
  }
  if (buffs.glutMult > 1) {
    ctx.glut = ctx.glut.mul(buffs.glutMult);
    info(ctx, `×${buffs.glutMult} Glut`, { k: 'potion' }, 0, 'glut');
  }
  if (buffs.fluchMult > 1) mulFluch(ctx, buffs.fluchMult, { k: 'potion' });
  const meta = fullMeta(run.meta);
  if (ctx.firstSpin && meta.firstSpinFluch > 1) mulFluch(ctx, meta.firstSpinFluch, { k: 'pact', id: 'grimoire' });
  if (ctx.lastSpin && meta.lastSpinFluch > 1) mulFluch(ctx, meta.lastSpinFluch, { k: 'pact', id: 'grimoire' });
  if (stats.endFluch > 1) mulFluch(ctx, stats.endFluch, { k: 'pact', id: 'verdammnis' });
  if (demon?.mods.fluchFactor) mulFluch(ctx, demon.mods.fluchFactor, { k: 'demon' });
  if (demon?.mods.glutFactor) {
    ctx.glut = ctx.glut.mul(demon.mods.glutFactor).floor();
    info(ctx, `×${demon.mods.glutFactor} Glut`.replace('.', ','), { k: 'demon' }, 0, 'bad');
  }
  if (demon?.mods.noSouls) ctx.souls = 0;

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
    sigilTriggers: ctx.sigilTriggers,
  };
}
