import { addFluch, addGlut, addSouls, addTempo, lv, mulFluch, spawnGhost } from '../core/effects';
import { fmtMult } from '../core/num';
import type { ArcanaDef, Src } from '../core/types';
import { colorOf, isEven, isOdd } from '../core/wheel';

const S = (i: number): Src => ({ k: 'arcana', i });
const n = (v: number) => fmtMult(v);

/** Legendäre Arkana, die nur durch Fusion zweier Karten entstehen */
export const FUSION_ARCANA: ArcanaDef[] = [
  {
    id: 'finsternis',
    name: 'Sonnenfinsternis',
    numeral: 'XIX·XVIII',
    glyph: 'sun',
    rarity: 'legendary',
    cost: 12,
    desc: (l) =>
      `Landung auf <b>Rot</b>: <b class="x">×${n(lv(l, 1.6, 0.2))} Fluch</b>. Landung auf <b>Schwarz</b>: <b class="g">+${n(lv(l, 6, 3))} Glut</b> je gefahrener Runde.`,
    hooks: {
      land: (ctx, self, i, p) => {
        const c = colorOf(p, ctx.wheel);
        if (c === 'red') mulFluch(ctx, lv(self.level, 1.6, 0.2), S(i));
        else if (c === 'black') addGlut(ctx, lv(self.level, 6, 3) * Math.max(1, ctx.mainLaps), S(i));
        else return false;
        return true;
      },
    },
  },
  {
    id: 'kaiserpaar',
    name: 'Das Kaiserpaar',
    numeral: 'III·IV',
    glyph: 'crown',
    rarity: 'legendary',
    cost: 12,
    desc: (l) =>
      `Jede Runde einer Kugel: <b class="g">+${n(lv(l, 5, 3))} Glut</b>. Jedes Siegel: <b class="g">+${n(lv(l, 5, 3))} Glut</b> und <b class="f">+${n(lv(l, 0.3, 0.15))} Fluch</b>.`,
    hooks: {
      lap: (ctx, self, i, b) => (addGlut(ctx, lv(self.level, 5, 3), S(i), b.id), true),
      sigil: (ctx, self, i, _s, b) => {
        addGlut(ctx, lv(self.level, 5, 3), S(i), b.id);
        addFluch(ctx, lv(self.level, 0.3, 0.15), S(i), b.id);
        return true;
      },
    },
  },
  {
    id: 'schicksalswaage',
    name: 'Waage des Schicksals',
    numeral: 'II·XI',
    glyph: 'scales',
    rarity: 'legendary',
    cost: 12,
    desc: (l) =>
      `Landung auf <b>ungerade</b>: <b class="x">×${n(lv(l, 1.75, 0.25))} Fluch</b>. Auf <b>gerade</b>: <b class="f">+${n(lv(l, 8, 4))} Fluch</b>, dann <b class="x">×1,25</b>.`,
    hooks: {
      land: (ctx, self, i, p) => {
        if (isOdd(p)) mulFluch(ctx, lv(self.level, 1.75, 0.25), S(i));
        else if (isEven(p)) {
          addFluch(ctx, lv(self.level, 8, 4), S(i));
          mulFluch(ctx, 1.25, S(i));
        } else return false;
        return true;
      },
    },
  },
  {
    id: 'braeutigam',
    name: 'Der Geisterbräutigam',
    numeral: 'VI·XXIII',
    glyph: 'moth',
    rarity: 'legendary',
    cost: 12,
    desc: (l) => {
      const c = 1 + Math.floor((l - 1) / 2);
      return `Drehstart: beschwört <b class="w">${c} Irrlicht${c > 1 ? 'er' : ''}</b>. Jedes erscheinende Irrlicht: <b class="f">+${n(lv(l, 2.5, 1.25))} Fluch</b>.`;
    },
    hooks: {
      spinStart: (ctx, self, i) => {
        let any = false;
        for (let k = 0; k < 1 + Math.floor((self.level - 1) / 2); k++) any = !!spawnGhost(ctx, S(i)) || any;
        return any;
      },
      ghost: (ctx, self, i, b) => (addFluch(ctx, lv(self.level, 2.5, 1.25), S(i), b.id), true),
    },
  },
  {
    id: 'wilderritt',
    name: 'Der Wilde Ritt',
    numeral: '0·VII',
    glyph: 'chariot',
    rarity: 'legendary',
    cost: 12,
    desc: (l) => `Drehstart: <b class="f">+${n(lv(l, 4, 2))} Fluch</b> und <b class="t">+${n(lv(l, 4, 2))} Tempo</b> für die Seelenkugel.`,
    hooks: {
      spinStart: (ctx, self, i) => {
        addFluch(ctx, lv(self.level, 4, 2), S(i));
        addTempo(ctx, ctx.balls[0], lv(self.level, 4, 2), S(i));
        return true;
      },
    },
  },
  {
    id: 'hoherrat',
    name: 'Der Hohe Rat',
    numeral: 'V·IX',
    glyph: 'book',
    rarity: 'legendary',
    cost: 12,
    desc: (l) => `Einsatz getroffen: <b class="s">+${l + 1} Seelen</b>. Ritualende: <b class="s">+1 Seele je 3 Seelen</b> (max. ${4 + l}).`,
    hooks: {
      betHit: (ctx, self, i) => (addSouls(ctx, self.level + 1, S(i)), true),
      ritualEnd: (run, self, _i, log) => {
        const s = Math.min(Math.floor(run.souls / 3), 4 + self.level);
        if (s > 0) log.push({ label: 'Der Hohe Rat', souls: s });
      },
    },
  },
];

export interface FusionRecipe {
  a: string;
  b: string;
  result: string;
}

/** Beide Zutaten müssen mindestens diese Stufe haben */
export const FUSION_LEVEL = 3;
export const FUSION_PRICE = 6;

export const FUSIONS: FusionRecipe[] = [
  { a: 'sonne', b: 'mond', result: 'finsternis' },
  { a: 'herrscherin', b: 'herrscher', result: 'kaiserpaar' },
  { a: 'priesterin', b: 'gerechtigkeit', result: 'schicksalswaage' },
  { a: 'liebende', b: 'schatten', result: 'braeutigam' },
  { a: 'narr', b: 'wagen', result: 'wilderritt' },
  { a: 'hierophant', b: 'eremit', result: 'hoherrat' },
];

/** Rezepte, an denen eine Arkana beteiligt ist */
export function recipesWith(id: string): FusionRecipe[] {
  return FUSIONS.filter((r) => r.a === id || r.b === id);
}
