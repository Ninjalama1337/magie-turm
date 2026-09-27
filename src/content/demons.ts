import type { DemonDef, Enchant, GlyphId } from '../core/types';

export const DEMONS: DemonDef[] = [
  {
    id: 'mammon',
    name: 'Mammon',
    title: 'Fürst der Gier',
    glyph: 'coin',
    desc: 'Einsätze auf einzelne <b>Zahlen</b> sind verboten.',
    mods: { noNumberBets: true },
  },
  {
    id: 'asmodeus',
    name: 'Asmodeus',
    title: 'Fürst der Wollust',
    glyph: 'rune',
    desc: 'Die <b>erste Raute</b> ist versiegelt – ihr Siegel löst nie aus.',
    mods: { blockFirstSigil: true },
  },
  {
    id: 'belial',
    name: 'Belial',
    title: 'Herr der Lügen',
    glyph: 'mirror',
    desc: 'Am Drehende wird der Fluch <b>halbiert</b>.',
    mods: { fluchFactor: 0.5 },
  },
  {
    id: 'beelzebub',
    name: 'Beelzebub',
    title: 'Herr der Fliegen',
    glyph: 'wisp',
    desc: 'Es können keine <b>Irrlichter</b> erscheinen.',
    mods: { noGhosts: true },
  },
  {
    id: 'leviathan',
    name: 'Leviathan',
    title: 'Schlange der Tiefe',
    glyph: 'snake',
    desc: 'Die Reibung ist <b>stark erhöht</b> – Kugeln fahren weniger Runden.',
    mods: { frictionAdd: 1.2 },
  },
  {
    id: 'lilith',
    name: 'Lilith',
    title: 'Mutter der Nacht',
    glyph: 'moon',
    desc: 'Die Arkana ganz <b>rechts</b> ist deaktiviert.',
    mods: { disableRightmost: true },
  },
];

export const LUCIFER: DemonDef = {
  id: 'luzifer',
  name: 'Luzifer',
  title: 'Der Lichtbringer',
  glyph: 'devil',
  desc: '<b>Eine Drehung weniger</b>, und Siegel lösen nur in <b>jeder 2. Runde</b> aus.',
  mods: { spinsAdd: -1, sigilEveryOther: true },
};

export const DEMON_BY_ID: Record<string, DemonDef> = Object.fromEntries(
  [...DEMONS, LUCIFER].map((d) => [d.id, d]),
);

export interface EnchantDef {
  id: Enchant;
  name: string;
  glyph: GlyphId;
  color: string;
  price: number;
  desc: string;
}

export const ENCHANTS: EnchantDef[] = [
  { id: 'gold', name: 'Goldfach', glyph: 'coin', color: '#e8b64c', price: 4, desc: 'Landung: <b class="s">+3 Seelen</b>.' },
  { id: 'blood', name: 'Blutfach', glyph: 'drop', color: '#d2203a', price: 5, desc: 'Landung: <b class="x">×1,5 Fluch</b>.' },
  {
    id: 'glass',
    name: 'Glasfach',
    glyph: 'mirror',
    color: '#9fe3ff',
    price: 5,
    desc: 'Landung: <b class="x">×3 Fluch</b>. 1 zu 4 Chance, dass es zerbricht.',
  },
  {
    id: 'lucky',
    name: 'Glücksfach',
    glyph: 'dice',
    color: '#5fe08a',
    price: 4,
    desc: 'Landung: 1 zu 5 <b class="f">+20 Fluch</b>, 1 zu 15 <b class="s">+20 Seelen</b>.',
  },
  {
    id: 'ember',
    name: 'Glutfach',
    glyph: 'flame',
    color: '#ff8a3c',
    price: 4,
    desc: 'Landung: <b class="g">+10 Glut</b> je gefahrener Runde.',
  },
];

export const ENCHANT_BY_ID = Object.fromEntries(ENCHANTS.map((e) => [e.id, e])) as Record<Enchant, EnchantDef>;
