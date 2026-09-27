import { addFluch, addGlut, addSouls, addTempo, lv, mulFluch, roll, spawnGhost } from '../core/effects';
import { fmtMult } from '../core/num';
import { colorOf, isEven, isOdd } from '../core/wheel';
import type { ArcanaDef, Src } from '../core/types';
import { minorArcana } from './arcana-minor';

const S = (i: number): Src => ({ k: 'arcana', i });
const n = (v: number) => fmtMult(v);

export const ARCANA: ArcanaDef[] = [
  {
    id: 'narr',
    name: 'Der Narr',
    numeral: '0',
    glyph: 'fool',
    rarity: 'common',
    cost: 4,
    desc: (l) => `Zu Beginn jeder Drehung: <b class="f">+${n(lv(l, 2))} Fluch</b>.`,
    hooks: {
      spinStart: (ctx, self, i) => (addFluch(ctx, lv(self.level, 2), S(i)), true),
    },
  },
  {
    id: 'magier',
    name: 'Der Magier',
    numeral: 'I',
    glyph: 'wand',
    rarity: 'rare',
    cost: 8,
    desc: (l) =>
      `Löst die Arkana <b>links</b> daneben <b>${1 + Math.floor((l - 1) / 2)}×</b> zusätzlich aus, wann immer sie auslöst.`,
    hooks: {},
  },
  {
    id: 'priesterin',
    name: 'Die Hohepriesterin',
    numeral: 'II',
    glyph: 'moon',
    rarity: 'uncommon',
    cost: 6,
    desc: (l) => `Landet die Kugel auf einer <b>ungeraden</b> Zahl: <b class="x">×${n(lv(l, 1.5, 0.25))} Fluch</b>.`,
    hooks: {
      land: (ctx, self, i, p) => {
        if (!isOdd(p)) return false;
        mulFluch(ctx, lv(self.level, 1.5, 0.25), S(i));
        return true;
      },
    },
  },
  {
    id: 'herrscherin',
    name: 'Die Herrscherin',
    numeral: 'III',
    glyph: 'crown',
    rarity: 'common',
    cost: 4,
    desc: (l) => `Jede Runde einer Kugel (auch Irrlichter): <b class="g">+${n(lv(l, 3))} Glut</b>.`,
    hooks: {
      lap: (ctx, self, i, b) => (addGlut(ctx, lv(self.level, 3), S(i), b.id), true),
    },
  },
  {
    id: 'herrscher',
    name: 'Der Herrscher',
    numeral: 'IV',
    glyph: 'throne',
    rarity: 'uncommon',
    cost: 5,
    desc: (l) => `Jedes Mal, wenn ein Siegel auslöst: <b class="g">+${n(lv(l, 3))} Glut</b>.`,
    hooks: {
      sigil: (ctx, self, i, _slot, b) => (addGlut(ctx, lv(self.level, 3), S(i), b.id), true),
    },
  },
  {
    id: 'hierophant',
    name: 'Der Hierophant',
    numeral: 'V',
    glyph: 'key',
    rarity: 'uncommon',
    cost: 5,
    desc: (l) => `Einsatz getroffen: <b class="s">+${l} Seele${l > 1 ? 'n' : ''}</b>.`,
    hooks: {
      betHit: (ctx, self, i) => (addSouls(ctx, self.level, S(i)), true),
    },
  },
  {
    id: 'liebende',
    name: 'Die Liebenden',
    numeral: 'VI',
    glyph: 'heart',
    rarity: 'uncommon',
    cost: 6,
    desc: (l) => `Wenn ein Irrlicht erscheint: <b class="f">+${n(lv(l, 2))} Fluch</b>.`,
    hooks: {
      ghost: (ctx, self, i, b) => (addFluch(ctx, lv(self.level, 2), S(i), b.id), true),
    },
  },
  {
    id: 'wagen',
    name: 'Der Wagen',
    numeral: 'VII',
    glyph: 'chariot',
    rarity: 'common',
    cost: 4,
    desc: (l) => `Die Seelenkugel startet mit <b class="t">+${n(lv(l, 3))} Tempo</b> (≈ +${l} Runde${l > 1 ? 'n' : ''}).`,
    hooks: {
      spinStart: (ctx, self, i) => (addTempo(ctx, ctx.balls[0], lv(self.level, 3), S(i)), true),
    },
  },
  {
    id: 'kraft',
    name: 'Die Kraft',
    numeral: 'VIII',
    glyph: 'lion',
    rarity: 'uncommon',
    cost: 6,
    desc: (l) => `Jede <b>2.</b> Runde der Seelenkugel: <b class="f">+${n(lv(l, 1))} Fluch</b>.`,
    hooks: {
      lap: (ctx, self, i, b) => {
        if (b.ghost || b.laps % 2 !== 0) return false;
        addFluch(ctx, lv(self.level, 1), S(i), b.id);
        return true;
      },
    },
  },
  {
    id: 'eremit',
    name: 'Der Eremit',
    numeral: 'IX',
    glyph: 'lantern',
    rarity: 'uncommon',
    cost: 5,
    desc: (l) => `Ritualende: <b class="s">+1 Seele je 4 Seelen</b> (max. ${2 + l}).`,
    hooks: {
      ritualEnd: (run, self, _i, log) => {
        const s = Math.min(Math.floor(run.souls / 4), 2 + self.level);
        if (s > 0) log.push({ label: 'Der Eremit', souls: s });
      },
    },
  },
  {
    id: 'rad',
    name: 'Rad des Schicksals',
    numeral: 'X',
    glyph: 'wheel',
    rarity: 'rare',
    cost: 7,
    desc: (l) => `Bei der Landung: <b>1 zu 6</b> Chance auf <b class="x">×${n(lv(l, 10, 5))} Fluch</b>.`,
    hooks: {
      land: (ctx, self, i) => {
        if (!roll(ctx, 1 / 6)) return false;
        mulFluch(ctx, lv(self.level, 10, 5), S(i));
        return true;
      },
    },
  },
  {
    id: 'gerechtigkeit',
    name: 'Die Gerechtigkeit',
    numeral: 'XI',
    glyph: 'scales',
    rarity: 'common',
    cost: 4,
    desc: (l) => `Landet die Kugel auf einer <b>geraden</b> Zahl: <b class="f">+${n(lv(l, 4))} Fluch</b>.`,
    hooks: {
      land: (ctx, self, i, p) => {
        if (!isEven(p)) return false;
        addFluch(ctx, lv(self.level, 4), S(i));
        return true;
      },
    },
  },
  {
    id: 'gehaengte',
    name: 'Der Gehängte',
    numeral: 'XII',
    glyph: 'hanged',
    rarity: 'rare',
    cost: 7,
    desc: (l) => `Jede <b>${Math.max(2, 7 - l)}.</b> Runde der Seelenkugel beschwört ein <b class="w">Irrlicht</b>.`,
    hooks: {
      lap: (ctx, self, i, b) => {
        if (b.ghost || b.laps % Math.max(2, 7 - self.level) !== 0) return false;
        return spawnGhost(ctx, S(i)) !== null;
      },
    },
  },
  {
    id: 'tod',
    name: 'Der Tod',
    numeral: 'XIII',
    glyph: 'skull',
    rarity: 'rare',
    cost: 6,
    desc: (l, inst) =>
      `Ritualende: <b>vernichtet</b> die Arkana rechts daneben und speichert <b class="f">+${n(lv(l, 4, 2))} Fluch</b> (+2 je Stufe des Opfers). Drehstart: <b class="f">+${n(inst?.state.stored ?? 0)} Fluch</b>.`,
    hooks: {
      spinStart: (ctx, self, i) => {
        const v = self.state.stored ?? 0;
        if (v <= 0) return false;
        addFluch(ctx, v, S(i));
        return true;
      },
      ritualEnd: (run, self, i) => {
        const victim = run.arcana[i + 1];
        if (!victim) return;
        run.arcana.splice(i + 1, 1);
        self.state.stored = (self.state.stored ?? 0) + lv(self.level, 4, 2) + victim.level * 2;
      },
    },
  },
  {
    id: 'maessigkeit',
    name: 'Die Mäßigkeit',
    numeral: 'XIV',
    glyph: 'cup',
    rarity: 'common',
    cost: 4,
    desc: (l) => `Bei der Landung: <b class="g">+${n(lv(l, 2))} Glut × Fachnummer</b>.`,
    hooks: {
      land: (ctx, self, i, p) => {
        if (p === 0) return false;
        addGlut(ctx, p * lv(self.level, 2), S(i));
        return true;
      },
    },
  },
  {
    id: 'teufel',
    name: 'Der Teufel',
    numeral: 'XV',
    glyph: 'devil',
    rarity: 'legendary',
    cost: 10,
    desc: (l) =>
      `Drehende: <b class="x">×(1 + ${n(lv(l, 0.05, 0.025))} je Runde)</b> Fluch — gezählt werden die Runden der Seelenkugel.`,
    hooks: {
      spinEnd: (ctx, self, i) => {
        if (ctx.mainLaps <= 0) return false;
        mulFluch(ctx, 1 + lv(self.level, 0.05, 0.025) * ctx.mainLaps, S(i));
        return true;
      },
    },
  },
  {
    id: 'turm',
    name: 'Der Turm',
    numeral: 'XVI',
    glyph: 'tower',
    rarity: 'uncommon',
    cost: 5,
    desc: (l) =>
      `Landung im <b>Höllenfach</b>: <b class="x">×${n(lv(l, 6, 3))} Fluch</b>. Auf dessen Nachbarn (32, 26): <b class="x">×${n(lv(l, 2, 0.5))}</b>.`,
    hooks: {
      land: (ctx, self, i, p) => {
        if (p === 0) mulFluch(ctx, lv(self.level, 6, 3), S(i));
        else if (p === 32 || p === 26) mulFluch(ctx, lv(self.level, 2, 0.5), S(i));
        else return false;
        return true;
      },
    },
  },
  {
    id: 'stern',
    name: 'Der Stern',
    numeral: 'XVII',
    glyph: 'star',
    rarity: 'uncommon',
    cost: 6,
    desc: (l) =>
      `Einsätze auf eine <b>Zahl</b> treffen auch die <b>±${1 + Math.floor((l - 1) / 2)}</b> Nachbarfächer im Kessel.`,
    hooks: {},
  },
  {
    id: 'mond',
    name: 'Der Mond',
    numeral: 'XVIII',
    glyph: 'moon',
    rarity: 'common',
    cost: 5,
    desc: (l) => `Landung auf <b>Schwarz</b>: <b class="g">+${n(lv(l, 3))} Glut</b> je gefahrener Runde.`,
    hooks: {
      land: (ctx, self, i, p) => {
        if (colorOf(p) !== 'black') return false;
        addGlut(ctx, lv(self.level, 3) * Math.max(1, ctx.mainLaps), S(i));
        return true;
      },
    },
  },
  {
    id: 'sonne',
    name: 'Die Sonne',
    numeral: 'XIX',
    glyph: 'sun',
    rarity: 'common',
    cost: 4,
    desc: (l) => `Landung auf <b>Rot</b>: <b class="f">+${n(lv(l, 3))} Fluch</b>.`,
    hooks: {
      land: (ctx, self, i, p) => {
        if (colorOf(p) !== 'red') return false;
        addFluch(ctx, lv(self.level, 3), S(i));
        return true;
      },
    },
  },
  {
    id: 'gericht',
    name: 'Das Gericht',
    numeral: 'XX',
    glyph: 'trumpet',
    rarity: 'uncommon',
    cost: 5,
    desc: (l, inst) =>
      `Einsatz verfehlt: dauerhaft <b class="g">+${n(lv(l, 6))} Glut</b> je Drehung. (Aktuell: +${n(inst?.state.glut ?? 0)})`,
    hooks: {
      spinStart: (ctx, self, i) => {
        const v = self.state.glut ?? 0;
        if (v <= 0) return false;
        addGlut(ctx, v, S(i));
        return true;
      },
      betMiss: (_ctx, self) => {
        self.state.glut = (self.state.glut ?? 0) + lv(self.level, 6);
        return true;
      },
    },
  },
  {
    id: 'welt',
    name: 'Die Welt',
    numeral: 'XXI',
    glyph: 'world',
    rarity: 'legendary',
    cost: 12,
    desc: (l) => `Alle Siegel lösen <b>${1 + Math.floor(l / 3)}×</b> zusätzlich aus.`,
    hooks: {},
  },
  {
    id: 'hexe',
    name: 'Die Hexe',
    numeral: 'XXII',
    glyph: 'witch',
    rarity: 'uncommon',
    cost: 5,
    desc: (l) => `Jedes Irrlicht erhält <b class="t">+${n(lv(l, 3))} Tempo</b> (fährt länger).`,
    hooks: {
      ghost: (ctx, self, i, b) => (addTempo(ctx, b, lv(self.level, 3), S(i)), true),
    },
  },
  {
    id: 'schatten',
    name: 'Der Schatten',
    numeral: 'XXIII',
    glyph: 'shadow',
    rarity: 'rare',
    cost: 8,
    desc: (l) => {
      const c = 1 + Math.floor((l - 1) / 2);
      return `Drehstart: beschwört <b class="w">${c} Irrlicht${c > 1 ? 'er' : ''}</b>.`;
    },
    hooks: {
      spinStart: (ctx, self, i) => {
        let any = false;
        for (let k = 0; k < 1 + Math.floor((self.level - 1) / 2); k++) any = !!spawnGhost(ctx, S(i)) || any;
        return any;
      },
    },
  },
  {
    id: 'auge',
    name: 'Das Auge',
    numeral: 'XXIV',
    glyph: 'eye',
    rarity: 'uncommon',
    cost: 6,
    desc: (l) => `Jedes Mal, wenn ein Siegel auslöst: <b class="f">+${n(lv(l, 0.5))} Fluch</b>.`,
    hooks: {
      sigil: (ctx, self, i, _s, b) => (addFluch(ctx, lv(self.level, 0.5), S(i), b.id), true),
    },
  },
];

export const ARCANA_BY_ID: Record<string, ArcanaDef> = {};
ARCANA.push(...minorArcana(() => ARCANA_BY_ID));
for (const a of ARCANA) ARCANA_BY_ID[a.id] = a;
