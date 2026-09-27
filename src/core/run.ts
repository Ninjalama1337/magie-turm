import Decimal from 'break_eternity.js';
import { ARCANA_BY_ID } from '../content/arcana';
import { DEMONS, LUCIFER } from '../content/demons';
import { Rng } from './rng';
import { generateShop } from './shop';
import { simulateSpin } from './spin';
import { computeStats } from './stats';
import type { Bet, MetaBonuses, RewardLine, RunState, SpinResult } from './types';

export const SAVE_VERSION = 1;
export const SIGIL_SLOTS = 8;
export const MAX_LEVEL = 5;
export const FINAL_CIRCLE = 9;

export const CIRCLE_NAMES = [
  'Vorhölle',
  'Wollust',
  'Völlerei',
  'Gier',
  'Zorn',
  'Ketzerei',
  'Gewalt',
  'Betrug',
  'Verrat',
];

const BASE_TARGETS = [100, 400, 1500, 6000, 25000, 100000, 400000, 1500000, 6000000];
const RITUAL_MULT = [1, 1.5, 2];

export function circleName(c: number): string {
  return c <= FINAL_CIRCLE ? CIRCLE_NAMES[c - 1] : `Jenseits ${c - FINAL_CIRCLE}`;
}

export function ritualName(run: RunState, ritual = run.ritual): string {
  if (ritual === 0) return 'Kleines Ritual';
  if (ritual === 1) return 'Großes Ritual';
  return 'Dämonenritual';
}

export function targetFor(circle: number, ritual: number): Decimal {
  const mult = RITUAL_MULT[ritual] ?? 2;
  if (circle <= FINAL_CIRCLE) return new Decimal(BASE_TARGETS[circle - 1] * mult);
  const k = circle - FINAL_CIRCLE;
  // Im Jenseits wächst das Ziel super-exponentiell – bis zur Unendlichkeit.
  const exp = 1.3 * k + 0.22 * k * k + (k > 20 ? Math.pow(1.12, k - 20) * 4 : 0);
  return new Decimal(BASE_TARGETS[FINAL_CIRCLE - 1] * mult).mul(Decimal.pow(10, exp)).floor();
}

export function demonForCircle(circle: number, rng: Rng): string {
  if (circle % FINAL_CIRCLE === 0) return LUCIFER.id;
  return rng.pick(DEMONS).id;
}

export const DEFAULT_META: MetaBonuses = { startSouls: 0, startSlots: 0, lapGlut: 0, freeReroll: 0, extraArcanaOffer: 0 };

export function newRun(seed: number, meta: MetaBonuses = DEFAULT_META): RunState {
  const rng = new Rng(seed);
  const run: RunState = {
    version: SAVE_VERSION,
    seed,
    rngState: 0,
    circle: 1,
    ritual: 0,
    endless: false,
    phase: 'ritual',
    souls: 4 + meta.startSouls,
    arcana: [],
    sigils: Array.from({ length: SIGIL_SLOTS }, () => null),
    sigilUnlocked: Math.min(SIGIL_SLOTS, 3 + meta.startSlots),
    pacts: [],
    enchants: {},
    ritualScore: new Decimal(0),
    target: new Decimal(0),
    spinsLeft: 0,
    demon: null,
    circleDemon: '',
    shop: null,
    stats: {
      bestSpin: new Decimal(0),
      bestRitual: new Decimal(0),
      spins: 0,
      ritualsWon: 0,
      maxLaps: 0,
      maxGhosts: 0,
      betsHit: 0,
    },
    meta: { ...meta },
    uid: 1,
    lastBet: { kind: 'red' },
  };
  run.sigils[0] = { uid: run.uid++, id: 'glut', level: 1 };
  run.circleDemon = demonForCircle(1, rng);
  run.rngState = rng.state;
  startRitual(run);
  return run;
}

export function startRitual(run: RunState): void {
  run.demon = run.ritual === 2 ? run.circleDemon : null;
  run.target = targetFor(run.circle, run.ritual);
  run.spinsLeft = computeStats(run).spins;
  run.ritualScore = new Decimal(0);
  run.phase = 'ritual';
  run.shop = null;
}

export type SpinOutcome = 'continue' | 'won' | 'lost';

export function withRng<T>(run: RunState, fn: (rng: Rng) => T): T {
  const rng = new Rng(1);
  rng.state = run.rngState;
  const out = fn(rng);
  run.rngState = rng.state;
  return out;
}

export function spin(run: RunState, bet: Bet, quiet = false): { result: SpinResult; outcome: SpinOutcome } {
  if (run.phase !== 'ritual' || run.spinsLeft <= 0) throw new Error('Kein Ritual aktiv');
  run.lastBet = { ...bet };
  const result = withRng(run, (rng) => simulateSpin(run, bet, rng, { quiet }));
  run.ritualScore = run.ritualScore.add(result.score);
  run.souls += result.souls;
  run.spinsLeft--;
  const st = run.stats;
  st.spins++;
  if (result.hit) st.betsHit++;
  if (result.score.gt(st.bestSpin)) st.bestSpin = result.score;
  st.maxLaps = Math.max(st.maxLaps, result.mainLaps);
  st.maxGhosts = Math.max(st.maxGhosts, result.ghosts);

  let outcome: SpinOutcome = 'continue';
  if (run.ritualScore.gte(run.target)) outcome = 'won';
  else if (run.spinsLeft <= 0) outcome = 'lost';
  if (outcome === 'lost') run.phase = 'gameover';
  return { result, outcome };
}

/** Schließt ein gewonnenes Ritual ab, zahlt Belohnungen aus und öffnet den Basar. */
export function finishRitual(run: RunState): RewardLine[] {
  const stats = computeStats(run);
  const lines: RewardLine[] = [];
  lines.push({ label: ritualName(run), souls: 3 + run.ritual });
  if (run.spinsLeft > 0) lines.push({ label: `Übrige Drehungen (${run.spinsLeft})`, souls: run.spinsLeft });
  const interest = Math.min(Math.floor(run.souls / 5), stats.interestCap);
  if (interest > 0) lines.push({ label: 'Zinsen (1 je 5 Seelen)', souls: interest });
  if (stats.ritualBonus > 0) lines.push({ label: 'Pakt der Gier', souls: stats.ritualBonus });

  // Arkana-Effekte am Ritualende (von rechts nach links, damit „Der Tod“ stabil bleibt)
  for (let i = run.arcana.length - 1; i >= 0; i--) {
    const inst = run.arcana[i];
    ARCANA_BY_ID[inst.id]?.hooks.ritualEnd?.(run, inst, i, lines);
  }

  const total = lines.reduce((s, l) => s + l.souls, 0);
  run.souls += total;
  run.stats.ritualsWon++;
  if (run.ritualScore.gt(run.stats.bestRitual)) run.stats.bestRitual = run.ritualScore;

  const lastRitual = run.ritual === 2;
  if (lastRitual && run.circle === FINAL_CIRCLE && !run.endless) {
    run.phase = 'victory';
    return lines;
  }
  run.phase = 'shop';
  run.demon = null;
  run.shop = withRng(run, (rng) => generateShop(run, rng));
  return lines;
}

export function continueEndless(run: RunState): void {
  run.endless = true;
  run.phase = 'shop';
  run.demon = null;
  run.shop = withRng(run, (rng) => generateShop(run, rng));
}

/** Nächstes Ritual nach dem Basar */
export function nextRitual(run: RunState): void {
  run.ritual++;
  if (run.ritual > 2) {
    run.ritual = 0;
    run.circle++;
    run.circleDemon = withRng(run, (rng) => demonForCircle(run.circle, rng));
  }
  startRitual(run);
}

/** Asche (Meta-Währung) für einen beendeten Run */
export function ashFor(run: RunState): number {
  const base = (run.circle - 1) * 3 + run.stats.ritualsWon;
  return base + (run.phase === 'victory' || run.endless ? 10 : 0);
}
