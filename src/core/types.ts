import type Decimal from 'break_eternity.js';
import type { Rng } from './rng';
import type { WheelDef } from './wheel';

export type BetKind =
  | 'red'
  | 'black'
  | 'even'
  | 'odd'
  | 'low'
  | 'high'
  | 'dozen1'
  | 'dozen2'
  | 'dozen3'
  | 'number';

export interface Bet {
  kind: BetKind;
  number?: number;
}

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export type Enchant = 'gold' | 'blood' | 'glass' | 'lucky' | 'ember';

export type GlyphId =
  | 'fool' | 'wand' | 'moon' | 'crown' | 'throne' | 'key' | 'heart' | 'chariot' | 'lion' | 'lantern'
  | 'wheel' | 'scales' | 'hanged' | 'skull' | 'cup' | 'devil' | 'tower' | 'star' | 'sun' | 'trumpet'
  | 'world' | 'witch' | 'shadow' | 'eye' | 'flame' | 'drop' | 'bolt' | 'mirror' | 'chain' | 'wisp'
  | 'coin' | 'echo' | 'pentagram' | 'dice' | 'hourglass' | 'snake' | 'candle' | 'feather' | 'horn'
  | 'bell' | 'book' | 'dagger' | 'rune' | 'infinity'
  | 'sword' | 'staff' | 'potion' | 'crystal' | 'moth' | 'raven' | 'altar' | 'magnet' | 'snow' | 'mask' | 'grave' | 'sickle';

export type Suit = 'staebe' | 'kelche' | 'schwerter' | 'muenzen';

export type Edition = 'folie' | 'holo' | 'poly' | 'negativ';

export type RunMode = 'normal' | 'daily' | 'weekly';

export interface ArcanaInst {
  uid: number;
  id: string;
  level: number;
  /** Frei nutzbarer Zustand, z. B. aufgeladene Werte */
  state: Record<string, number>;
  edition?: Edition;
}

export interface SigilInst {
  uid: number;
  id: string;
  level: number;
}

export interface PactInst {
  id: string;
  stacks: number;
}

/** Permanente Meta-Boni, beim Run-Start eingefroren */
export interface MetaBonuses {
  startSouls: number;
  startSlots: number;
  lapGlut: number;
  freeReroll: number;
  extraArcanaOffer: number;
}

export type ShopItem =
  | { kind: 'arcana'; id: string; price: number; sold: boolean; edition?: Edition }
  | { kind: 'potion'; id: string; price: number; sold: boolean }
  | { kind: 'sigil'; id: string; price: number; sold: boolean }
  | { kind: 'pact'; id: string; price: number; sold: boolean }
  | { kind: 'enchant'; enchant: Enchant; pocket: number; price: number; sold: boolean };

export interface ShopState {
  offers: ShopItem[];
  rerollCost: number;
  freeRerolls: number;
}

export interface RunStats {
  bestSpin: Decimal;
  bestRitual: Decimal;
  spins: number;
  ritualsWon: number;
  maxLaps: number;
  maxGhosts: number;
  betsHit: number;
}

export type Phase = 'ritual' | 'shop' | 'gameover' | 'victory';

/** Einmal-Effekte von Tränken für die nächste Drehung */
export interface Buffs {
  fluchMult: number;
  glutMult: number;
  ghosts: number;
  tempo: number;
  forceHit: boolean;
}

export interface RunState {
  version: number;
  wheel: string;
  stake: number;
  mode: RunMode;
  dailyKey: string;
  omens: string[];
  potions: string[];
  buffs: Buffs;
  seed: number;
  rngState: number;
  circle: number;
  ritual: number;
  endless: boolean;
  phase: Phase;
  souls: number;
  arcana: ArcanaInst[];
  sigils: (SigilInst | null)[];
  sigilUnlocked: number;
  pacts: PactInst[];
  enchants: Record<number, Enchant>;
  ritualScore: Decimal;
  target: Decimal;
  spinsLeft: number;
  demon: string | null;
  circleDemon: string;
  shop: ShopState | null;
  stats: RunStats;
  meta: MetaBonuses;
  uid: number;
  lastBet: Bet;
}

/** Abgeleitete Werte aus Pakten, Meta und Dämon */
export interface Stats {
  tempo: number;
  friction: number;
  frictionGrowth: number;
  lapGlut: number;
  baseFluch: number;
  spins: number;
  ghostCap: number;
  startGhosts: number;
  luck: number;
  arcanaSlots: number;
  shopArcana: number;
  interestCap: number;
  rerollDiscount: number;
  colorPay: number;
  parityPay: number;
  halfPay: number;
  dozenPay: number;
  numberPay: number;
  hellFluch: number;
  endFluch: number;
  ritualBonus: number;
  sellFull: boolean;
  upgradeDiscount: number;
  potionSlots: number;
  potionDiscount: number;
  editionChance: number;
  demonBonus: number;
  shopSigils: number;
  freeRerolls: number;
  priceAdd: number;
  targetMult: number;
  interestMax: number;
  rewardAdd: number;
}

export type Src =
  | { k: 'arcana'; i: number }
  | { k: 'sigil'; i: number }
  | { k: 'pocket' }
  | { k: 'bet' }
  | { k: 'pact'; id: string }
  | { k: 'base' }
  | { k: 'demon' }
  | { k: 'potion' };

export type Tone = 'glut' | 'fluch' | 'xfluch' | 'souls' | 'ghost' | 'info' | 'bad' | 'tempo';

export type SpinEventType = 'start' | 'lap' | 'fx' | 'land' | 'ghostSpawn' | 'ghostLand' | 'end';

export interface SpinEvent {
  type: SpinEventType;
  tick: number;
  /** Phase innerhalb der Umrundung (0..1) */
  at: number;
  ball: number;
  src?: Src;
  text?: string;
  tone?: Tone;
  glut: Decimal;
  fluch: Decimal;
  pocket?: number;
  hit?: boolean;
  seq: number;
}

export interface Ball {
  id: number;
  ghost: boolean;
  energy: number;
  laps: number;
  active: boolean;
  startTick: number;
  pocket: number | null;
  /** Reibungsfaktor (Frostsiegel) */
  fric: number;
}

export interface SpinCtx {
  run: RunState;
  rng: Rng;
  bet: Bet;
  wheel: WheelDef;
  /** Arkana-Indizes, die in dieser Drehung ausgelöst haben (für Editionen) */
  triggered: Set<number>;
  firstSpin: boolean;
  lastSpin: boolean;
  stats: Stats;
  demon: DemonDef | null;
  glut: Decimal;
  fluch: Decimal;
  events: SpinEvent[];
  seq: number;
  tick: number;
  at: number;
  balls: Ball[];
  ghostsSpawned: number;
  mainLaps: number;
  totalLaps: number;
  sigilTriggers: number;
  pocket: number | null;
  betHit: boolean | null;
  souls: number;
  sigilSouls: number;
  /** Ausstehende Spiegelungen je Kugel */
  mirror: Record<number, number>;
  depth: number;
  counters: Record<string, number>;
  /** Aktive Arkana (Dämon kann eine deaktivieren) */
  activeArcana: boolean[];
  quiet: boolean;
}

export interface ArcanaDef {
  id: string;
  name: string;
  numeral: string;
  glyph: GlyphId;
  rarity: Rarity;
  cost: number;
  suit?: Suit;
  desc: (level: number, inst?: ArcanaInst) => string;
  hooks: ArcanaHooks;
  /** Passiver Wert-Modifikator */
  mod?: (s: Stats, inst: ArcanaInst) => void;
  /** Zusätzlicher Verkaufswert */
  sellBonus?: (inst: ArcanaInst) => number;
}

type Hook<A extends unknown[] = []> = (ctx: SpinCtx, self: ArcanaInst, idx: number, ...args: A) => boolean;

export interface ArcanaHooks {
  spinStart?: Hook;
  lap?: Hook<[Ball]>;
  sigil?: Hook<[number, Ball]>;
  land?: Hook<[number]>;
  betHit?: Hook;
  betMiss?: Hook;
  ghost?: Hook<[Ball]>;
  ghostLand?: Hook<[number, Ball]>;
  spinEnd?: Hook;
  ritualEnd?: (run: RunState, self: ArcanaInst, idx: number, log: RewardLine[]) => void;
}

export type ArcanaHookName = Exclude<keyof ArcanaHooks, 'ritualEnd'>;

export interface SigilDef {
  id: string;
  name: string;
  glyph: GlyphId;
  rarity: Rarity;
  cost: number;
  desc: (level: number) => string;
  trigger: (ctx: SpinCtx, inst: SigilInst, slot: number, ball: Ball) => void;
}

export interface PactDef {
  id: string;
  name: string;
  glyph: GlyphId;
  cost: number;
  max: number;
  desc: string;
  mod?: (s: Stats, stacks: number) => void;
  /** Einmaliger Effekt beim Kauf */
  onBuy?: (run: RunState) => void;
}

export interface DemonMods {
  noNumberBets?: boolean;
  blockFirstSigil?: boolean;
  fluchFactor?: number;
  noGhosts?: boolean;
  frictionAdd?: number;
  disableRightmost?: boolean;
  spinsAdd?: number;
  sigilEveryOther?: boolean;
  targetMult?: number;
  glutFactor?: number;
  halfPayout?: boolean;
  shuffleArcana?: boolean;
  reverseSigils?: boolean;
  noSouls?: boolean;
}

export interface DemonDef {
  id: string;
  name: string;
  title: string;
  desc: string;
  glyph: GlyphId;
  mods: DemonMods;
}

export interface RewardLine {
  label: string;
  souls: number;
}

export interface SpinResult {
  events: SpinEvent[];
  glut: Decimal;
  fluch: Decimal;
  score: Decimal;
  pocket: number;
  hit: boolean;
  souls: number;
  mainLaps: number;
  totalLaps: number;
  ghosts: number;
}
