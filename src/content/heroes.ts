import type { Rng } from '../core/rng';
import type { GlyphId, RunState, Stats } from '../core/types';
import { POTIONS } from './potions';
import { levelFor } from './unlocks';

/** Fortschrittswerte, die über Freischaltungen der Beschwörer entscheiden */
export interface HeroProgress {
  runs: number;
  bestCircle: number;
  victories: number;
  insightXp: number;
}

export interface HeroDef {
  id: string;
  name: string;
  title: string;
  glyph: GlyphId;
  color: string;
  /** Vorteile und Nachteile, als HTML-Liste */
  perks: string[];
  unlockHint: string;
  unlocked: (p: HeroProgress) => boolean;
  start?: (run: RunState, rng: Rng) => void;
  mod?: (s: Stats) => void;
}

const setStartSigil = (run: RunState, id: string) => {
  run.sigils[0] = { uid: run.uid++, id, level: 1 };
};

export const HEROES: HeroDef[] = [
  {
    id: 'wanderer',
    name: 'Der Wanderer',
    title: 'Ein Sterblicher ohne Namen',
    glyph: 'lantern',
    color: '#c9a25a',
    perks: ['Keine Besonderheit – der klassische Pakt.', 'Start mit dem <b>Glutsiegel</b>.'],
    unlockHint: '',
    unlocked: () => true,
  },
  {
    id: 'hexe',
    name: 'Die Hexe',
    title: 'Braut des Kessels',
    glyph: 'witch',
    color: '#9dff7a',
    perks: [
      'Start mit <b>2 zufälligen Tränken</b>.',
      '<b>+1 Trank-Platz</b>, Tränke kosten <b class="s">−1</b>.',
      '<b class="bad">−2 Start-Seelen</b>.',
    ],
    unlockHint: 'Spiele 3 Runs.',
    unlocked: (p) => p.runs >= 3,
    start: (run, rng) => {
      run.souls = Math.max(0, run.souls - 2);
      const pool = POTIONS.filter((p) => !run.pool || run.pool.includes(`potion:${p.id}`));
      for (let k = 0; k < 2 && pool.length; k++) run.potions.push(rng.pick(pool).id);
    },
    mod: (s) => ((s.potionSlots += 1), (s.potionDiscount += 1)),
  },
  {
    id: 'spieler',
    name: 'Der Spieler',
    title: 'Hat seine Seele schon einmal verwettet',
    glyph: 'dice',
    color: '#ffd76a',
    perks: [
      'Start mit dem <b>Knochenwürfel</b> statt des Glutsiegels.',
      'Zahl zahlt <b class="x">×27</b> statt ×18, Dutzend <b class="x">×3,5</b> statt ×3.',
      'Farbe, Gerade/Ungerade und Hälfte zahlen nur <b class="bad">×1,6</b>.',
    ],
    unlockHint: 'Erreiche den 3. Höllenkreis.',
    unlocked: (p) => p.bestCircle >= 3,
    start: (run) => setStartSigil(run, 'wuerfel'),
    mod: (s) => {
      s.numberPay *= 1.5;
      s.dozenPay += 0.5;
      s.colorPay -= 0.4;
      s.parityPay -= 0.4;
      s.halfPay -= 0.4;
    },
  },
  {
    id: 'seher',
    name: 'Der Geisterseher',
    title: 'Sieht, was zwischen den Fächern wandelt',
    glyph: 'wisp',
    color: '#7ef9ff',
    perks: [
      'Start mit dem <b>Irrlichtsiegel</b> statt des Glutsiegels.',
      'Jede Drehung startet mit einem <b class="w">Irrlicht</b>.',
      '<b class="bad">−4 Glut</b> pro Runde.',
    ],
    unlockHint: 'Erreiche Erkenntnis-Stufe 2.',
    unlocked: (p) => levelFor(p.insightXp) >= 2,
    start: (run) => setStartSigil(run, 'irrlicht'),
    mod: (s) => ((s.startGhosts += 1), (s.lapGlut -= 4)),
  },
  {
    id: 'graefin',
    name: 'Die Blutgräfin',
    title: 'Badet in dem, was andere opfern',
    glyph: 'drop',
    color: '#ff3b5c',
    perks: [
      'Start mit dem <b>Blutsiegel</b> statt des Glutsiegels.',
      '<b class="f">+1 Basis-Fluch</b>.',
      'Jedes Ritual <b class="bad">−1 Seele</b> Belohnung, <b class="bad">−1 Tempo</b>, <b class="bad">−2 Start-Seelen</b>.',
    ],
    unlockHint: 'Erreiche den 5. Höllenkreis.',
    unlocked: (p) => p.bestCircle >= 5,
    start: (run) => {
      setStartSigil(run, 'blut');
      run.souls = Math.max(0, run.souls - 2);
    },
    mod: (s) => ((s.baseFluch += 1), (s.rewardAdd -= 1), (s.tempo -= 1)),
  },
  {
    id: 'alchemist',
    name: 'Der Alchemist',
    title: 'Verwandelt Blei in Seelen',
    glyph: 'crystal',
    color: '#d88cff',
    perks: [
      '<b>1 kostenloses Neu-Würfeln</b> pro Basar.',
      '<b>+1 Arkana-</b> und <b>+1 Siegel-Angebot</b> im Basar.',
      'Nur <b class="bad">4 Arkana-Plätze</b>.',
    ],
    unlockHint: 'Besiege Luzifer einmal.',
    unlocked: (p) => p.victories >= 1,
    mod: (s) => ((s.freeRerolls += 1), (s.shopArcana += 1), (s.shopSigils += 1), (s.arcanaSlots -= 1)),
  },
];

export const HERO_BY_ID: Record<string, HeroDef> = Object.fromEntries(HEROES.map((x) => [x.id, x]));

export function heroOf(run: Pick<RunState, 'hero'>): HeroDef {
  return HERO_BY_ID[run.hero ?? 'wanderer'] ?? HEROES[0];
}
