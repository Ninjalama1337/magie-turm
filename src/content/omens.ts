import type { GlyphId, RunState, Stats } from '../core/types';

export interface OmenDef {
  id: string;
  name: string;
  glyph: GlyphId;
  desc: string;
  mod?: (s: Stats) => void;
  start?: (run: RunState) => void;
}

/** Sonderregeln für tägliche und wöchentliche Herausforderungen */
export const OMENS: OmenDef[] = [
  { id: 'reich', name: 'Blutgeld', glyph: 'coin', desc: 'Start mit <b class="s">+10 Seelen</b>.', start: (r) => (r.souls += 10) },
  { id: 'arm', name: 'Armut', glyph: 'skull', desc: 'Zinsen gibt es <b class="bad">keine</b>.', mod: (s) => (s.interestMax = 0) },
  { id: 'rasend', name: 'Raserei', glyph: 'bolt', desc: 'Die Kugel ist <b class="t">+40 % schneller</b>.', mod: (s) => (s.tempo *= 1.4) },
  { id: 'schwer', name: 'Bleikugel', glyph: 'grave', desc: 'Die Kugel ist <b class="bad">−25 % langsamer</b>.', mod: (s) => (s.tempo *= 0.75) },
  { id: 'geister', name: 'Geisterstunde', glyph: 'wisp', desc: 'Jede Drehung beginnt mit <b class="w">2 Irrlichtern</b>.', mod: (s) => (s.startGhosts += 2) },
  { id: 'gier', name: 'Gierige Götter', glyph: 'crown', desc: 'Basar-Preise <b class="bad">+2</b>, aber Belohnungen <b class="s">+2</b>.', mod: (s) => ((s.priceAdd += 2), (s.rewardAdd += 2)) },
  { id: 'tod', name: 'Todesbote', glyph: 'sickle', desc: 'Start mit <b>Der Tod</b> und <b>Der Narr</b>.', start: (r) => r.arcana.push({ uid: r.uid++, id: 'tod', level: 1, state: {} }, { uid: r.uid++, id: 'narr', level: 1, state: {} }) },
  { id: 'rauten', name: 'Offene Rauten', glyph: 'rune', desc: 'Alle <b>8 Rauten</b> sind von Beginn an frei.', start: (r) => (r.sigilUnlocked = 8) },
  { id: 'eile', name: 'Eile', glyph: 'hourglass', desc: 'Nur <b class="bad">3 Drehungen</b> pro Ritual, aber <b class="f">+3 Basis-Fluch</b>.', mod: (s) => ((s.spins -= 1), (s.baseFluch += 3)) },
  { id: 'fortuna', name: 'Fortunas Laune', glyph: 'dice', desc: 'Alle Wahrscheinlichkeiten <b>×3</b>.', mod: (s) => (s.luck *= 3) },
  { id: 'glanz', name: 'Glanz', glyph: 'crystal', desc: 'Arkana im Basar haben oft <b class="x">Editionen</b>.', mod: (s) => (s.editionChance += 0.35) },
  { id: 'traenke', name: 'Hexenküche', glyph: 'potion', desc: '<b>+1 Trank-Platz</b>, Tränke kosten <b class="s">−2</b>.', mod: (s) => ((s.potionSlots += 1), (s.potionDiscount += 2)) },
];

export const OMEN_BY_ID: Record<string, OmenDef> = Object.fromEntries(OMENS.map((o) => [o.id, o]));
