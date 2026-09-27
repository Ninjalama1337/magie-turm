import Decimal from 'break_eternity.js';
import { ARCANA, ARCANA_BY_ID } from '../content/arcana';
import { heroOf } from '../content/heroes';
import { EMPTY_META, fullMeta } from '../content/talents';
import { DEMON_BY_ID, DEMONS, LUCIFER } from '../content/demons';
import { Rng } from './rng';
import { generateShop } from './shop';
import { simulateSpin } from './spin';
import { computeStats } from './stats';
import { OMEN_BY_ID } from '../content/omens';
import type { Bet, Buffs, MetaBonuses, RewardLine, RunMode, RunState, SpinResult } from './types';
import { wheelOf } from './wheel';

export const SAVE_VERSION = 2;
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

const BASE_TARGETS = [100, 330, 1000, 3500, 12500, 45000, 180000, 750000, 3200000];
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

/** Ziel eines (auch zukünftigen) Rituals inkl. Stufe, Omen und Dämon */
export function ritualTarget(run: RunState, circle: number, ritual: number): Decimal {
  let mult = computeStats(run, false).targetMult;
  if (ritual === 2) mult *= DEMON_BY_ID[run.circleDemon]?.mods.targetMult ?? 1;
  return targetFor(circle, ritual).mul(mult).floor();
}

/** Dämonen, die erst ab dem 3. Kreis erscheinen */
const HARSH_DEMONS = new Set(['azazel', 'baal', 'paimon', 'belial', 'leviathan']);

export function demonForCircle(circle: number, rng: Rng): string {
  if (circle % FINAL_CIRCLE === 0) return LUCIFER.id;
  const pool = circle <= 2 ? DEMONS.filter((d) => !HARSH_DEMONS.has(d.id)) : DEMONS;
  return rng.pick(pool).id;
}

export const DEFAULT_META: MetaBonuses = EMPTY_META;

export function freshBuffs(): Buffs {
  return { fluchMult: 1, glutMult: 1, ghosts: 0, tempo: 0, forceHit: false };
}

export interface RunOptions {
  wheel?: string;
  stake?: number;
  mode?: RunMode;
  dailyKey?: string;
  omens?: string[];
  /** Verfügbarer Karten-Pool (Freischaltungen); ohne Angabe ist alles verfügbar */
  pool?: string[];
  /** Beschwörer; Herausforderungen nutzen immer den Wanderer */
  hero?: string;
}

export function newRun(seed: number, metaIn: Partial<MetaBonuses> = DEFAULT_META, opts: RunOptions = {}): RunState {
  const meta = fullMeta(metaIn);
  const rng = new Rng(seed);
  const run: RunState = {
    version: SAVE_VERSION,
    wheel: opts.wheel ?? 'euro',
    stake: opts.stake ?? 1,
    mode: opts.mode ?? 'normal',
    dailyKey: opts.dailyKey ?? '',
    omens: opts.omens ?? [],
    potions: [],
    buffs: freshBuffs(),
    pool: opts.pool ? [...opts.pool] : undefined,
    hero: opts.hero && opts.hero !== 'wanderer' ? opts.hero : undefined,
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
  heroOf(run).start?.(run, rng);
  wheelOf(run).start?.(run);
  // Grimoire: Reliquie – zufällige seltene Arkana aus dem freigeschalteten Pool
  for (let k = 0; k < meta.startRare; k++) {
    const pool = ARCANA.filter(
      (a) => a.rarity === 'rare' && (!run.pool || run.pool.includes(`arcana:${a.id}`)) && !run.arcana.some((o) => o.id === a.id),
    );
    if (pool.length) run.arcana.push({ uid: run.uid++, id: rng.pick(pool).id, level: 1, state: {} });
  }
  for (const id of run.omens) OMEN_BY_ID[id]?.start?.(run);
  run.circleDemon = demonForCircle(1, rng);
  run.rngState = rng.state;
  startRitual(run);
  return run;
}

export function startRitual(run: RunState): void {
  run.demon = run.ritual === 2 ? run.circleDemon : null;
  run.target = ritualTarget(run, run.circle, run.ritual);
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
  run.buffs = freshBuffs();
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
  lines.push({ label: ritualName(run), souls: Math.max(1, 3 + run.ritual + stats.rewardAdd) });
  if (run.ritual === 2 && stats.demonBonus > 0) lines.push({ label: 'Dämonenbann', souls: stats.demonBonus });
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
