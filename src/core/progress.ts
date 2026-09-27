import { checkDiscoveries, LEVELS, levelFor, type Discovery, type DiscoveryCtx, type InsightLevel } from '../content/unlocks';
import type { Insight } from './save';

export interface XpResult {
  gained: number;
  before: number;
  after: number;
  levelBefore: number;
  levelAfter: number;
  /** Neu erreichte Stufen mit ihren Freischaltungen */
  levels: InsightLevel[];
  items: string[];
}

/** Schreibt Erkenntnis gut und schaltet erreichte Stufen frei */
export function grantXp(ins: Insight, gained: number): XpResult {
  const before = ins.xp;
  const levelBefore = levelFor(before);
  ins.xp += gained;
  const levelAfter = levelFor(ins.xp);
  const levels = LEVELS.slice(levelBefore, levelAfter);
  const items: string[] = [];
  for (const l of levels) {
    for (const it of l.items) {
      if (!ins.unlocked.includes(it)) {
        ins.unlocked.push(it);
        items.push(it);
      }
    }
  }
  return { gained, before, after: ins.xp, levelBefore, levelAfter, levels, items };
}

/** Prüft Entdeckungen, schaltet sie frei und liefert die neuen */
export function discover(ins: Insight, ctx: DiscoveryCtx): Discovery[] {
  const found = checkDiscoveries(ctx, new Set(ins.unlocked));
  for (const d of found) ins.unlocked.push(d.item);
  return found;
}
