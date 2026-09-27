import { addFluch, addGlut, addSouls, addTempo, info, lv, mulFluch, roll, spawnGhost } from '../core/effects';
import { fireAll } from '../core/hooks';
import { fmtMult } from '../core/num';
import type { SigilDef, Src, Suit } from '../core/types';
import { ARCANA_BY_ID } from './arcana';
import { suitCount } from './arcana-minor';

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


const suits = (run: Parameters<typeof suitCount>[0], suit: Suit) => suitCount(run, suit, ARCANA_BY_ID);

SIGILS.push(
  {
    id: 'zwilling',
    name: 'Zwillingssiegel',
    glyph: 'mirror',
    rarity: 'rare',
    cost: 7,
    desc: (l) => `Kopiert das Siegel auf der Raute <b>davor</b>${l > 1 ? ` (mit Stufe +${l - 1})` : ''}`,
    trigger: (ctx, s, slot, b) => {
      const prev = ctx.run.sigils[slot - 1];
      if (!prev || prev.id === 'zwilling') return;
      SIGIL_BY_ID[prev.id]?.trigger(ctx, { ...prev, level: Math.min(7, prev.level + s.level - 1) }, slot, b);
    },
  },
  {
    id: 'altar',
    name: 'Opferaltar',
    glyph: 'altar',
    rarity: 'rare',
    cost: 7,
    desc: (l) => `Verbrennt <b>25 %</b> der Glut: <b class="f">+1 Fluch je ${Math.max(5, 25 - 5 * (l - 1))} verbrannter Glut</b>`,
    trigger: (ctx, s, slot, b) => {
      const burn = ctx.glut.mul(0.25).floor();
      if (burn.lt(10)) return;
      ctx.glut = ctx.glut.sub(burn);
      addFluch(ctx, burn.div(Math.max(5, 25 - 5 * (s.level - 1))).floor(), S(slot), b.id);
    },
  },
  {
    id: 'magnet',
    name: 'Magnetsiegel',
    glyph: 'magnet',
    rarity: 'uncommon',
    cost: 5,
    desc: (l) => `Passiert die <b>Seelenkugel</b>: alle Irrlichter <b class="t">+${n(lv(l, 1.5, 0.75))} Tempo</b>`,
    trigger: (ctx, s, slot, b) => {
      if (b.ghost) return;
      const gs = ctx.balls.filter((o) => o.ghost && o.active);
      if (!gs.length) return;
      for (const g of gs) g.energy += lv(s.level, 1.5, 0.75);
      info(ctx, `Irrlichter +${n(lv(s.level, 1.5, 0.75))} Tempo`, S(slot), b.id, 'tempo');
    },
  },
  {
    id: 'frost',
    name: 'Frostsiegel',
    glyph: 'snow',
    rarity: 'uncommon',
    cost: 5,
    desc: (l) => `Diese Kugel: <b class="t">−${Math.round(lv(l, 4, 2))} % Reibung</b> (stapelt, bis −50 %)`,
    trigger: (ctx, s, slot, b) => {
      b.fric = Math.max(0.5, b.fric * (1 - lv(s.level, 0.04, 0.02)));
      info(ctx, 'Frost', S(slot), b.id, 'tempo');
    },
  },
  {
    id: 'nadir',
    name: 'Nadir',
    glyph: 'moon',
    rarity: 'rare',
    cost: 8,
    desc: (l) => `<b class="x">×${n(lv(l, 1.25, 0.1))} Fluch</b> – wirkt nur auf der <b>letzten freien Raute</b>`,
    trigger: (ctx, s, slot, b) => {
      if (slot !== ctx.run.sigilUnlocked - 1) return;
      mulFluch(ctx, lv(s.level, 1.25, 0.1), S(slot), b.id);
    },
  },
  {
    id: 'goldader',
    name: 'Goldader',
    glyph: 'crystal',
    rarity: 'uncommon',
    cost: 5,
    desc: (l) => `Jede <b>4.</b> Runde einer Kugel: <b class="s">+1 Seele</b> (max. ${2 * l} pro Drehung)`,
    trigger: (ctx, s, slot, b) => {
      if (b.laps % 4 !== 0) return;
      const key = 'gold' + slot;
      if ((ctx.counters[key] ?? 0) >= 2 * s.level) return;
      ctx.counters[key] = (ctx.counters[key] ?? 0) + 1;
      addSouls(ctx, 1, S(slot), b.id);
    },
  },
  {
    id: 'umkehr',
    name: 'Umkehrsiegel',
    glyph: 'echo',
    rarity: 'common',
    cost: 3,
    desc: (l) => `Das nächste Siegel löst <b>${l >= 3 ? 2 : 1}×</b> zusätzlich aus, aber <b class="bad">−1 Tempo</b>`,
    trigger: (ctx, s, slot, b) => {
      ctx.mirror[b.id] = Math.min(MAX_MIRROR, (ctx.mirror[b.id] ?? 0) + (s.level >= 3 ? 2 : 1));
      addTempo(ctx, b, -1, S(slot));
    },
  },
  {
    id: 'horn',
    name: 'Höllenhorn',
    glyph: 'horn',
    rarity: 'uncommon',
    cost: 5,
    desc: (l) => `<b class="f">+${n(lv(l, 0.5))} Fluch</b> je aktivem Irrlicht`,
    trigger: (ctx, s, slot, b) => {
      const g = ctx.balls.filter((o) => o.ghost && o.active).length;
      if (g > 0) addFluch(ctx, g * lv(s.level, 0.5), S(slot), b.id);
    },
  },
  {
    id: 'kerze',
    name: 'Kerzensiegel',
    glyph: 'candle',
    rarity: 'common',
    cost: 3,
    desc: (l) => `<b class="g">+${n(lv(l, 3))} Glut</b>, +${l} mehr bei jeder weiteren Auslösung in dieser Drehung`,
    trigger: (ctx, s, slot, b) => {
      const key = 'kerze' + slot;
      const k = (ctx.counters[key] = (ctx.counters[key] ?? 0) + 1);
      addGlut(ctx, lv(s.level, 3) + (k - 1) * s.level, S(slot), b.id);
    },
  },
  {
    id: 'rune',
    name: 'Runensiegel',
    glyph: 'rune',
    rarity: 'uncommon',
    cost: 5,
    desc: (l) => `<b class="f">+${n(lv(l, 0.4, 0.2))} Fluch</b> je belegter Raute`,
    trigger: (ctx, s, slot, b) => {
      const k = ctx.run.sigils.slice(0, ctx.run.sigilUnlocked).filter(Boolean).length;
      addFluch(ctx, k * lv(s.level, 0.4, 0.2), S(slot), b.id);
    },
  },
  {
    id: 'schaedel',
    name: 'Schädelsiegel',
    glyph: 'skull',
    rarity: 'rare',
    cost: 7,
    desc: (l) => `Jede <b>${Math.max(4, 11 - l)}.</b> Auslösung in einer Drehung: <b class="x">×2 Fluch</b>`,
    trigger: (ctx, s, slot, b) => {
      const key = 'schaedel' + slot;
      const k = (ctx.counters[key] = (ctx.counters[key] ?? 0) + 1);
      if (k % Math.max(4, 11 - s.level) === 0) mulFluch(ctx, 2, S(slot), b.id);
    },
  },
  {
    id: 'glocke',
    name: 'Totenglocke',
    glyph: 'bell',
    rarity: 'common',
    cost: 4,
    desc: (l) => `Nur in der <b>ersten</b> Runde einer Kugel: <b class="f">+${n(lv(l, 4))} Fluch</b>`,
    trigger: (ctx, s, slot, b) => {
      if (b.laps === 1) addFluch(ctx, lv(s.level, 4), S(slot), b.id);
    },
  },
  {
    id: 'kelch',
    name: 'Kelchsiegel',
    glyph: 'cup',
    rarity: 'common',
    cost: 4,
    desc: (l) => `<b class="g">+${n(lv(l, 4))} Glut</b> × (1 + Kelch-Karten)`,
    trigger: (ctx, s, slot, b) => addGlut(ctx, lv(s.level, 4) * (1 + suits(ctx.run, 'kelche')), S(slot), b.id),
  },
  {
    id: 'schwert',
    name: 'Schwertsiegel',
    glyph: 'sword',
    rarity: 'uncommon',
    cost: 5,
    desc: (l) => `<b class="f">+${n(lv(l, 0.5))} Fluch</b> × (1 + Schwerter-Karten)`,
    trigger: (ctx, s, slot, b) => addFluch(ctx, lv(s.level, 0.5) * (1 + suits(ctx.run, 'schwerter')), S(slot), b.id),
  },
  {
    id: 'stab',
    name: 'Stabsiegel',
    glyph: 'staff',
    rarity: 'common',
    cost: 4,
    desc: (l) => `<b class="t">+${n(lv(l, 0.4, 0.2))} Tempo</b> × (1 + Stäbe-Karten)`,
    trigger: (ctx, s, slot, b) => addTempo(ctx, b, lv(s.level, 0.4, 0.2) * (1 + suits(ctx.run, 'staebe')), S(slot)),
  },
  {
    id: 'muenze',
    name: 'Münzsiegel',
    glyph: 'coin',
    rarity: 'common',
    cost: 4,
    desc: (l) => `<b class="g">+${n(lv(l, 0.5))} Glut</b> je Seele, die du besitzt`,
    trigger: (ctx, s, slot, b) => addGlut(ctx, Math.floor(ctx.run.souls * lv(s.level, 0.5)), S(slot), b.id),
  },
  {
    id: 'sturmauge',
    name: 'Auge des Sturms',
    glyph: 'eye',
    rarity: 'uncommon',
    cost: 5,
    desc: (l) => `<b class="g">+${n(lv(l, 3))} Glut</b> je verbleibendem Tempo der Kugel`,
    trigger: (ctx, s, slot, b) => addGlut(ctx, Math.max(0, Math.floor(b.energy * lv(s.level, 3))), S(slot), b.id),
  },
  {
    id: 'blitz',
    name: 'Blitzsiegel',
    glyph: 'bolt',
    rarity: 'rare',
    cost: 6,
    desc: (l) => `Löst ein <b>zufälliges anderes</b> Siegel aus${l >= 3 ? ' (2×)' : ''}`,
    trigger: (ctx, s, slot, b) => {
      const others = ctx.run.sigils
        .slice(0, ctx.run.sigilUnlocked)
        .map((o, i) => ({ o, i }))
        .filter((x) => x.o && x.i !== slot && x.o.id !== 'blitz' && x.o.id !== 'zwilling');
      if (!others.length) return;
      for (let t = 0; t < (s.level >= 3 ? 2 : 1); t++) {
        const pick = others[ctx.rng.int(others.length)];
        info(ctx, 'Blitz!', S(slot), b.id, 'tempo');
        SIGIL_BY_ID[pick.o!.id]?.trigger(ctx, pick.o!, pick.i, b);
      }
    },
  },
);

export const SIGIL_BY_ID: Record<string, SigilDef> = Object.fromEntries(SIGILS.map((s) => [s.id, s]));
