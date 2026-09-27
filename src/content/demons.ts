import type { DemonMods, DemonDef, Enchant, GlyphId } from '../core/types';

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
  {
    id: 'baal',
    name: 'Baal',
    title: 'König des Ostens',
    glyph: 'crown',
    desc: 'Am Drehende wird die Glut <b>halbiert</b>.',
    mods: { glutFactor: 0.5 },
  },
  {
    id: 'paimon',
    name: 'Paimon',
    title: 'Meister der Künste',
    glyph: 'trumpet',
    desc: 'Getroffene Einsätze zahlen nur den <b>halben</b> Multiplikator.',
    mods: { halfPayout: true },
  },
  {
    id: 'astaroth',
    name: 'Astaroth',
    title: 'Großherzog der Hölle',
    glyph: 'snake',
    desc: 'Vor jeder Drehung werden deine <b>Arkana gemischt</b>.',
    mods: { shuffleArcana: true },
  },
  {
    id: 'abaddon',
    name: 'Abaddon',
    title: 'Der Verderber',
    glyph: 'grave',
    desc: 'Der Kessel läuft rückwärts: Siegel lösen in <b>umgekehrter Reihenfolge</b> aus.',
    mods: { reverseSigils: true },
  },
  {
    id: 'mephisto',
    name: 'Mephisto',
    title: 'Der Vertragsbrecher',
    glyph: 'book',
    desc: 'Während dieses Rituals erhältst du <b>keine Seelen</b> aus Drehungen.',
    mods: { noSouls: true },
  },
  {
    id: 'azazel',
    name: 'Azazel',
    title: 'Der Sündenbock',
    glyph: 'horn',
    desc: 'Das Ziel ist <b>50 % höher</b>.',
    mods: { targetMult: 1.5 },
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

const merged: Record<string, DemonDef> = {};

/** Liefert einen Dämon; „a+b“ ist ein Doppeldämon aus dem Jenseits mit den Regeln beider */
export function demonById(id: string | null | undefined): DemonDef | null {
  if (!id) return null;
  if (DEMON_BY_ID[id]) return DEMON_BY_ID[id];
  if (merged[id]) return merged[id];
  const parts = id.split('+').map((p) => DEMON_BY_ID[p]).filter(Boolean);
  if (parts.length < 2) return null;
  const [a, b] = parts;
  const mul = (x?: number, y?: number) => (x ?? 1) * (y ?? 1);
  const mods: DemonMods = { ...a.mods, ...b.mods };
  if (a.mods.targetMult || b.mods.targetMult) mods.targetMult = mul(a.mods.targetMult, b.mods.targetMult);
  if (a.mods.fluchFactor || b.mods.fluchFactor) mods.fluchFactor = mul(a.mods.fluchFactor, b.mods.fluchFactor);
  if (a.mods.glutFactor || b.mods.glutFactor) mods.glutFactor = mul(a.mods.glutFactor, b.mods.glutFactor);
  if (a.mods.frictionAdd || b.mods.frictionAdd) mods.frictionAdd = (a.mods.frictionAdd ?? 0) + (b.mods.frictionAdd ?? 0);
  if (a.mods.spinsAdd || b.mods.spinsAdd) mods.spinsAdd = (a.mods.spinsAdd ?? 0) + (b.mods.spinsAdd ?? 0);
  merged[id] = {
    id,
    name: `${a.name} & ${b.name}`,
    title: 'Doppeldämon des Jenseits',
    glyph: a.glyph,
    desc: `${a.desc}<br>${b.desc}`,
    mods,
  };
  return merged[id];
}

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
