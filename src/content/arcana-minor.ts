import { addFluch, addGlut, addSouls, addTempo, lv, mulFluch, spawnGhost } from '../core/effects';
import { fmtMult } from '../core/num';
import { betMatches } from '../core/spin';
import type { ArcanaDef, RunState, Src, Suit } from '../core/types';

const S = (i: number): Src => ({ k: 'arcana', i });
const n = (v: number) => fmtMult(v);

export const SUIT_NAME: Record<Suit, string> = {
  staebe: 'Stäbe',
  kelche: 'Kelche',
  schwerter: 'Schwerter',
  muenzen: 'Münzen',
};

/** Anzahl der Arkana einer Farbe im Run */
export function suitCount(run: RunState, suit: Suit, byId: Record<string, ArcanaDef>): number {
  return run.arcana.filter((a) => byId[a.id]?.suit === suit).length;
}

/** Kleine Arkana – Farben-Synergien. `byId` wird nachgereicht, um Zirkelimporte zu vermeiden. */
export function minorArcana(byId: () => Record<string, ArcanaDef>): ArcanaDef[] {
  const count = (run: RunState, suit: Suit) => suitCount(run, suit, byId());
  return [
    // ------------------------------------------------------------ Stäbe (Tempo)
    {
      id: 'ass_staebe',
      name: 'Ass der Stäbe',
      numeral: 'As',
      glyph: 'staff',
      rarity: 'common',
      cost: 4,
      suit: 'staebe',
      desc: (l) => `Drehstart: <b class="t">+${n(lv(l, 1.5, 0.75))} Tempo</b> je Stäbe-Karte.`,
      hooks: {
        spinStart: (ctx, self, i) => (addTempo(ctx, ctx.balls[0], lv(self.level, 1.5, 0.75) * count(ctx.run, 'staebe'), S(i)), true),
      },
    },
    {
      id: 'zwei_staebe',
      name: 'Zwei der Stäbe',
      numeral: 'II',
      glyph: 'staff',
      rarity: 'uncommon',
      cost: 5,
      suit: 'staebe',
      desc: (l) => `Jede Runde der Seelenkugel ab der <b>8.</b>: <b class="f">+${n(lv(l, 1))} Fluch</b>.`,
      hooks: {
        lap: (ctx, self, i, b) => {
          if (b.ghost || b.laps < 8) return false;
          addFluch(ctx, lv(self.level, 1), S(i), b.id);
          return true;
        },
      },
    },
    {
      id: 'drei_staebe',
      name: 'Drei der Stäbe',
      numeral: 'III',
      glyph: 'staff',
      rarity: 'uncommon',
      cost: 6,
      suit: 'staebe',
      desc: (l) => `Landung: <b class="g">+Runden² × ${n(lv(l, 1))} Glut</b>.`,
      hooks: {
        land: (ctx, self, i) => (addGlut(ctx, ctx.mainLaps * ctx.mainLaps * lv(self.level, 1), S(i)), true),
      },
    },
    {
      id: 'ritter_staebe',
      name: 'Ritter der Stäbe',
      numeral: 'Ritter',
      glyph: 'chariot',
      rarity: 'rare',
      cost: 7,
      suit: 'staebe',
      desc: (l) => `Drehende: Fuhr die Seelenkugel <b>≥ 12 Runden</b>, <b class="x">×${n(lv(l, 2, 0.5))} Fluch</b>.`,
      hooks: {
        spinEnd: (ctx, self, i) => {
          if (ctx.mainLaps < 12) return false;
          mulFluch(ctx, lv(self.level, 2, 0.5), S(i));
          return true;
        },
      },
    },
    {
      id: 'koenig_staebe',
      name: 'König der Stäbe',
      numeral: 'König',
      glyph: 'crown',
      rarity: 'rare',
      cost: 7,
      suit: 'staebe',
      desc: (l) => `Passiv: <b class="t">−${Math.round(lv(l, 8, 4))} % Reibung</b>.`,
      hooks: {},
      mod: (s, a) => {
        s.friction *= 1 - lv(a.level, 0.08, 0.04);
      },
    },
    {
      id: 'page_staebe',
      name: 'Page der Stäbe',
      numeral: 'Page',
      glyph: 'staff',
      rarity: 'common',
      cost: 4,
      suit: 'staebe',
      desc: (l) => `Jede <b>5.</b> Runde der Seelenkugel: <b class="s">+1 Seele</b> (max. ${l} pro Drehung).`,
      hooks: {
        lap: (ctx, self, i, b) => {
          if (b.ghost || b.laps % 5 !== 0) return false;
          const k = 'page_staebe' + i;
          if ((ctx.counters[k] ?? 0) >= self.level) return false;
          ctx.counters[k] = (ctx.counters[k] ?? 0) + 1;
          addSouls(ctx, 1, S(i));
          return true;
        },
      },
    },
    // ------------------------------------------------------------ Kelche (Irrlichter)
    {
      id: 'ass_kelche',
      name: 'Ass der Kelche',
      numeral: 'As',
      glyph: 'cup',
      rarity: 'uncommon',
      cost: 6,
      suit: 'kelche',
      desc: (l) => `Drehstart: 1 <b class="w">Irrlicht</b> je Kelch-Karte (max. ${1 + Math.floor(l / 2)}).`,
      hooks: {
        spinStart: (ctx, self, i) => {
          const c = Math.min(count(ctx.run, 'kelche'), 1 + Math.floor(self.level / 2));
          let any = false;
          for (let k = 0; k < c; k++) any = !!spawnGhost(ctx, S(i)) || any;
          return any;
        },
      },
    },
    {
      id: 'zwei_kelche',
      name: 'Zwei der Kelche',
      numeral: 'II',
      glyph: 'cup',
      rarity: 'common',
      cost: 4,
      suit: 'kelche',
      desc: (l) => `Wenn ein Irrlicht landet: <b class="f">+${n(lv(l, 1.5))} Fluch</b>.`,
      hooks: {
        ghostLand: (ctx, self, i, _p, b) => (addFluch(ctx, lv(self.level, 1.5), S(i), b.id), true),
      },
    },
    {
      id: 'sieben_kelche',
      name: 'Sieben der Kelche',
      numeral: 'VII',
      glyph: 'cup',
      rarity: 'rare',
      cost: 7,
      suit: 'kelche',
      desc: (l) => `Landet ein Irrlicht auf deinem <b>Einsatz</b>: <b class="x">×${n(lv(l, 1.3, 0.1))} Fluch</b>.`,
      hooks: {
        ghostLand: (ctx, self, i, p, b) => {
          if (!betMatches(ctx.bet, p, 0, ctx.wheel)) return false;
          mulFluch(ctx, lv(self.level, 1.3, 0.1), S(i), b.id);
          return true;
        },
      },
    },
    {
      id: 'ritter_kelche',
      name: 'Ritter der Kelche',
      numeral: 'Ritter',
      glyph: 'wisp',
      rarity: 'rare',
      cost: 8,
      suit: 'kelche',
      desc: (l) => `Siegel lösen für Irrlichter <b>${l >= 4 ? 2 : 1}×</b> zusätzlich aus.`,
      hooks: {},
    },
    {
      id: 'koenigin_kelche',
      name: 'Königin der Kelche',
      numeral: 'Königin',
      glyph: 'crown',
      rarity: 'uncommon',
      cost: 5,
      suit: 'kelche',
      desc: (l) => `Passiv: <b class="w">+${2 * l}</b> maximale Irrlichter.`,
      hooks: {},
      mod: (s, a) => {
        s.ghostCap += 2 * a.level;
      },
    },
    {
      id: 'page_kelche',
      name: 'Page der Kelche',
      numeral: 'Page',
      glyph: 'cup',
      rarity: 'common',
      cost: 4,
      suit: 'kelche',
      desc: (l) => `Jede Runde eines <b class="w">Irrlichts</b>: <b class="g">+${n(lv(l, 4))} Glut</b>.`,
      hooks: {
        lap: (ctx, self, i, b) => {
          if (!b.ghost) return false;
          addGlut(ctx, lv(self.level, 4), S(i), b.id);
          return true;
        },
      },
    },
    // ------------------------------------------------------------ Schwerter (Fluch)
    {
      id: 'ass_schwerter',
      name: 'Ass der Schwerter',
      numeral: 'As',
      glyph: 'sword',
      rarity: 'uncommon',
      cost: 6,
      suit: 'schwerter',
      desc: (l) => `<b>Erste</b> Drehung eines Rituals: <b class="x">×${n(lv(l, 3, 1))} Fluch</b>.`,
      hooks: {
        spinEnd: (ctx, self, i) => {
          if (!ctx.firstSpin) return false;
          mulFluch(ctx, lv(self.level, 3, 1), S(i));
          return true;
        },
      },
    },
    {
      id: 'zwei_schwerter',
      name: 'Zwei der Schwerter',
      numeral: 'II',
      glyph: 'sword',
      rarity: 'uncommon',
      cost: 5,
      suit: 'schwerter',
      desc: (l) => `<b>Letzte</b> Drehung eines Rituals: <b class="x">×${n(lv(l, 2.5, 0.75))} Fluch</b>.`,
      hooks: {
        spinEnd: (ctx, self, i) => {
          if (!ctx.lastSpin) return false;
          mulFluch(ctx, lv(self.level, 2.5, 0.75), S(i));
          return true;
        },
      },
    },
    {
      id: 'drei_schwerter',
      name: 'Drei der Schwerter',
      numeral: 'III',
      glyph: 'heart',
      rarity: 'common',
      cost: 4,
      suit: 'schwerter',
      desc: (l) => `Einsatz <b>verfehlt</b>: trotzdem <b class="x">×${n(lv(l, 1.4, 0.2))} Fluch</b>.`,
      hooks: {
        betMiss: (ctx, self, i) => (mulFluch(ctx, lv(self.level, 1.4, 0.2), S(i)), true),
      },
    },
    {
      id: 'zehn_schwerter',
      name: 'Zehn der Schwerter',
      numeral: 'X',
      glyph: 'sword',
      rarity: 'rare',
      cost: 7,
      suit: 'schwerter',
      desc: (l) => `Drehende: <b class="x">×(1 + ${n(lv(l, 0.5, 0.25))} je leerem Arkana-Platz)</b> Fluch (sich selbst mitgezählt).`,
      hooks: {
        spinEnd: (ctx, self, i) => {
          const empty = ctx.stats.arcanaSlots - ctx.run.arcana.length + 1;
          if (empty <= 0) return false;
          mulFluch(ctx, 1 + lv(self.level, 0.5, 0.25) * empty, S(i));
          return true;
        },
      },
    },
    {
      id: 'ritter_schwerter',
      name: 'Ritter der Schwerter',
      numeral: 'Ritter',
      glyph: 'dagger',
      rarity: 'uncommon',
      cost: 5,
      suit: 'schwerter',
      desc: (l) => `Jede Runde der Seelenkugel: <b class="f">+${n(lv(l, 0.6, 0.3))} Fluch</b>, aber <b class="bad">−0,4 Tempo</b>.`,
      hooks: {
        lap: (ctx, self, i, b) => {
          if (b.ghost) return false;
          addFluch(ctx, lv(self.level, 0.6, 0.3), S(i), b.id);
          b.energy -= 0.4;
          return true;
        },
      },
    },
    {
      id: 'koenig_schwerter',
      name: 'König der Schwerter',
      numeral: 'König',
      glyph: 'crown',
      rarity: 'legendary',
      cost: 10,
      suit: 'schwerter',
      desc: (l) => `Drehende: <b class="x">×(1 + ${n(lv(l, 0.3, 0.15))} je Schwerter-Karte)</b> Fluch.`,
      hooks: {
        spinEnd: (ctx, self, i) => (mulFluch(ctx, 1 + lv(self.level, 0.3, 0.15) * count(ctx.run, 'schwerter'), S(i)), true),
      },
    },
    // ------------------------------------------------------------ Münzen (Seelen)
    {
      id: 'ass_muenzen',
      name: 'Ass der Münzen',
      numeral: 'As',
      glyph: 'coin',
      rarity: 'common',
      cost: 4,
      suit: 'muenzen',
      desc: (l) => `Ritualende: <b class="s">+${2 * l} Seelen</b>.`,
      hooks: {
        ritualEnd: (_run, self, _i, log) => log.push({ label: 'Ass der Münzen', souls: 2 * self.level }),
      },
    },
    {
      id: 'zwei_muenzen',
      name: 'Zwei der Münzen',
      numeral: 'II',
      glyph: 'coin',
      rarity: 'common',
      cost: 5,
      suit: 'muenzen',
      desc: (l) => `Drehstart: <b class="f">+${n(lv(l, 1))} Fluch</b> je 5 Seelen.`,
      hooks: {
        spinStart: (ctx, self, i) => {
          const k = Math.floor(ctx.run.souls / 5);
          if (k <= 0) return false;
          addFluch(ctx, k * lv(self.level, 1), S(i));
          return true;
        },
      },
    },
    {
      id: 'koenig_muenzen',
      name: 'König der Münzen',
      numeral: 'König',
      glyph: 'crown',
      rarity: 'rare',
      cost: 8,
      suit: 'muenzen',
      desc: (l) => `Drehende: <b class="x">×(1 + ${n(lv(l, 0.02, 0.01))} je Seele)</b> Fluch.`,
      hooks: {
        spinEnd: (ctx, self, i) => {
          if (ctx.run.souls <= 0) return false;
          mulFluch(ctx, 1 + lv(self.level, 0.02, 0.01) * ctx.run.souls, S(i));
          return true;
        },
      },
    },
    {
      id: 'page_muenzen',
      name: 'Page der Münzen',
      numeral: 'Page',
      glyph: 'coin',
      rarity: 'uncommon',
      cost: 5,
      suit: 'muenzen',
      desc: (l) => `Landung auf einem <b>verzauberten</b> Fach: <b class="s">+${l} Seele${l > 1 ? 'n' : ''}</b> und <b class="x">×1,5 Fluch</b>.`,
      hooks: {
        land: (ctx, self, i, p) => {
          if (!ctx.run.enchants[p]) return false;
          addSouls(ctx, self.level, S(i));
          mulFluch(ctx, 1.5, S(i));
          return true;
        },
      },
    },
    {
      id: 'zehn_muenzen',
      name: 'Zehn der Münzen',
      numeral: 'X',
      glyph: 'coin',
      rarity: 'uncommon',
      cost: 4,
      suit: 'muenzen',
      desc: (l, inst) => `Ritualende: Verkaufswert <b class="s">+${2 * l}</b>. (Aktuell +${inst?.state.value ?? 0})`,
      hooks: {
        ritualEnd: (_run, self) => {
          self.state.value = (self.state.value ?? 0) + 2 * self.level;
        },
      },
      sellBonus: (a) => a.state.value ?? 0,
    },
    {
      id: 'ritter_muenzen',
      name: 'Ritter der Münzen',
      numeral: 'Ritter',
      glyph: 'key',
      rarity: 'common',
      cost: 4,
      suit: 'muenzen',
      desc: (l) => `Passiv: <b class="s">+${3 * l}</b> maximale Zinsen.`,
      hooks: {},
      mod: (s, a) => {
        s.interestCap += 3 * a.level;
      },
    },
    // ------------------------------------------------------------ ohne Farbe
    {
      id: 'spieler',
      name: 'Der Spieler',
      numeral: '★',
      glyph: 'mask',
      rarity: 'rare',
      cost: 7,
      desc: (l) => `Einsatz auf eine <b>Zahl</b> getroffen: zusätzlich <b class="x">×${n(lv(l, 3, 1))} Fluch</b>.`,
      hooks: {
        betHit: (ctx, self, i) => {
          if (ctx.bet.kind !== 'number') return false;
          mulFluch(ctx, lv(self.level, 3, 1), S(i));
          return true;
        },
      },
    },
  ];
}
