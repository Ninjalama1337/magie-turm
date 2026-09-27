import type { GlyphId, MetaBonuses } from '../core/types';

export type BranchId = 'flamme' | 'gold' | 'kugel';

export interface Branch {
  id: BranchId;
  name: string;
  desc: string;
  glyph: GlyphId;
  color: string;
}

export interface Talent {
  id: string;
  branch: BranchId;
  /** Position im Ast (1 = Wurzel); jeder Knoten braucht seinen Vorgänger */
  tier: number;
  name: string;
  desc: string;
  cost: number;
  glyph: GlyphId;
  /** Schlussstein des Astes */
  capstone?: boolean;
  apply: (m: MetaBonuses) => void;
}

export const BRANCHES: Branch[] = [
  { id: 'flamme', name: 'Pfad der Flamme', desc: 'Glut und Fluch – rohe Macht.', glyph: 'flame', color: '#ff5a3c' },
  { id: 'gold', name: 'Pfad des Goldes', desc: 'Seelen, Basar und Tränke.', glyph: 'coin', color: '#f4c95d' },
  { id: 'kugel', name: 'Pfad der Kugel', desc: 'Tempo, Rauten und Irrlichter.', glyph: 'wisp', color: '#7ef9ff' },
];

/** Kosten je Stufe – späte Knoten sind ein Langzeitziel */
export const TIER_COST = [10, 20, 35, 55, 80, 110, 150, 200];

const t = (branch: BranchId, tier: number, id: string, name: string, glyph: GlyphId, desc: string, apply: Talent['apply'], capstone = false): Talent => ({
  id,
  branch,
  tier,
  name,
  glyph,
  desc,
  cost: TIER_COST[tier - 1],
  apply,
  capstone,
});

export const TALENTS: Talent[] = [
  // ------------------------------------------------ Pfad der Flamme
  t('flamme', 1, 'glutkern1', 'Glutkern', 'flame', '<b class="g">+2 Glut</b> pro Runde jeder Kugel.', (m) => (m.lapGlut += 2)),
  t('flamme', 2, 'blut1', 'Blutsverwandt', 'drop', '<b class="f">+1 Basis-Fluch</b> für jede Drehung.', (m) => (m.baseFluch += 1)),
  t('flamme', 3, 'glutkern2', 'Schmiedefeuer', 'flame', '<b class="g">+3 Glut</b> pro Runde jeder Kugel.', (m) => (m.lapGlut += 3)),
  t('flamme', 4, 'erstschlag', 'Erstschlag', 'sword', 'Die <b>erste</b> Drehung jedes Rituals: <b class="x">×1,5 Fluch</b>.', (m) => (m.firstSpinFluch *= 1.5)),
  t('flamme', 5, 'blut2', 'Blutdurst', 'drop', '<b class="f">+2 Basis-Fluch</b> für jede Drehung.', (m) => (m.baseFluch += 2)),
  t('flamme', 6, 'glut3', 'Weißglut', 'sun', 'Am Drehende: <b class="x">×1,2 Fluch</b>.', (m) => (m.endFluch *= 1.2)),
  t('flamme', 7, 'letzte', 'Letzte Ölung', 'candle', 'Die <b>letzte</b> Drehung jedes Rituals: <b class="x">×1,75 Fluch</b>.', (m) => (m.lastSpinFluch *= 1.75)),
  t('flamme', 8, 'hoellenfeuer', 'Höllenfeuer', 'devil', 'Am Drehende zusätzlich <b class="x">×1,35 Fluch</b>.', (m) => (m.endFluch *= 1.35), true),
  // ------------------------------------------------ Pfad des Goldes
  t('gold', 1, 'blutgeld', 'Blutgeld', 'coin', 'Starte jeden Run mit <b class="s">+3 Seelen</b>.', (m) => (m.startSouls += 3)),
  t('gold', 2, 'haendler', 'Gefälligkeit des Händlers', 'key', '<b>1 kostenloses Neu-Würfeln</b> pro Basar.', (m) => (m.freeReroll += 1)),
  t('gold', 3, 'tribut', 'Tribut', 'crown', 'Jedes Ritual: <b class="s">+1 Seele</b> Belohnung.', (m) => (m.rewardAdd += 1)),
  t('gold', 4, 'wucher', 'Wucher', 'coin', '<b class="s">+5</b> maximale Zinsen.', (m) => (m.interestCap += 5)),
  t('gold', 5, 'auge', 'Drittes Auge', 'eye', '<b>+1 Arkana-Angebot</b> im Basar.', (m) => (m.extraArcanaOffer += 1)),
  t('gold', 6, 'guertel', 'Trankgürtel', 'potion', '<b>+1 Trank-Platz</b>.', (m) => (m.potionSlots += 1)),
  t('gold', 7, 'reliquie', 'Reliquie', 'crystal', 'Starte jeden Run mit einer zufälligen <b class="x">seltenen Arkana</b>.', (m) => (m.startRare += 1)),
  t('gold', 8, 'teufelshandel', 'Teufelshandel', 'horn', 'Alle Basar-Preise <b class="s">−1</b>.', (m) => (m.priceAdd -= 1), true),
  // ------------------------------------------------ Pfad der Kugel
  t('kugel', 1, 'anstoss', 'Anstoß', 'bolt', 'Die Seelenkugel startet mit <b class="t">+1,5 Tempo</b>.', (m) => (m.tempo += 1.5)),
  t('kugel', 2, 'raute1', 'Freigelegte Raute', 'rune', 'Starte mit <b>1 zusätzlichen freien Raute</b>.', (m) => (m.startSlots += 1)),
  t('kugel', 3, 'glatt', 'Geölter Kessel', 'feather', '<b class="t">−5 % Reibung</b>.', (m) => (m.friction *= 0.95)),
  t('kugel', 4, 'geisterruf', 'Geisterruf', 'wisp', '<b class="w">+2</b> maximale Irrlichter.', (m) => (m.ghostCap += 2)),
  t('kugel', 5, 'raute2', 'Zweite Raute', 'rune', 'Starte mit <b>1 weiteren freien Raute</b>.', (m) => (m.startSlots += 1)),
  t('kugel', 6, 'begleiter', 'Begleiter', 'moth', 'Jede Drehung startet mit einem <b class="w">Irrlicht</b>.', (m) => (m.startGhosts += 1)),
  t('kugel', 7, 'fortuna', 'Fortunas Gunst', 'dice', 'Alle Wahrscheinlichkeiten <b>×1,25</b>.', (m) => (m.luck *= 1.25)),
  t('kugel', 8, 'ewigebahn', 'Ewige Bahn', 'infinity', 'Die Reibung wächst <b class="t">40 % langsamer</b>.', (m) => (m.frictionGrowth *= 0.6), true),
];

export const TALENT_BY_ID: Record<string, Talent> = Object.fromEntries(TALENTS.map((x) => [x.id, x]));

export const EMPTY_META: MetaBonuses = {
  startSouls: 0,
  startSlots: 0,
  lapGlut: 0,
  freeReroll: 0,
  extraArcanaOffer: 0,
  baseFluch: 0,
  firstSpinFluch: 1,
  lastSpinFluch: 1,
  endFluch: 1,
  rewardAdd: 0,
  interestCap: 0,
  potionSlots: 0,
  startRare: 0,
  priceAdd: 0,
  tempo: 0,
  friction: 1,
  frictionGrowth: 1,
  ghostCap: 0,
  startGhosts: 0,
  luck: 1,
};

/** Ergänzt fehlende Felder (ältere Spielstände) */
export function fullMeta(m: Partial<MetaBonuses> | undefined): MetaBonuses {
  return { ...EMPTY_META, ...(m ?? {}) };
}

export function talentBonuses(owned: readonly string[]): MetaBonuses {
  const m = { ...EMPTY_META };
  for (const id of owned) TALENT_BY_ID[id]?.apply(m);
  return m;
}

/** Kann der Knoten gekauft werden? (Vorgänger im Ast muss gekauft sein) */
export function talentAvailable(owned: readonly string[], talent: Talent): boolean {
  if (owned.includes(talent.id)) return false;
  if (talent.tier === 1) return true;
  const prev = TALENTS.find((x) => x.branch === talent.branch && x.tier === talent.tier - 1);
  return !!prev && owned.includes(prev.id);
}

export const TALENT_TOTAL_COST = TALENTS.reduce((s, x) => s + x.cost, 0);
