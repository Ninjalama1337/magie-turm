/* Balance-Dashboard: spielt eine feste Matrix aus Pools, Beschwörern und Höllenstufen
 * mit dem Greedy-Bot und gibt einen Markdown-Bericht aus (CI: Job-Zusammenfassung + Release).
 * Aufruf: npm run report [-- runs=200]
 */
import { ARCANA_BY_ID } from '../src/content/arcana';
import { HEROES } from '../src/content/heroes';
import { FINAL_CIRCLE } from '../src/core/run';
import { cfg, playRun, poolFor } from './balance-sim';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=')));
const RUNS = Number(args.runs ?? 200);

interface Row {
  label: string;
  avg: number;
  win: number;
  deep: number;
}

const arcanaStats = new Map<string, { n: number; circles: number }>();

function batch(label: string, opts: Partial<typeof cfg>, track = false): Row {
  Object.assign(cfg, { bot: 'smart', maxCircle: 12, wheel: 'euro', meta: undefined, stake: 1, pool: undefined, hero: undefined }, opts);
  let sum = 0;
  let win = 0;
  let deep = 0;
  for (let s = 1; s <= RUNS; s++) {
    const r = playRun(s * 7919);
    sum += r.circle;
    if (r.circle > FINAL_CIRCLE) win++;
    if (r.circle >= 5) deep++;
    if (track)
      for (const id of r.arcana) {
        const e = arcanaStats.get(id) ?? { n: 0, circles: 0 };
        e.n++;
        e.circles += r.circle;
        arcanaStats.set(id, e);
      }
  }
  return { label, avg: sum / RUNS, win: win / RUNS, deep: deep / RUNS };
}

const pct = (v: number) => `${(v * 100).toFixed(1)} %`;
const table = (rows: Row[]) =>
  ['| Szenario | Ø Kreis | Kreis 5+ | Luzifer besiegt |', '|---|---:|---:|---:|', ...rows.map((r) => `| ${r.label} | ${r.avg.toFixed(2)} | ${pct(r.deep)} | ${pct(r.win)} |`)].join('\n');

const t0 = Date.now();
const pools = [
  batch('Start-Pool', { pool: poolFor('starter') }),
  batch('Erkenntnis 8', { pool: poolFor('8') }),
  batch('Voller Pool', {}, true),
];
const heroes = HEROES.map((h) => batch(h.name, { hero: h.id }));
const baseline = heroes[0].avg;
const stakes = [1, 3, 5].map((st) => batch(`Stufe ${st}`, { stake: st }));

const top = [...arcanaStats.entries()]
  .filter(([, e]) => e.n >= RUNS * 0.04)
  .map(([id, e]) => ({ id, avg: e.circles / e.n, n: e.n }))
  .sort((a, b) => b.avg - a.avg);

const lines = [
  '### ⚖️ Balance-Bericht',
  '',
  `Greedy-Bot, ${RUNS} Runs je Szenario, Europäischer Kessel (Dauer ${((Date.now() - t0) / 1000).toFixed(0)} s).`,
  '',
  '**Karten-Pool**',
  table(pools),
  '',
  '**Beschwörer** (voller Pool, Stufe 1)',
  table(heroes),
  '',
  '**Höllenstufen** (voller Pool)',
  table(stakes),
  '',
  '**Stärkste Arkana** (Ø Kreis, wenn am Run-Ende im Deck)',
  '',
  top
    .slice(0, 5)
    .map((t) => `- ${ARCANA_BY_ID[t.id]?.name ?? t.id}: ${t.avg.toFixed(2)} (${t.n}×)`)
    .join('\n'),
  '',
  `**Schwächste Arkana:** ${top
    .slice(-3)
    .map((t) => `${ARCANA_BY_ID[t.id]?.name ?? t.id} (${t.avg.toFixed(2)})`)
    .join(', ')}`,
  '',
  ...heroes.filter((h) => Math.abs(h.avg - baseline) > 1).map((h) => `> ⚠️ ${h.label} weicht um ${(h.avg - baseline).toFixed(2)} Kreise vom Wanderer ab.`),
];
console.log(lines.join('\n'));
