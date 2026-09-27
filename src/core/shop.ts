import { ARCANA, ARCANA_BY_ID } from '../content/arcana';
import { ENCHANTS } from '../content/demons';
import { PACTS, PACT_BY_ID } from '../content/pacts';
import { SIGILS, SIGIL_BY_ID } from '../content/sigils';
import type { Rng } from './rng';
import { computeStats } from './stats';
import type { Rarity, RunState, ShopItem, ShopState } from './types';
import { POTIONS, POTION_BY_ID } from '../content/potions';
import type { Edition } from './types';
import { wheelOf } from './wheel';

const MAX_LEVEL = 5;

const RARITY_WEIGHT: Record<Rarity, number> = { common: 60, uncommon: 30, rare: 10, legendary: 2 };

function rarityWeight(r: Rarity, circle: number): number {
  const w = RARITY_WEIGHT[r];
  if (r === 'rare') return w + circle * 1.5;
  if (r === 'legendary') return w + circle * 0.5;
  return w;
}

function rollArcana(run: RunState, rng: Rng, exclude: Set<string>): ShopItem | null {
  const pool = ARCANA.filter((a) => !exclude.has(a.id) && !run.arcana.some((o) => o.id === a.id));
  if (!pool.length) return null;
  const def = rng.weighted(pool, (a) => rarityWeight(a.rarity, run.circle));
  exclude.add(def.id);
  const stats = computeStats(run, false);
  let edition: Edition | undefined;
  if (rng.chance(stats.editionChance)) edition = rng.weighted(EDITIONS, (e) => EDITION_WEIGHT[e]);
  const price = def.cost + stats.priceAdd + (edition ? EDITION_PRICE[edition] : 0);
  return { kind: 'arcana', id: def.id, price, sold: false, edition };
}

function rollSigil(run: RunState, rng: Rng, exclude: Set<string>): ShopItem | null {
  const pool = SIGILS.filter((s) => {
    if (exclude.has(s.id)) return false;
    const own = run.sigils.find((o) => o?.id === s.id);
    return !own || own.level < MAX_LEVEL;
  });
  if (!pool.length) return null;
  const def = rng.weighted(pool, (s) => rarityWeight(s.rarity, run.circle));
  exclude.add(def.id);
  return { kind: 'sigil', id: def.id, price: def.cost + computeStats(run, false).priceAdd, sold: false };
}

function rollCards(run: RunState, rng: Rng): ShopItem[] {
  const stats = computeStats(run, false);
  const out: ShopItem[] = [];
  const exA = new Set<string>();
  const exS = new Set<string>();
  for (let i = 0; i < stats.shopArcana; i++) {
    const it = rollArcana(run, rng, exA);
    if (it) out.push(it);
  }
  for (let i = 0; i < stats.shopSigils; i++) {
    const it = rollSigil(run, rng, exS);
    if (it) out.push(it);
  }
  return out;
}

export const EDITIONS: Edition[] = ['folie', 'holo', 'poly', 'negativ'];
const EDITION_WEIGHT: Record<Edition, number> = { folie: 45, holo: 30, poly: 15, negativ: 10 };
const EDITION_PRICE: Record<Edition, number> = { folie: 2, holo: 3, poly: 5, negativ: 5 };

export function generateShop(run: RunState, rng: Rng): ShopState {
  const stats = computeStats(run, false);
  const offers = rollCards(run, rng);
  const pacts = PACTS.filter((p) => (run.pacts.find((o) => o.id === p.id)?.stacks ?? 0) < p.max);
  if (pacts.length) {
    const p = rng.pick(pacts);
    offers.push({ kind: 'pact', id: p.id, price: p.cost + stats.priceAdd, sold: false });
  }
  const potions = rng.shuffle([...POTIONS]).slice(0, 2);
  for (const p of potions) {
    offers.push({ kind: 'potion', id: p.id, price: Math.max(1, p.cost + stats.priceAdd - stats.potionDiscount), sold: false });
  }
  const ench = rng.pick(ENCHANTS);
  const free = wheelOf(run).order.filter((n) => run.enchants[n] !== ench.id);
  offers.push({ kind: 'enchant', enchant: ench.id, pocket: rng.pick(free), price: ench.price + stats.priceAdd, sold: false });
  return { offers, rerollCost: 2, freeRerolls: stats.freeRerolls };
}

export function rerollPrice(run: RunState): number {
  if (!run.shop) return 0;
  if (run.shop.freeRerolls > 0) return 0;
  return Math.max(0, run.shop.rerollCost - computeStats(run, false).rerollDiscount);
}

export function reroll(run: RunState, rng: Rng): boolean {
  const shop = run.shop;
  if (!shop) return false;
  const price = rerollPrice(run);
  if (run.souls < price) return false;
  run.souls -= price;
  if (shop.freeRerolls > 0) shop.freeRerolls--;
  else shop.rerollCost++;
  const keep = shop.offers.filter((o) => o.kind === 'pact' || o.kind === 'enchant' || o.kind === 'potion');
  shop.offers = [...rollCards(run, rng), ...keep];
  return true;
}

export type BuyCheck = { ok: true } | { ok: false; reason: string };

export function canBuy(run: RunState, item: ShopItem): BuyCheck {
  if (item.sold) return { ok: false, reason: 'Verkauft' };
  if (run.souls < item.price) return { ok: false, reason: 'Zu wenig Seelen' };
  if (item.kind === 'arcana') {
    if (item.edition !== 'negativ' && run.arcana.length >= computeStats(run, false).arcanaSlots)
      return { ok: false, reason: 'Keine freie Arkana-Stelle' };
  } else if (item.kind === 'sigil') {
    const own = run.sigils.find((s) => s?.id === item.id);
    if (own) {
      if (own.level >= MAX_LEVEL) return { ok: false, reason: 'Maximale Stufe' };
    } else if (freeSigilSlot(run) < 0) return { ok: false, reason: 'Keine freie Raute' };
  } else if (item.kind === 'potion') {
    if (run.potions.length >= computeStats(run, false).potionSlots) return { ok: false, reason: 'Trank-Plätze voll' };
  } else if (item.kind === 'pact') {
    const own = run.pacts.find((p) => p.id === item.id);
    if (own && own.stacks >= PACT_BY_ID[item.id].max) return { ok: false, reason: 'Maximum erreicht' };
  }
  return { ok: true };
}

export function freeSigilSlot(run: RunState): number {
  for (let i = 0; i < run.sigilUnlocked; i++) if (!run.sigils[i]) return i;
  return -1;
}

export function buy(run: RunState, index: number): boolean {
  const item = run.shop?.offers[index];
  if (!item || !canBuy(run, item).ok) return false;
  run.souls -= item.price;
  item.sold = true;
  switch (item.kind) {
    case 'arcana':
      run.arcana.push({ uid: run.uid++, id: item.id, level: 1, state: {}, edition: item.edition });
      break;
    case 'potion':
      run.potions.push(item.id);
      break;
    case 'sigil': {
      const own = run.sigils.find((s) => s?.id === item.id);
      if (own) own.level++;
      else run.sigils[freeSigilSlot(run)] = { uid: run.uid++, id: item.id, level: 1 };
      break;
    }
    case 'pact': {
      const own = run.pacts.find((p) => p.id === item.id);
      if (own) own.stacks++;
      else run.pacts.push({ id: item.id, stacks: 1 });
      PACT_BY_ID[item.id].onBuy?.(run);
      break;
    }
    case 'enchant':
      run.enchants[item.pocket] = item.enchant;
      break;
  }
  return true;
}

export function arcanaSellValue(run: RunState, i: number): number {
  const a = run.arcana[i];
  const def = ARCANA_BY_ID[a.id];
  const base = computeStats(run, false).sellFull ? def.cost : Math.floor(def.cost / 2);
  return Math.max(1, base + (a.level - 1) + (def.sellBonus?.(a) ?? 0));
}

export function sellArcana(run: RunState, i: number): boolean {
  if (!run.arcana[i]) return false;
  run.souls += arcanaSellValue(run, i);
  run.arcana.splice(i, 1);
  return true;
}

export function sigilSellValue(run: RunState, slot: number): number {
  const s = run.sigils[slot];
  if (!s) return 0;
  return Math.max(1, Math.floor(SIGIL_BY_ID[s.id].cost / 2) * s.level);
}

export function sellSigil(run: RunState, slot: number): boolean {
  if (!run.sigils[slot]) return false;
  run.souls += sigilSellValue(run, slot);
  run.sigils[slot] = null;
  return true;
}

export function upgradePrice(run: RunState, i: number): number {
  const a = run.arcana[i];
  if (!a) return Infinity;
  const def = ARCANA_BY_ID[a.id];
  const disc = computeStats(run, false).upgradeDiscount;
  return Math.max(1, Math.ceil((def.cost * 0.75 + 2 * a.level) * (1 - disc)));
}

export function upgradeArcana(run: RunState, i: number): boolean {
  const a = run.arcana[i];
  if (!a || a.level >= MAX_LEVEL) return false;
  const price = upgradePrice(run, i);
  if (run.souls < price) return false;
  run.souls -= price;
  a.level++;
  return true;
}

export function unlockPrice(run: RunState): number {
  return 4 + 3 * (run.sigilUnlocked - 2);
}

export function unlockSlot(run: RunState): boolean {
  if (run.sigilUnlocked >= run.sigils.length) return false;
  const p = unlockPrice(run);
  if (run.souls < p) return false;
  run.souls -= p;
  run.sigilUnlocked++;
  return true;
}

export function swapSigils(run: RunState, a: number, b: number): void {
  if (a >= run.sigilUnlocked || b >= run.sigilUnlocked) return;
  [run.sigils[a], run.sigils[b]] = [run.sigils[b], run.sigils[a]];
}

export function moveArcana(run: RunState, from: number, to: number): void {
  if (from === to || !run.arcana[from] || to < 0 || to >= run.arcana.length) return;
  const [a] = run.arcana.splice(from, 1);
  run.arcana.splice(to, 0, a);
}

export type PotionResult = { ok: true; msg: string } | { ok: false; reason: string };

/** Setzt einen Trank ein (im Ritual vor einer Drehung oder – je nach Trank – im Basar) */
export function usePotion(run: RunState, index: number, rng: Rng): PotionResult {
  const id = run.potions[index];
  const def = id ? POTION_BY_ID[id] : undefined;
  if (!def) return { ok: false, reason: 'Kein Trank' };
  if (def.when === 'ritual' && run.phase !== 'ritual') return { ok: false, reason: 'Nur während eines Rituals' };
  const msg = def.use(run, rng);
  if (msg === false) return { ok: false, reason: 'Hat gerade keine Wirkung' };
  run.potions.splice(index, 1);
  return { ok: true, msg };
}

export function sellPotion(run: RunState, index: number): boolean {
  const id = run.potions[index];
  if (!id) return false;
  run.souls += Math.max(1, Math.floor(POTION_BY_ID[id].cost / 2));
  run.potions.splice(index, 1);
  return true;
}
