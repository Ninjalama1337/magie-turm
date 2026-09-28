import type { GlyphId, RunState, SigilInst, Stats } from '../core/types';

/** Jedes Siegel gehört zu einem Element – daraus entstehen Resonanz und Bünde. */
export type ElementId = 'flamme' | 'blut' | 'sturm' | 'geist' | 'gold' | 'arkan';

export interface BondTier {
  /** Benötigte Siegel dieses Elements auf freien Rauten */
  n: number;
  desc: string;
  mod: (s: Stats) => void;
}

export interface ElementDef {
  id: ElementId;
  name: string;
  glyph: GlyphId;
  color: string;
  tiers: BondTier[];
}

export const ELEMENTS: ElementDef[] = [
  {
    id: 'flamme',
    name: 'Flamme',
    glyph: 'flame',
    color: '#ff9a3c',
    tiers: [
      { n: 3, desc: '<b class="g">+3 Glut</b> pro Runde', mod: (s) => (s.lapGlut += 3) },
      { n: 5, desc: 'Am Drehende <b class="g">×1,5 Glut</b>', mod: (s) => (s.endGlut *= 1.5) },
    ],
  },
  {
    id: 'blut',
    name: 'Blut',
    glyph: 'drop',
    color: '#ff3b5c',
    tiers: [
      { n: 3, desc: '<b class="f">+2 Basis-Fluch</b>', mod: (s) => (s.baseFluch += 2) },
      { n: 5, desc: 'Am Drehende <b class="x">×1,5 Fluch</b>', mod: (s) => (s.endFluch *= 1.5) },
    ],
  },
  {
    id: 'sturm',
    name: 'Sturm',
    glyph: 'bolt',
    color: '#a594ff',
    tiers: [
      { n: 3, desc: '<b class="t">+2 Tempo</b>', mod: (s) => (s.tempo += 2) },
      { n: 5, desc: '<b class="t">−15 % Reibung</b>, Reibung wächst 25 % langsamer', mod: (s) => ((s.friction *= 0.85), (s.frictionGrowth *= 0.75)) },
    ],
  },
  {
    id: 'geist',
    name: 'Geist',
    glyph: 'wisp',
    color: '#7ef9ff',
    tiers: [
      { n: 2, desc: '<b class="w">+2</b> maximale Irrlichter', mod: (s) => (s.ghostCap += 2) },
      { n: 4, desc: 'Jede Drehung startet mit einem <b class="w">Irrlicht</b>', mod: (s) => (s.startGhosts += 1) },
    ],
  },
  {
    id: 'gold',
    name: 'Gold',
    glyph: 'coin',
    color: '#f4c95d',
    tiers: [
      { n: 2, desc: 'Jedes Ritual <b class="s">+1 Seele</b>', mod: (s) => (s.rewardAdd += 1) },
      { n: 3, desc: '<b class="s">+5</b> maximale Zinsen', mod: (s) => (s.interestCap += 5) },
    ],
  },
  {
    id: 'arkan',
    name: 'Arkan',
    glyph: 'eye',
    color: '#d88cff',
    tiers: [
      { n: 2, desc: 'Alle Wahrscheinlichkeiten <b>×1,25</b>', mod: (s) => (s.luck *= 1.25) },
      { n: 4, desc: '<b>+1 Arkana-Platz</b>', mod: (s) => (s.arcanaSlots += 1) },
    ],
  },
];

export const ELEMENT_BY_ID: Record<ElementId, ElementDef> = Object.fromEntries(ELEMENTS.map((e) => [e.id, e])) as Record<ElementId, ElementDef>;

export const SIGIL_ELEMENT: Record<string, ElementId> = {
  glut: 'flamme',
  echo: 'flamme',
  sanduhr: 'flamme',
  kerze: 'flamme',
  kelch: 'flamme',
  wuerfel: 'flamme',
  fluch: 'blut',
  blut: 'blut',
  pentagramm: 'blut',
  altar: 'blut',
  nadir: 'blut',
  schaedel: 'blut',
  glocke: 'blut',
  schwert: 'blut',
  tempo: 'sturm',
  frost: 'sturm',
  stab: 'sturm',
  sturmauge: 'sturm',
  umkehr: 'sturm',
  irrlicht: 'geist',
  magnet: 'geist',
  horn: 'geist',
  rune: 'geist',
  seelen: 'gold',
  goldader: 'gold',
  muenze: 'gold',
  spiegel: 'arkan',
  kette: 'arkan',
  zwilling: 'arkan',
  blitz: 'arkan',
};

export function elementOf(sigilId: string): ElementDef | undefined {
  const e = SIGIL_ELEMENT[sigilId];
  return e ? ELEMENT_BY_ID[e] : undefined;
}

type SigilBoard = Pick<RunState, 'sigils' | 'sigilUnlocked'>;

function activeSigils(run: SigilBoard): (SigilInst | null)[] {
  return run.sigils.slice(0, Math.min(run.sigilUnlocked, run.sigils.length));
}

/**
 * Resonanz: Ein Siegel, dessen Nachbar-Raute ein Siegel desselben Elements trägt,
 * wirkt eine Stufe stärker.
 */
export function resonance(run: SigilBoard): boolean[] {
  const act = activeSigils(run);
  return run.sigils.map((s, i) => {
    if (!s || i >= act.length) return false;
    const e = SIGIL_ELEMENT[s.id];
    if (!e) return false;
    const prev = act[i - 1];
    const next = act[i + 1];
    return (!!prev && SIGIL_ELEMENT[prev.id] === e) || (!!next && SIGIL_ELEMENT[next.id] === e);
  });
}

export interface ActiveBond {
  element: ElementDef;
  count: number;
  /** Erreichte Stufen (0 = noch keine) */
  tier: number;
}

/** Siegel je Element auf freien Rauten, inkl. erreichter Bund-Stufe */
export function bonds(run: SigilBoard): ActiveBond[] {
  const counts = new Map<ElementId, number>();
  for (const s of activeSigils(run)) {
    const e = s && SIGIL_ELEMENT[s.id];
    if (e) counts.set(e, (counts.get(e) ?? 0) + 1);
  }
  return ELEMENTS.filter((e) => counts.has(e.id)).map((e) => {
    const count = counts.get(e.id)!;
    return { element: e, count, tier: e.tiers.filter((t) => count >= t.n).length };
  });
}

export function applyBonds(s: Stats, run: SigilBoard): void {
  for (const b of bonds(run)) for (let k = 0; k < b.tier; k++) b.element.tiers[k].mod(s);
}
