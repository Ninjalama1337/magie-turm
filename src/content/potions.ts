import type { Rng } from '../core/rng';
import type { GlyphId, RunState } from '../core/types';
import { wheelOf } from '../core/wheel';
import { ENCHANTS } from './demons';

export interface PotionDef {
  id: string;
  name: string;
  glyph: GlyphId;
  color: string;
  cost: number;
  desc: string;
  /** 'ritual' = nur vor einer Drehung, 'any' = auch im Basar */
  when: 'ritual' | 'any';
  /** Liefert eine Meldung oder false, wenn nicht anwendbar */
  use: (run: RunState, rng: Rng) => string | false;
}

export const POTIONS: PotionDef[] = [
  {
    id: 'blut',
    name: 'Blutgebräu',
    glyph: 'drop',
    color: '#ff3b5c',
    cost: 4,
    when: 'ritual',
    desc: 'Nächste Drehung: <b class="x">×2 Fluch</b>.',
    use: (r) => ((r.buffs.fluchMult *= 2), 'Der Fluch brodelt …'),
  },
  {
    id: 'glut',
    name: 'Höllenöl',
    glyph: 'flame',
    color: '#ff9a3c',
    cost: 4,
    when: 'ritual',
    desc: 'Nächste Drehung: <b class="g">×2 Glut</b>.',
    use: (r) => ((r.buffs.glutMult *= 2), 'Die Glut lodert auf!'),
  },
  {
    id: 'phiole',
    name: 'Irrlicht-Phiole',
    glyph: 'wisp',
    color: '#7ef9ff',
    cost: 4,
    when: 'ritual',
    desc: 'Nächste Drehung: <b class="w">+3 Irrlichter</b> (über dem Limit).',
    use: (r) => ((r.buffs.ghosts += 3), 'Irrlichter flackern in der Phiole.'),
  },
  {
    id: 'sturm',
    name: 'Sturmtrank',
    glyph: 'bolt',
    color: '#a594ff',
    cost: 3,
    when: 'ritual',
    desc: 'Nächste Drehung: Kugel mit <b class="t">+12 Tempo</b>.',
    use: (r) => ((r.buffs.tempo += 12), 'Die Kugel zittert vor Ungeduld.'),
  },
  {
    id: 'zeit',
    name: 'Zeitsand',
    glyph: 'hourglass',
    color: '#e8c170',
    cost: 6,
    when: 'ritual',
    desc: '<b>+1 Drehung</b> in diesem Ritual.',
    use: (r) => ((r.spinsLeft += 1), 'Die Zeit dehnt sich.'),
  },
  {
    id: 'gezinkt',
    name: 'Gezinkte Kugel',
    glyph: 'eye',
    color: '#ff4fd8',
    cost: 8,
    when: 'ritual',
    desc: 'Dein nächster Einsatz <b>trifft garantiert</b>.',
    use: (r) => ((r.buffs.forceHit = true), 'Das Schicksal ist bestochen.'),
  },
  {
    id: 'gold',
    name: 'Goldstaub',
    glyph: 'coin',
    color: '#f4c95d',
    cost: 3,
    when: 'any',
    desc: 'Verdoppelt deine Seelen (max. <b class="s">+12</b>).',
    use: (r) => {
      const g = Math.min(12, r.souls);
      r.souls += g;
      return `+${g} Seelen`;
    },
  },
  {
    id: 'reife',
    name: 'Elixier der Reife',
    glyph: 'potion',
    color: '#5fe08a',
    cost: 5,
    when: 'any',
    desc: 'Eine zufällige Arkana steigt um <b>1 Stufe</b>.',
    use: (r, rng) => {
      const pool = r.arcana.filter((a) => a.level < 5);
      if (!pool.length) return false;
      const a = rng.pick(pool);
      a.level++;
      return `Eine Arkana erreicht Stufe ${a.level}.`;
    },
  },
  {
    id: 'zauber',
    name: 'Zaubertinte',
    glyph: 'book',
    color: '#9fe3ff',
    cost: 4,
    when: 'any',
    desc: 'Verzaubert <b>3 zufällige Fächer</b>.',
    use: (r, rng) => {
      const free = wheelOf(r).order.filter((n) => !r.enchants[n]);
      for (let i = 0; i < 3 && free.length; i++) {
        const n = free.splice(rng.int(free.length), 1)[0];
        r.enchants[n] = rng.pick(ENCHANTS).id;
      }
      return 'Drei Fächer glühen auf.';
    },
  },
  {
    id: 'spiegel',
    name: 'Spiegeltrank',
    glyph: 'mirror',
    color: '#d7e3ff',
    cost: 7,
    when: 'any',
    desc: 'Kopiert die Arkana <b>ganz links</b> (Stufe 1), wenn Platz ist.',
    use: (r) => {
      const a = r.arcana[0];
      if (!a || r.arcana.some((o, i) => i > 0 && o.id === a.id)) return false;
      r.arcana.push({ uid: r.uid++, id: a.id, level: 1, state: {} });
      return 'Ein Spiegelbild erwacht.';
    },
  },
  {
    id: 'rune',
    name: 'Runenöl',
    glyph: 'rune',
    color: '#c9a25a',
    cost: 5,
    when: 'any',
    desc: 'Legt eine <b>Raute</b> frei.',
    use: (r) => {
      if (r.sigilUnlocked >= r.sigils.length) return false;
      r.sigilUnlocked++;
      return 'Eine Raute ist frei.';
    },
  },
  {
    id: 'seele',
    name: 'Seelenbrand',
    glyph: 'candle',
    color: '#ffb86b',
    cost: 2,
    when: 'ritual',
    desc: 'Verbrennt alle Seelen: nächste Drehung <b class="x">×(1 + Seelen/4) Fluch</b>.',
    use: (r) => {
      if (r.souls <= 0) return false;
      r.buffs.fluchMult *= 1 + r.souls / 4;
      const n = r.souls;
      r.souls = 0;
      return `${n} Seelen verbrannt.`;
    },
  },
];

export const POTION_BY_ID: Record<string, PotionDef> = Object.fromEntries(POTIONS.map((p) => [p.id, p]));
