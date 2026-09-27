/* Balance-Simulation: spielt viele Runs mit einer einfachen Greedy-KI.
 * Aufruf: npm run sim [-- runs=500 bot=smart]
 */
import { ARCANA_BY_ID } from '../src/content/arcana';
import { fmt } from '../src/core/num';
import { continueEndless, finishRitual, FINAL_CIRCLE, newRun, nextRitual, spin, withRng } from '../src/core/run';
import {
  buy,
  canBuy,
  freeSigilSlot,
  reroll,
  rerollPrice,
  unlockPrice,
  unlockSlot,
  upgradeArcana,
  upgradePrice,
} from '../src/core/shop';
import { isBetAllowed } from '../src/core/spin';
import { computeStats } from '../src/core/stats';
import type { Bet, RunState } from '../src/core/types';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=')));
const RUNS = Number(args.runs ?? 300);
const BOT = args.bot ?? 'smart';
const MAX_CIRCLE = Number(args.max ?? 14);

const RARITY_SCORE = { common: 1, uncommon: 2, rare: 3, legendary: 4 };

function chooseBet(run: RunState): Bet {
  if (BOT === 'dumb') return { kind: 'red' };
  const ids = new Set(run.arcana.map((a) => a.id));
  const allowNumber = isBetAllowed(run, { kind: 'number', number: 0 });
  if (allowNumber && ids.has('stern')) return { kind: 'number', number: 0 };
  if (ids.has('sonne')) return { kind: 'red' };
  if (ids.has('mond')) return { kind: 'black' };
  if (ids.has('priesterin')) return { kind: 'odd' };
  if (ids.has('gerechtigkeit')) return { kind: 'even' };
  return { kind: 'dozen2' };
}

function shopTurn(run: RunState): void {
  const shop = run.shop!;
  for (let pass = 0; pass < 3; pass++) {
    const offers = shop.offers
      .map((o, i) => ({ o, i }))
      .filter(({ o }) => !o.sold)
      .sort((a, b) => {
        const sa = a.o.kind === 'arcana' ? 10 + RARITY_SCORE[ARCANA_BY_ID[a.o.id].rarity] : a.o.kind === 'sigil' ? 8 : a.o.kind === 'pact' ? 5 : 2;
        const sb = b.o.kind === 'arcana' ? 10 + RARITY_SCORE[ARCANA_BY_ID[b.o.id].rarity] : b.o.kind === 'sigil' ? 8 : b.o.kind === 'pact' ? 5 : 2;
        return sb - sa;
      });
    for (const { o, i } of offers) {
      if (!canBuy(run, o).ok) continue;
      if (o.kind === 'enchant' && run.souls < o.price + 6) continue;
      if (o.kind === 'pact' && run.souls < o.price + 3) continue;
      buy(run, i);
    }
    if (freeSigilSlot(run) < 0 && run.sigilUnlocked < 8 && run.souls >= unlockPrice(run) + 3) unlockSlot(run);
    const slots = computeStats(run, false).arcanaSlots;
    if (run.arcana.length >= slots) {
      const i = run.arcana.findIndex((a) => a.level < 5);
      if (i >= 0 && run.souls >= upgradePrice(run, i) + 5) upgradeArcana(run, i);
    }
    if (run.souls >= rerollPrice(run) + 10) withRng(run, (rng) => reroll(run, rng));
  }
}

function playRun(seed: number): { circle: number; ritual: number; best: string } {
  const run = newRun(seed);
  for (;;) {
    const { outcome } = spin(run, chooseBet(run), true);
    if (outcome === 'lost') break;
    if (outcome === 'won') {
      finishRitual(run);
      if (run.phase === 'victory') continueEndless(run);
      if (run.circle >= MAX_CIRCLE) break;
      shopTurn(run);
      nextRitual(run);
    }
  }
  return { circle: run.circle, ritual: run.ritual, best: fmt(run.stats.bestSpin) };
}

const dist = new Map<number, number>();
let sum = 0;
const t0 = Date.now();
for (let s = 1; s <= RUNS; s++) {
  const r = playRun(s * 7919);
  dist.set(r.circle, (dist.get(r.circle) ?? 0) + 1);
  sum += r.circle;
}
console.log(`Bot: ${BOT}, Runs: ${RUNS}, Dauer: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(`Ø erreichter Kreis: ${(sum / RUNS).toFixed(2)}`);
let cum = RUNS;
for (let c = 1; c <= MAX_CIRCLE; c++) {
  const n = dist.get(c) ?? 0;
  const label = c <= FINAL_CIRCLE ? `Kreis ${c}` : `Jenseits ${c - FINAL_CIRCLE}`;
  console.log(`${label.padEnd(12)} erreicht: ${((cum / RUNS) * 100).toFixed(1).padStart(5)} %   dort gescheitert: ${n}`);
  cum -= n;
}
