import Decimal from 'break_eternity.js';
import { freshBuffs, SAVE_VERSION } from './run';
import { talentBonuses } from '../content/talents';
import { STARTER } from '../content/unlocks';
import type { MetaBonuses, RunState } from './types';

const RUN_KEY = 'teufelsrad.run.v1';
const META_KEY = 'teufelsrad.meta.v1';

export function serializeRun(run: RunState): string {
  return JSON.stringify(run, function (this: Record<string, unknown>, k, v) {
    const raw = this[k];
    return raw instanceof Decimal ? { $d: raw.toString() } : v;
  });
}

export function deserializeRun(json: string): RunState | null {
  try {
    const run = JSON.parse(json, (_k, v) => (v && typeof v === 'object' && '$d' in v ? new Decimal(v.$d) : v)) as RunState;
    if (!run || !Array.isArray(run.arcana)) return null;
    return migrateRun(run);
  } catch {
    return null;
  }
}

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** Hebt alte Spielstände auf die aktuelle Version */
export function migrateRun(run: RunState): RunState | null {
  if (run.version === 1) {
    run.wheel = 'euro';
    run.stake = 1;
    run.mode = 'normal';
    run.dailyKey = '';
    run.omens = [];
    run.potions = [];
    run.buffs = freshBuffs();
    run.version = 2;
  }
  return run.version === SAVE_VERSION ? run : null;
}

export function saveRun(run: RunState | null): void {
  const s = storage();
  if (!s) return;
  try {
    if (!run || run.phase === 'gameover') s.removeItem(RUN_KEY);
    else s.setItem(RUN_KEY, serializeRun(run));
  } catch {
    /* Speicher voll oder blockiert */
  }
}

export function loadRun(): RunState | null {
  const raw = storage()?.getItem(RUN_KEY);
  return raw ? deserializeRun(raw) : null;
}

// ---------------------------------------------------------------- Meta

export interface MetaState {
  version: 1;
  ash: number;
  upgrades: Record<string, number>;
  runs: number;
  bestCircle: number;
  bestSpin: string;
  victories: number;
  infinity: boolean;
  sound: boolean;
  speed: number;
  seen: string[];
  unlockedWheels: string[];
  /** Höchste gewonnene Höllenstufe je Kessel */
  wheelStakes: Record<string, number>;
  achievements: string[];
  dailies: Record<string, DailyRecord>;
  settings: Settings;
  insight: Insight;
  /** Letzte Runs (neueste zuerst) */
  history: RunRecord[];
  /** Summen über alle Runs */
  totals: Totals;
  /** Gekaufte Grimoire-Talente */
  talents: string[];
  /** Asche, die beim Umstieg auf den Talentbaum erstattet wurde (für einen Hinweis) */
  legacyRefund?: number;
}

export interface RunRecord {
  t: number;
  hero: string;
  wheel: string;
  stake: number;
  mode: string;
  circle: number;
  victory: boolean;
  rituals: number;
  bestSpin: string;
  arcana: string[];
  sigils: string[];
  cause: string;
}

export interface Totals {
  spins: number;
  rituals: number;
  hits: number;
  maxLaps: number;
  maxGhosts: number;
}

export const HISTORY_MAX = 25;

/** Erkenntnis-Fortschritt: freigeschalteter Karten-Pool */
export interface Insight {
  xp: number;
  unlocked: string[];
}

export interface DailyRecord {
  first: { circle: number; score: string };
  best: { circle: number; score: string };
  attempts: number;
}

export interface Settings {
  music: number;
  sfx: number;
  shake: boolean;
  reducedFx: boolean;
  haptics: boolean;
}

export const DEFAULT_META_STATE: MetaState = {
  version: 1,
  ash: 0,
  upgrades: {},
  runs: 0,
  bestCircle: 0,
  bestSpin: '0',
  victories: 0,
  infinity: false,
  sound: true,
  speed: 1,
  seen: [],
  unlockedWheels: ['euro'],
  wheelStakes: {},
  achievements: [],
  dailies: {},
  settings: { music: 0.6, sfx: 0.8, shake: true, reducedFx: false, haptics: true },
  insight: { xp: 0, unlocked: [...STARTER] },
  talents: [],
  history: [],
  totals: { spins: 0, rituals: 0, hits: 0, maxLaps: 0, maxGhosts: 0 },
};

/** Grimoire-Boni aus den gekauften Talenten */
export function metaBonuses(meta: MetaState): MetaBonuses {
  return talentBonuses(meta.talents ?? []);
}

/** Kosten der alten, stufenweisen Grimoire-Segnungen (vor dem Talentbaum) */
const LEGACY_COST: Record<string, (lvl: number) => number> = {
  startSouls: (l) => 4 + l * 4,
  lapGlut: (l) => 6 + l * 5,
  startSlots: (l) => 15 + l * 15,
  freeReroll: () => 20,
  extraArcanaOffer: () => 30,
};

/** Erstattet alte Segnungen als Asche, damit sie im Talentbaum neu verteilt werden können */
export function refundLegacyUpgrades(meta: MetaState): number {
  let refund = 0;
  for (const [id, lvl] of Object.entries(meta.upgrades ?? {})) {
    const cost = LEGACY_COST[id];
    if (!cost) continue;
    for (let l = 0; l < lvl; l++) refund += cost(l);
  }
  meta.ash += refund;
  meta.upgrades = {};
  return refund;
}

export function loadMeta(): MetaState {
  try {
    const raw = storage()?.getItem(META_KEY);
    if (!raw) return structuredClone(DEFAULT_META_STATE);
    const m = { ...structuredClone(DEFAULT_META_STATE), ...JSON.parse(raw) } as MetaState;
    m.settings = { ...DEFAULT_META_STATE.settings, ...m.settings };
    m.totals = { ...DEFAULT_META_STATE.totals, ...m.totals };
    if (!Array.isArray(m.history)) m.history = [];
    // Ältere Spielstände starten mit dem kleinen Start-Pool neu
    if (!m.insight?.unlocked) m.insight = { xp: 0, unlocked: [...STARTER] };
    // Umstieg auf den Talentbaum: alte Segnungen werden erstattet
    if (!Array.isArray(m.talents)) {
      m.talents = [];
      const refund = refundLegacyUpgrades(m);
      if (refund > 0) m.legacyRefund = refund;
    }
    return m;
  } catch {
    return structuredClone(DEFAULT_META_STATE);
  }
}

export function saveMeta(meta: MetaState): void {
  try {
    storage()?.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    /* ignorieren */
  }
}

/** Höchste spielbare Höllenstufe für einen Kessel */
export function maxStakeFor(meta: MetaState, wheel: string): number {
  return Math.min(5, (meta.wheelStakes[wheel] ?? 0) + 1);
}

/** Trägt ein Ergebnis in die Challenge-Historie ein */
export function recordChallenge(meta: MetaState, key: string, circle: number, score: string): DailyRecord {
  const cur = meta.dailies[key];
  const entry = { circle, score };
  if (!cur) {
    meta.dailies[key] = { first: entry, best: entry, attempts: 1 };
  } else {
    cur.attempts++;
    const better = circle > cur.best.circle || (circle === cur.best.circle && Number(score) > Number(cur.best.score));
    if (better) cur.best = entry;
  }
  return meta.dailies[key];
}

// ---------------------------------------------------------------- Export/Import

const EXPORT_PREFIX = 'TEUFELSRAD1:';

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b64: string): string {
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** Spielstand als kopierbarer Code (Meta-Fortschritt + laufender Run) */
export function exportSave(meta: MetaState, run: RunState | null): string {
  const payload = { meta, run: run && run.phase !== 'gameover' ? serializeRun(run) : null };
  return EXPORT_PREFIX + toBase64(JSON.stringify(payload));
}

/** Liest einen exportierten Code; null bei ungültigem Code */
export function parseSave(code: string): { meta: MetaState; run: RunState | null } | null {
  try {
    const trimmed = code.replace(/\s+/g, '');
    if (!trimmed.startsWith(EXPORT_PREFIX)) return null;
    const data = JSON.parse(fromBase64(trimmed.slice(EXPORT_PREFIX.length))) as { meta?: MetaState; run?: string | null };
    if (!data.meta || typeof data.meta.ash !== 'number' || !Array.isArray(data.meta.talents)) return null;
    const meta = { ...structuredClone(DEFAULT_META_STATE), ...data.meta } as MetaState;
    meta.settings = { ...DEFAULT_META_STATE.settings, ...meta.settings };
    meta.totals = { ...DEFAULT_META_STATE.totals, ...meta.totals };
    if (!Array.isArray(meta.history)) meta.history = [];
    const run = data.run ? deserializeRun(data.run) : null;
    return { meta, run };
  } catch {
    return null;
  }
}

/** Trägt einen beendeten Run in Chronik und Summen ein */
export function recordRun(meta: MetaState, run: RunState, cause: string): RunRecord {
  const rec: RunRecord = {
    t: Date.now(),
    hero: run.hero ?? 'wanderer',
    wheel: run.wheel,
    stake: run.stake,
    mode: run.mode,
    circle: run.circle,
    victory: run.phase === 'victory' || run.endless,
    rituals: run.stats.ritualsWon,
    bestSpin: run.stats.bestSpin.toString(),
    arcana: run.arcana.map((a) => a.id),
    sigils: run.sigils.filter((s): s is NonNullable<typeof s> => !!s).map((s) => s.id),
    cause,
  };
  meta.history = [rec, ...meta.history].slice(0, HISTORY_MAX);
  const t = meta.totals;
  t.spins += run.stats.spins;
  t.rituals += run.stats.ritualsWon;
  t.hits += run.stats.betsHit;
  t.maxLaps = Math.max(t.maxLaps, run.stats.maxLaps);
  t.maxGhosts = Math.max(t.maxGhosts, run.stats.maxGhosts);
  return rec;
}
