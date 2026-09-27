import { addFluch, addGlut, addSouls, addTempo, info, lv, mulFluch, roll, spawnGhost } from '../core/effects';
import { fireAll } from '../core/hooks';
import { fmtMult } from '../core/num';
import type { SigilDef, Src } from '../core/types';

const MAX_MIRROR = 8;
const S = (i: number): Src => ({ k: 'sigil', i });
const n = (v: number) => fmtMult(v);

export const SIGILS: SigilDef[] = [
  {
    id: 'glut',
    name: 'Glutsiegel',
    glyph: 'flame',
    rarity: 'common',
    cost: 3,
    desc: (l) => `<b class="g">+${n(lv(l, 8))} Glut</b>`,
    trigger: (ctx, s, slot, b) => addGlut(ctx, lv(s.level, 8), S(slot), b.id),
  },
  {
    id: 'fluch',
    name: 'Fluchsiegel',
    glyph: 'drop',
    rarity: 'common',
    cost: 4,
    desc: (l) => `<b class="f">+${n(lv(l, 1))} Fluch</b>`,
    trigger: (ctx, s, slot, b) => addFluch(ctx, lv(s.level, 1), S(slot), b.id),
  },
  {
    id: 'tempo',
    name: 'Sturmsiegel',
    glyph: 'bolt',
    rarity: 'common',
    cost: 4,
    desc: (l) => `<b class="t">+${n(lv(l, 1.2, 0.6))} Tempo</b> für die Kugel`,
    trigger: (ctx, s, slot, b) => addTempo(ctx, b, lv(s.level, 1.2, 0.6), S(slot)),
  },
  {
    id: 'blut',
    name: 'Blutsiegel',
    glyph: 'dagger',
    rarity: 'uncommon',
    cost: 5,
    desc: (l) => `<b class="f">+${n(lv(l, 3))} Fluch</b>, aber <b class="bad">−1,5 Tempo</b>`,
    trigger: (ctx, s, slot, b) => {
      addFluch(ctx, lv(s.level, 3), S(slot), b.id);
      addTempo(ctx, b, -1.5, S(slot));
    },
  },
  {
    id: 'spiegel',
    name: 'Spiegelsiegel',
    glyph: 'mirror',
    rarity: 'uncommon',
    cost: 5,
    desc: (l) => `Das <b>nächste</b> Siegel löst <b>${1 + Math.floor((l - 1) / 2)}×</b> zusätzlich aus`,
    trigger: (ctx, s, slot, b) => {
      ctx.mirror[b.id] = Math.min(MAX_MIRROR, (ctx.mirror[b.id] ?? 0) + 1 + Math.floor((s.level - 1) / 2));
      info(ctx, 'Spiegelung', S(slot), b.id);
    },
  },
  {
    id: 'kette',
    name: 'Kettensiegel',
    glyph: 'chain',
    rarity: 'rare',
    cost: 7,
    desc: (l) => `Löst alle <b>Runden-Arkana</b> ${l >= 4 ? '2' : '1'}× erneut aus`,
    trigger: (ctx, s, slot, b) => {
      info(ctx, 'Kettenreaktion!', S(slot), b.id);
      const times = s.level >= 4 ? 2 : 1;
      for (let t = 0; t < times; t++) fireAll(ctx, 'lap', b);
    },
  },
  {
    id: 'irrlicht',
    name: 'Irrlichtsiegel',
    glyph: 'wisp',
    rarity: 'uncommon',
    cost: 6,
    desc: (l) => `<b>${Math.round(lv(l, 0.08, 0.04) * 100)} %</b> Chance, ein <b class="w">Irrlicht</b> zu beschwören`,
    trigger: (ctx, s, slot) => {
      if (roll(ctx, lv(s.level, 0.08, 0.04))) spawnGhost(ctx, S(slot));
    },
  },
  {
    id: 'seelen',
    name: 'Seelensiegel',
    glyph: 'coin',
    rarity: 'uncommon',
    cost: 4,
    desc: (l) => `<b class="s">+1 Seele</b> (max. ${l} pro Drehung)`,
    trigger: (ctx, s, slot, b) => {
      const key = 'seelen' + slot;
      const used = ctx.counters[key] ?? 0;
      if (used >= s.level) return;
      ctx.counters[key] = used + 1;
      addSouls(ctx, 1, S(slot), b.id);
    },
  },
  {
    id: 'echo',
    name: 'Echosiegel',
    glyph: 'echo',
    rarity: 'rare',
    cost: 7,
    desc: (l) => `<b class="g">+${Math.round(lv(l, 0.08, 0.04) * 100)} %</b> der aktuellen Glut`,
    trigger: (ctx, s, slot, b) => addGlut(ctx, ctx.glut.mul(lv(s.level, 0.08, 0.04)).floor(), S(slot), b.id),
  },
  {
    id: 'pentagramm',
    name: 'Pentagramm',
    glyph: 'pentagram',
    rarity: 'rare',
    cost: 9,
    desc: (l) => `<b class="x">×${n(lv(l, 1.1, 0.05))} Fluch</b>`,
    trigger: (ctx, s, slot, b) => mulFluch(ctx, lv(s.level, 1.1, 0.05), S(slot), b.id),
  },
  {
    id: 'wuerfel',
    name: 'Knochenwürfel',
    glyph: 'dice',
    rarity: 'common',
    cost: 4,
    desc: (l) => `Wirft W6: bei <b>6</b> <b class="x">×2 Fluch</b>, sonst <b class="g">+Augen × ${n(lv(l, 4))} Glut</b>`,
    trigger: (ctx, s, slot, b) => {
      if (roll(ctx, 1 / 6)) mulFluch(ctx, 2, S(slot), b.id);
      else addGlut(ctx, (1 + ctx.rng.int(5)) * lv(s.level, 4), S(slot), b.id);
    },
  },
  {
    id: 'sanduhr',
    name: 'Stundenglas',
    glyph: 'hourglass',
    rarity: 'uncommon',
    cost: 5,
    desc: (l) => `<b class="g">+${n(lv(l, 2))} Glut</b> je bereits gefahrener Runde dieser Kugel`,
    trigger: (ctx, s, slot, b) => addGlut(ctx, b.laps * lv(s.level, 2), S(slot), b.id),
  },
];

export const SIGIL_BY_ID: Record<string, SigilDef> = Object.fromEntries(SIGILS.map((s) => [s.id, s]));
